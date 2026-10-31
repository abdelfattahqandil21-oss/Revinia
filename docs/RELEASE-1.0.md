# Release order for 1.0 (S1)

Status: **prepared** — nothing here has been published. Publishing, tags and
dist-tags are human steps: the hand-run checks are collected in
`docs/HUMAN-CHECKS-1.0.md` and the copy-paste publish runbook, both written in
S8 and **not part of this branch**.

## Order

| Step | Package | Version | Dist-tag | Why here |
| --- | --- | --- | --- | --- |
| 1 | `@rivinia/theme` | `0.2.0` | `latest` | SPEC-0.1.1 is merged on `main` and unpublished; ship it before any 1.0 work |
| 2 | `@rivinia/theme` | `1.0.0-rc.1` | `next` | S5a dark mode + contrast; the token contract freezes here |
| 3 | `@rivinia/select` | `1.0.0-rc.1` | `next` | S2 ARIA + S3/S4 popup work |
| 4 | `@rivinia/menu` | `1.0.0-rc.1` | `next` | S3 conformance parity with select |
| 5 | `@rivinia/i18n` | `1.0.0-rc.1` | `next` | peers on select; must point at a select that exists |
| 6 | — | soak | — | criteria in S8's `docs/HUMAN-CHECKS-1.0.md` (not in this branch) |
| 7 | all four | `1.0.0` | `latest` | same order as 2–5 |

## Why i18n is last

`@rivinia/i18n` declares one internal edge in the whole monorepo:

```
i18n ──optional peer──▶ select        (only the "/select" entry point imports it)
```

A pre-1.0 caret is narrow. `^0.7.0` means `>=0.7.0 <0.8.0`, so the moment
select ships 0.8.0 or 1.0.0 a consumer installing `@rivinia/i18n/select` hits
`ERESOLVE` until i18n is republished with a wider range. Publishing select
first means the range can be widened against a version that already exists.

The peer stays **optional**: `peerDependenciesMeta["@rivinia/select"].optional
= true`, so an app that never imports `/select` neither installs select nor
pays for its code. That contract is enforced by
`projects/i18n/tests/language-select-surface.spec.ts`.

## Peer ranges at each step

| Step | i18n `@rivinia/select` peer | Reason |
| --- | --- | --- |
| 0.8.x (today) | `^0.7.0` | current published state |
| i18n `1.0.0-rc.1` | `^1.0.0-rc.1` | `^1.0.0` does **not** match a prerelease; the rc must accept select's rc |
| i18n `1.0.0` | `^1.0.0` | normal caret once both packages are final; it does not need to match a prerelease |

The hard-coded `^0.7.0` assertion in `language-select-surface.spec.ts` must be
updated in the same commit that changes the manifest (S8).

## `@angular/*` peer policy

Libraries declare `^22.0.0` for `@angular/core`, `@angular/common` and
`@angular/forms` — the workspace convention in `AGENTS.md`. The rationale:
Angular libraries are built and type-checked against one major, and a wider
range (`>=22 <24`) promises compatibility nobody tested; a narrower range
(`22.2.3`) turns every Angular patch into an `ERESOLVE`.

`engines.node` mirrors `@angular/core@22` exactly
(`^22.22.3 || ^24.15.0 || >=26.0.0`). This is documented as "same as Angular 22"
in every README rather than loosened, because a looser value would promise a
Node version Angular itself refuses to run on.

## Gates that protect the order

| Gate | Command | What it protects |
| --- | --- | --- |
| Pack metadata | `pnpm check:pack` | `repository`/`homepage`/`bugs`/`engines`, README + CHANGELOG in the tarball, every export target shipped |
| Theme contract | `pnpm check:theme` | `exports["."].style` and the nine-file list |
| Docs accuracy | `pnpm check:docs` | no README mentions an unexported symbol; root table matches manifests |
| README budget | `pnpm check:readmes` | 200-line budget (temporary allowances) and version claims |
| Select isolation | `pnpm test:i18n` (`language-select-surface.spec.ts`) | only `i18n/select/src/language-select.ts` imports `@rivinia/select/ui` |

## Out of scope

`env`, `http`, `modal` and `toast` carry local patch bumps that are **not**
part of 1.0 and are not published by this programme (owner decision,
2026-10-31). `datepicker` and `table` stay 0.x.

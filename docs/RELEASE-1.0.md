# Release order for 1.0 (S1)

Status: **steps 2 and 3 ran, for two packages.** The owner published
`@rivinia/theme@1.0.0-rc.1` and `@rivinia/select@1.0.0-rc.1` to the `next`
dist-tag on 2026-11-03; `latest` still answers `0.1.0` and `0.7.1`, and steps
4–7 have not run. Publishing, tags and dist-tags are
human steps. The two documents S8 was going to write both exist now, on
`release/1.0-integration`: `docs/HUMAN-CHECKS-1.0.md` (the hand-run checks) and
[`docs/PUBLISH-RUNBOOK-1.0.md`](PUBLISH-RUNBOOK-1.0.md), which is the file that
keeps the running record of what has been executed and what has not.

## Order

| Step | Package | Version | Dist-tag | Why here |
| --- | --- | --- | --- | --- |
| 1 | `@rivinia/theme` | `0.2.0` | `latest` | **Skipped on 2026-11-03.** The plan said ship SPEC-0.1.1 before any 1.0 work; Option A in the runbook was taken instead and the `@theme inline` adapter ships inside `1.0.0-rc.1` |
| 2 | `@rivinia/theme` | `1.0.0-rc.1` | `next` | **Done 2026-11-03.** S5a dark mode + contrast; the token contract froze at `3cb8b51`, tagged `theme/v1.0.0-rc.1` |
| 3 | `@rivinia/select` | `1.0.0-rc.1` | `next` | **Done 2026-11-03.** S2 ARIA + S3/S4 popup work; tagged `select/v1.0.0-rc.1` at `1e78c6c` |
| 4 | `@rivinia/menu` | `1.0.0-rc.1` | `next` | S3 conformance parity with select |
| 5 | `@rivinia/i18n` | `1.0.0-rc.1` | `next` | peers on select; must point at a select that exists |
| 6 | — | soak | — | criteria written by S8, in the human-checks document (not in this branch) |
| 7 | all four | `1.0.0` | `latest` | same order as 2–5 |

The cost of skipping step 1, stated where a reader will meet it: a consumer on
`latest` gets `0.1.0`, which has **no dark values at all**, and the only way to
the `@theme inline` adapter fix is the `next` tag. If that ever becomes a problem
for somebody, the remedy is a `0.2.0` release cut after the rc plus
`npm dist-tag add @rivinia/theme@0.2.0 latest` — which would move `latest` to a
version without dark mode, so it is not a small trade. D91 records the choice.

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
| Docs accuracy | `pnpm check:docs` | fails when the root package table disagrees with the manifests; warns on prose that names an unexported symbol |
| README budget | `pnpm check:readmes` | 200-line budget (temporary allowances) and version claims |
| Select isolation | `pnpm ng test i18n --watch=false` (`language-select-surface.spec.ts`) | only `projects/i18n/select/src/lib/components/language-select/language-select.ts` imports `@rivinia/select/ui` |

## Out of scope

Packages outside theme, select, menu and i18n are out of scope: their local
version bumps are **not** part of 1.0 and this programme does not publish them
(owner decision, 2026-10-31). They stay on their current 0.x lines.

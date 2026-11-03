# Release order for 1.0 (S1)

Status: **all five release rows below have run, and the runbook's step 1 (this branch onto
`main`) has run and is pushed.** The owner published
`@rivinia/theme@1.0.0-rc.1`, `@rivinia/select@1.0.0-rc.1`,
`@rivinia/menu@1.0.0-rc.1` and
`@rivinia/i18n@1.0.0-rc.1` to the `next`
dist-tag on 2026-11-03, and the same afternoon moved `latest` onto `1.0.0-rc.1` for all
four and deprecated the whole 0.x line — **D93**, whose row is below and whose record is
the section after the table. Rows
6–7 have not run. The merge landed at `173f150` and is **pushed as `6b51eba..9173de3`,
a fast-forward, no force**; the D92 record commit `d5d7f91` went on top of it the same
day, and both `menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` were cut at it. Publishing, tags and dist-tags are
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
| 4 | `@rivinia/menu` | `1.0.0-rc.1` | `next` | S3 conformance parity with select. **Done 2026-11-03, verified against the registry the same day.** Tagged `menu/v1.0.0-rc.1` at `d5d7f91` (lightweight, like the other two rcs), built from the tag, published from the inspected tarball; the registry tarball is `cmp`-identical to it, and `latest` answered `0.5.0` at that read |
| 5 | `@rivinia/i18n` | `1.0.0-rc.1` | `next` | peers on select; must point at a select that exists. **Done 2026-11-03, verified against the registry the same day.** Tagged `i18n/v1.0.0-rc.1` at `d5d7f91` (lightweight, like the other three rcs), built from the tag, published from the inspected tarball; the registry tarball is `cmp`-identical to it and to the pre-flight (93,239 B, 20 files), `dist.integrity` equals base64 of the local `sha512sum`, and `latest` answered `0.8.0` at that read. Both consumers ran against the published artifact — with `@rivinia/select@next` and without it — exit 0 with empty stderr, so the optional peer is optional in what shipped |
| 6 | — | soak | — | criteria written by S8, in the human-checks document (not in this branch) |
| 7 | all four | `1.0.0` | `latest` | same order as 2–5 |
| 5b | all four | — | `latest` | **Ran 2026-11-03, after row 5 and outside this plan.** D93: `npm dist-tag add @rivinia/<pkg>@1.0.0-rc.1 latest` for each package, then the 0.x line deprecated with `<1.0.0-0`. `latest` and `next` now both answer `1.0.0-rc.1` |

D93 is what row 5b did, and why: the owner's point was that npmjs shows one version
per package — `latest` — and an rc is invisible unless you open the Versions tab, while
`npm i @rivinia/<pkg>` installs `latest`. He also closed 0.x on the record: no 0.x
version gets another fix. It cost no bytes (no version changed, no tarball moved) and
one honest mistake: the range `npm deprecate` takes **includes prereleases**, so the
first pass `@<1.0.0` deprecated `1.0.0-rc.1` itself; `@1.0.0-rc.1 ""` undid it and
`<1.0.0-0` then matched only what it should. The read-back — `latest: 1.0.0-rc.1`,
`next: 1.0.0-rc.1`, and 38 versions printing `DEPRECATED` with `1.0.0-rc.1` printing
`clean` — is his terminal's, not a second agent's; the network stopped reaching npmjs
the same afternoon.

What it changes for the rows above: rows 2–5 said "to the `next` tag", which was true
of the publish itself and no longer describes what a bare install gets. Read those
rows for the tarball evidence, and this section for the tag state.

The cost of skipping step 1, stated where a reader will meet it — and D93 changed
it. When this was written a consumer on `latest` got `0.1.0`, which has **no dark
values at all**, and the only way to the `@theme inline` adapter fix was the `next`
tag. `latest` is now `1.0.0-rc.1`, which has both, so the defect D91 traded away is
closed for fresh installs; what it did not close is 0.x support, which is exactly
what the deprecation says. The remedy the paragraph offered — a `0.2.0` after the rc
plus `npm dist-tag add @rivinia/theme@0.2.0 latest` — would now move `latest`
*backwards*, onto a version without dark mode, and is off the table.

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

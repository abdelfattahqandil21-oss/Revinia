# @rivinia/theme — styling-stack fixes

Status: **implemented** (Phase 1, 2026-10-29) — THM-01…THM-07 done, gates
1–6 run; merge, release and version bump pending the owner.
Baseline: `@rivinia/theme` 0.1.0 (published and in the workspace). Evidence:
`docs/RESEARCH-theme-stacks.md` — "the five styling stacks, measured"
(`@angular/core` 22.2.3, `@angular/build`/`@angular/cli` 22.2.5 in the consumer
fixture; Sass 1.97.0, Less 4.4.2, Tailwind 4.1.16, Bootstrap 5.3.8; Chromium and
Firefox).

## 1. Process

- **Own branch:** `pkg/theme/stack-fixes`, cut from `main`. Do **not** mix this
  with `pkg/i18n/ui`: AGENTS.md allows one package per commit and per branch.
- Conventional Commits, scope `theme`. Merge with `--no-ff`.
- **Version:** answered in question 1 — **0.2.0**. THM-01 changes behaviour for
  consumers who override Tailwind's `--color-rv-*` variables directly; pre-1.0,
  a minor means breaking.
- No version bump, tag or publish without explicit owner confirmation (gate 7).

## 2. Scope

| ID     | Change                                                                               | Type | Priority |
| ------ | ------------------------------------------------------------------------------------ | ---- | -------- |
| THM-01 | Tailwind adapter: `@theme inline` for the `--color-rv-*` block                       | fix  | High     |
| THM-02 | Packaging check that fails if `exports["."].style` disappears                        | test | High     |
| THM-03 | README: correct the Less instructions                                                | docs | High     |
| THM-04 | README: Sass CLI needs `pkg:` + `--pkg-importer=node`                                | docs | Medium   |
| THM-05 | README: where overrides may live; bundler required; adapter replaces the base import | docs | High     |
| THM-06 | `_index.scss`: fix the wrong comment                                                 | docs | Low      |
| THM-07 | README: `sideEffects` line matches `package.json`                                    | docs | Low      |

Not in this release: dropping the unused `tslib` dependency and the empty FESM
(ng-packagr behavior, D20; needs its own build experiment and D-entry), WebKit,
webpack and Vite fixtures.

## 3. Specifications

### THM-01 — Tailwind `@theme inline`

**Problem (measured).** With plain `@theme`, `--color-rv-bg: var(--rv-bg)` is
resolved where it is declared (`:root`), so a subtree override of `--rv-bg`
never reaches `bg-rv-bg`. With `@theme inline` the utility reads `var(--rv-bg)`
on the element itself, and the override applies. Root-level overrides work in
both. Location: `projects/theme/styles/tailwind.css` (the `--color-rv-*` block,
around line 28; the reverse block around line 48 is already `inline`).

**Requirements.**

- Switch the `--color-rv-*` block to `@theme inline`.
- Utilities (`bg-rv-bg`, `text-rv-accent`, ...) keep being generated.
- The theme defaults stay in `@layer rivinia-theme` and are unchanged.

**Phase 0 must measure before editing** (these are open facts, not assumptions):

1. With `inline`, is `--color-rv-bg` still emitted as a variable? If a consumer
   overrides `--color-rv-bg` directly, does it still reach the utility? If not,
   that is a behavior change: document it and use it for question 1.
2. Does anything in this repo read `--color-rv-*` (grep all `projects/` and the
   e2e apps)? List every hit.

**Acceptance.** Consumer fixture (Angular app + Tailwind v4, theme from the
packed tarball), Chromium and Firefox:

- subtree `--rv-bg` override paints the utility (was lost before);
- root-level `--rv-bg` override still works;
- default colors unchanged with no override;
- the `bg-rv-*` and `text-rv-*` utilities appear in the built CSS.

### THM-02 — Packaging check for the `style` export

**Problem (measured).** Removing `exports["."].style` still builds, produces a
188-byte stylesheet and prints no warning; the theme silently disappears.

**Requirements.**

- Add `scripts/check-theme-package.mjs` and a `check:theme` script in the root
  `package.json`. Node only, no new dependencies.
- It inspects `dist/theme` or a given tarball and fails (exit 1, readable
  message) when any of these is false:
  1. `exports["."].style` exists and points at a file that exists in the package;
  2. every other `exports` target exists in the package;
  3. the packed file list equals the expected set (9 files: README,
     package.json, CHANGELOG, the three CSS files plus `_index.scss`, the FESM,
     the d.ts);
  4. `styles/theme.css` contains `--rv-bg` inside `@layer rivinia-theme`.
- Tests in `projects/theme/tests/` (D50): a good package passes; a copy with the
  `style` condition removed fails; a copy with a missing target fails.
- Run it from the release checklist (AGENTS gate 3, which names the exact
  command) and mention it in the README contributor section. Do not fold it into
  `check:docs` (different purpose).

### THM-03 — README: Less

Measured: `@import (less) '@rivinia/theme';` compiles to nothing, and
`@import (less) '@rivinia/theme/scss';` inlines the literal text
`@use './theme.css';`. Only the explicit file works.

**Requirements.**

- Replace the Less row and snippet with the single working line:
  `@import (less) '@rivinia/theme/theme.css';`.
- State that the package root is a silent no-op in Less and `/scss` is invalid
  there, and that Less **variables** (`@x`) do not interoperate with CSS custom
  properties.

### THM-04 — README: Sass CLI

Measured: the Angular CLI (the only bundler measured; Vite untested) accepts
`@use '@rivinia/theme/scss';`; the plain `sass` CLI fails on it.

**Requirements.** Add a short note: with the `sass` CLI use
`@use 'pkg:@rivinia/theme/scss';` and `--pkg-importer=node` (Dart Sass 1.71+).

### THM-05 — README: overrides, bundler, adapters

Measured findings to document:

- The bare `@import '@rivinia/theme';` is resolved by a **bundler** (the `style`
  condition). A browser with no bundler cannot resolve it.
- Overrides must be **unlayered**. Inside `@layer base` they lose (the
  `rivinia-theme` layer is declared later); inside Tailwind `@theme` they are
  ignored; inside a component stylesheet the theme never applies (Angular scopes
  `:root` away). Overrides go in a global stylesheet, on `:root` or on a subtree.
- Import the Tailwind or Bootstrap adapter **instead of** the base entry, not in
  addition: the adapter already imports the base, and both together emit the
  theme twice (1,019 B vs 613 B).
- The theme is a global-stylesheet import; components only read `var(--rv-*)`.
- Bootstrap import order does not matter (measured identical); keep the
  documented order for readability and say so.

**Acceptance.** Each statement carries the measured fact, not a guess; anything
not re-measured by the agent is marked "from the research".

### THM-06 — `_index.scss` comment

The comment claims the `.css` extension must be omitted for `@use` to load it as
a module. Measured: both spellings produce identical output. Rewrite it: the
extension is optional; this file exists to give consumers a stable short
specifier. Add: "do not import the package root in Less".

### THM-07 — `sideEffects`

README says `["**/*.css"]`; `package.json` says `["**/*.css", "**/*.scss"]`.
Make the README match the manifest.

## 4. Documentation and records

- `projects/theme/CHANGELOG.md` entry and the README version line.
- Root README package table and `pnpm check:docs` must pass.
- `docs/DECISIONS.md` **D67**: the theme is a bundled-CSS contract; the `style`
  export condition is load-bearing and covered by `check:theme`; the Tailwind
  palette uses `@theme inline`; overrides are unlayered and global. Record the
  tool versions and the "not verified" list.

## 5. Gates

1. `pnpm build:theme` succeeds.
2. Theme tests and `check:theme` pass; the negative cases fail as designed.
3. `npm pack` inspected; file list matches THM-02.
4. Clean-consumer fixtures re-run for **all five stacks** (plain CSS, Sass, Less,
   Tailwind v4, Bootstrap 5.3) on the final tarball, with the measurements from
   the research repeated (build size, computed colors in Chromium and Firefox).
   Fixtures stay outside the repo; the report quotes the numbers.
5. Public imports tested exactly as a consumer writes them.
6. Sizes recorded (`theme.css`, adapters, built consumer CSS).
7. No version bump, tag or publish without explicit owner confirmation.

## 6. Open questions for the owner

1. Release as `0.1.1` or `0.2.0`? Decide after the THM-01 Phase 0 measurement.
   **Answered 2026-10-29: 0.2.0** (behaviour change for `--color-rv-*`
   overrides); `CHANGELOG.md` ships in the package with the migration note.
2. Should the five-stack fixtures live in the repo (for CI later) or stay
   outside? Default: outside.
3. Add the packaging check to a future CI workflow? Default: yes, when CI exists.

## 7. Not verified (carried over)

WebKit and Safari; webpack, Vite and Parcel; Angular versions before 22; the
browser-only (no bundler) `@import` ordering; Bootstrap with a customized Sass
palette; npm provenance.

## 8. Process

- **Phase 0, read-only, then stop for approval:** confirm every line reference
  above against the current files; run the two THM-01 measurements; list any
  `--color-rv-*` reader in the repo; check how `check:docs` treats the theme;
  report the recommended version.
- **Phase 1:** tests first for THM-02, then THM-01, then the docs items.
- Skills: `rivinia-playbook` for routing; `tdd` for the package check;
  `research` for Tailwind, Sass and Less facts, verified against installed
  packages; `code-review` before the merge; `rivinia-release`, by exact ID, only
  at release time.
- Report: a table with executed evidence per item, an explicit "not run" list,
  and the version decision left to the owner.

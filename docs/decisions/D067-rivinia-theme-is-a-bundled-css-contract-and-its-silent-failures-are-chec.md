## 2026-10-29 — D67: `@rivinia/theme` is a bundled-CSS contract, and its silent failures are checked

- **Context.** SPEC-0.1.1 (`projects/theme/SPEC-0.1.1.md`) and the executed
  research in `docs/RESEARCH-theme-stacks.md`. Five stacks were measured against
  the 0.1.0 tarball — `@angular/core` 22.2.3 with `@angular/build` and
  `@angular/cli` 22.2.5 in the consumer fixture, Sass 1.97.0, Less 4.4.2,
  Tailwind 4.1.16, Bootstrap 5.3.8, Chromium and Firefox. (The research runs
  before §8 did not record which binary built them; the fixture versions above
  were read from its `node_modules` afterwards.) All five work, and three of
  them fail **silently**:
  - without `exports["."].style`, the build stays green and Angular emits a
    188-byte stylesheet: no tokens, no warning;
  - `@import (less) '@rivinia/theme';` compiles to 34 B — Less ignores
    `exports` and inlines the empty ESM entry;
  - with plain `@theme`, a subtree `--rv-bg` override never reaches
    `bg-rv-bg` (measured: the utility stays `rgb(255,255,255)`).
- **The theme is a bundled-CSS contract.** The bare specifier resolves only
  through a bundler's `style` export condition (Angular's stylesheet resolver
  passes `style`/`sass`/`less`). That makes the condition load-bearing, so it is
  checked by a script instead of trusted: `scripts/check-theme-package.mjs`
  (`pnpm check:theme` checks `dist/theme`; `pnpm check:theme <tarball>` checks
  the tarball — the target is the script's own default, never baked into the
  npm script, because pnpm appends arguments to the script's command line and a
  hardcoded default silently swallowed them) asserts the `style` target, every
  other export target, the exact file list and the `@layer rivinia-theme` block
  in `styles/theme.css`. The one file this adds outside the planned set is
  `scripts/check-theme-package.d.mts`, the hand-written types for the ESM
  script's exports. `pnpm test:theme` runs its 11 tests (D50: specs in
  `projects/theme/tests/`) against synthetic packages in temp dirs — no build
  needed, no new `angular.json` target; plain `vitest run projects/theme/tests`
  from the root works, the same way `test:schematics` does. One test spawns
  `pnpm check:theme <tarball>` and asserts the tarball is what gets checked, so
  the argument-passing path is covered too. The release checklist carries the
  gate explicitly — AGENTS gate 3 now ends with one added line: "For
  @rivinia/theme, also run `node scripts/check-theme-package.mjs <tarball>`; it
  must exit 0." That is the only AGENTS.md edit in this change.
- **The Tailwind palette block is `@theme inline`.** Both adapter blocks now
  reference other variables, and `inline` is what makes the reference resolve at
  use-site. Measured before/after on the same fixture: subtree `--rv-bg` →
  `rgb(1,2,3)` instead of `255,255,255`; root overrides and the default colours
  unchanged; `bg-rv-bg` and `text-rv-accent` still generated; `--color-rv-bg`
  still emitted at `:root` as `var(--rv-bg)`. The cost, measured and documented:
  an element-level `--color-rv-bg` no longer repaints the utility, and a later
  consumer `@theme { --color-rv-bg: … }` replaces the alias, so that token stops
  following `--rv-bg` and subtree overrides stop reaching it.
- **Overrides are global and unlayered.** Not `@layer base` (the `rivinia-theme`
  layer is declared later and wins between layers), not Tailwind `@theme`
  (`--rv-bg` is not a theme key), never inside a component stylesheet (Angular
  rewrites `:root` to `[_ngcontent-…]:root`). The README states this with the
  measured consequence of each wrong placement.
- **Docs prescribe the spelling that works, per stack:** Less imports
  `@rivinia/theme/theme.css` and nothing else; the `sass` CLI uses
  `pkg:@rivinia/theme/scss` with `--pkg-importer=node` (Dart Sass 1.71+);
  bundlers keep the bare specifier; an adapter replaces the base import (both
  together emit the theme twice, 1,019 B vs 613 B). `_index.scss`'s comment was
  wrong about the extension and is rewritten. `sideEffects` in the README now
  matches the manifest (`["**/*.css", "**/*.scss"]`).
- **Version.** The `@theme inline` switch is a behaviour change, so the release
  is a minor: **0.2.0**, decided by the owner on 2026-10-29. `CHANGELOG.md` ships
  in the package and carries the migration note: change `--rv-*`, not
  `--color-rv-*`. No manifest version is bumped, tagged or published here —
  gate 7 still needs explicit confirmation.
- **Executed evidence (2026-10-29).** `pnpm build:theme` (workspace
  `@angular/build` 22.2.4, `@angular/compiler-cli` 22.2.3, ng-packagr 22.2.5)
  produces the 9-file `dist/theme`; `pnpm check:theme` passes on it and on the
  tarball. Two tarballs exist in this change: the one the §9 matrix ran on
  (`/tmp/pack-theme-020/rivinia-theme-0.1.0.tgz`, 6,687 B), and the final one
  after the review fixes (`/tmp/pack-theme-final/rivinia-theme-0.1.0.tgz`,
  6,763 B, 9 files, shasum `66e778e5f8c89dccd2eb92f3361e83da54730ab9`), which
  `pnpm check:theme <path>` also passes. The 6,687 B tarball, installed into a
  consumer fixture (`@angular/core` 22.2.3, `@angular/build`
  and `@angular/cli` 22.2.5) and built as five entries, measured in
  Chromium and Firefox: plain CSS 613 B, Sass 566 B, Less 547 B, Tailwind
  5,261 B, Bootstrap 280,705 B of built `styles.css`; every stack paints
  `--rv-bg` and follows a `:root { --rv-bg: rgb(10,20,30) }` override to
  `rgb(10, 20, 30)`. The silent failures reproduce on the new tarball too: the
  Less package root compiles to 104 B with no token, and the `sass` CLI exits 65
  on the bare specifier while `pkg:` with `--pkg-importer=node` emits 1,870 B
  (Sass 1.97.0). Details in `docs/RESEARCH-theme-stacks.md` §8–§9.
- **Not verified.** WebKit/Safari; webpack, Vite and Parcel; Angular versions
  before 22; Bootstrap with a customized Sass palette; npm provenance.
- **Not done — on purpose.** No merge, no tag, no version bump, no publish
  (gate 7); `package.json` still says 0.1.0 and the CHANGELOG says 0.2.0 for
  whoever cuts the release. The five-stack matrix above was measured on the
  pre-fix control flow **before** the final fixes in this change (checker
  default, `tailwind.css` comment, docs). At release time it must be re-run on
  the **final** tarball — all five stacks, including Bootstrap light **and**
  dark, and Tailwind's subtree override, `:root` override and consumer
  `@theme { --color-rv-bg }` cases. Two review items were skipped and are
  **not** done: refactoring `load()` in the checker to return a typed result
  instead of `Map | string`, and a theme `tsconfig.spec.json` (the tests run
  through the root `vitest` config, the same as `test:schematics`).
  `docs/DECISIONS.md` and `docs/RESEARCH-theme-stacks.md` are not
  Prettier-formatted: they already fail `prettier --check` at `main`, and the
  rewrite would reflow prose and list continuations. The files added or changed
  under `projects/theme/` and `scripts/` do pass.

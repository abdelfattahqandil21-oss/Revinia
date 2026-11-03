# @rivinia/theme

From 1.0.0 this package follows **strict semver**: only a major may break, a new
token or entry file is a minor, and a patch never changes what a page renders.
The contract here is CSS, not TypeScript — **the twelve `--rv-*` names and the
four entry files** (`theme.css`, `tailwind.css`, `bootstrap.css` and the Sass
entry) are public API. A new token is always additive: every component reads
`var(--rv-<own>, var(--rv-<semantic>, <previous value>))`, so a name that did not
exist yesterday cannot change what renders today.

Coming from `0.1.0` — **there is something to read.** None of the twelve `--rv-*`
names moved, but `0.1.0` is still the newest tarball on npm, so everything merged
since lands inside this major: a page with no switch now follows the OS dark
setting (`0.1.0` had no dark values at all), the switch attribute is
`data-rv-theme`, and the Tailwind adapter is `@theme inline`, so an element-level
`--color-rv-*` override no longer repaints a `bg-rv-*` utility. Older releases
followed the pre-1.0 policy, where a minor bump could break.

## 1.0.0-rc.1

### Dark mode and the contrast gate (1.0.0-rc.1)

- **Dark values.** Every colour token ships a second value under
  `@media (prefers-color-scheme: dark)`, guarded so `:root[data-rv-theme="light"]`
  opts out, and under `:root[data-rv-theme="dark"]` so an explicit switch beats
  a light OS setting. The two blocks are hand-copied and the new gate fails if
  they ever drift. Proven in Chromium and Firefox on eleven documents
  (`pnpm check:theme-dark`).
- **Migration.** The switch attribute is `data-rv-theme`, not the `data-theme`
  an earlier README example used. Rename it. A page whose own stylesheet still
  maps `[data-theme='dark']` keeps painting those three declarations while the
  attribute is present, but that rule cannot restore light under a dark OS and
  sets no `color-scheme` — rename it and add the scheme. A page with no switch
  now follows the OS, and `<html data-rv-theme="light">` opts out. The attribute
  is read on `<html>`: a subtree switches by setting the `--rv-*` properties on
  itself.
- **`color-scheme`.** The light block declares `light`, both dark blocks and the
  Bootstrap adapter declare their scheme, so form controls, scrollbars and the
  canvas inherit the palette. Without it a dark surface kept a white scrollbar.
- **Bootstrap adapter.** Both mappings now carry `--rv-shadow`, and the dark
  block maps the accent and the four status tokens, so a dark page that imports
  this adapter alone gets the dark palette instead of the light one (with real
  Bootstrap present the variable wins either way). The dark fallbacks for
  `--rv-muted` and `--rv-border` follow the theme palette (`#a1a1aa`,
  `#3f3f46`) instead of `#a8a8a8`/`#333333`. `data-rv-theme` does not apply
  under this adapter — the unlayered `--bs-*` mapping outranks it, so
  Bootstrap's own `data-bs-theme` is the switch.
- **Contrast gate.** `pnpm check:contrast` reads `styles/theme.css`, checks that
  the three blocks carry the documented palette, and measures every documented
  pair against WCAG AA in both schemes: `--rv-fg`, `--rv-muted` and
  `--rv-accent` at 4.5:1; the four status tokens at 3:1 as indicators.
  Measured now: 18.88 / 7.46 / 5.37 (light) and 16.16 / 7.06 / 6.07 (dark) for
  text, 3.19–10.84 for indicators.
- **The contract is read.** Select, menu and the i18n toggle now paint their
  focus rings, the active row, the selected tick and the toggle's held-down fill
  with `--rv-accent`, and each ships `@media (forced-colors: active)` defaults
  on system colours. `pnpm check:component-theme` proves it in Chromium and
  Firefox, including that a page with no theme imported is unchanged.
- **README.** The token table gained a dark column, and new sections say
  what the switch is, which component surfaces read the accent, what the
  contrast gate guarantees, and what it does not: `--rv-border` is decorative
  (1.32:1 on white) and the status tokens are not text colours.

### Styling-stack fixes (0.2.0)

The styling-stack fixes (SPEC-0.1.1): the Tailwind palette keeps subtree
overrides again, and the packaged contract is checked instead of assumed.

- **Tailwind adapter (breaking for element-level colour overrides):** the
  `--color-rv-*` block is now `@theme inline`. A subtree override of `--rv-bg`
  reaches `bg-rv-bg` again — measured in Chromium and Firefox; with plain
  `@theme` the utility kept the root value. The price is that an element-level
  `--color-rv-bg` no longer reaches the utility. See the migration note.
- **Packaging check:** `pnpm check:theme` fails when `exports["."].style` is
  missing or dangling, when any other export target is absent, when the shipped
  file list differs from the expected nine, or when `--rv-bg` is no longer
  declared inside `@layer rivinia-theme`. A missing `style` condition used to
  build cleanly into a 188-byte stylesheet, with no warning anywhere.
- **Less:** the README documents the only working spelling,
  `@import (less) '@rivinia/theme/theme.css';`. The package root is a silent
  no-op in Less 4, because Less ignores `exports`.
- **Sass CLI:** the README documents `@use 'pkg:@rivinia/theme/scss';` with
  `--pkg-importer=node` (Dart Sass 1.71+); bundlers keep the bare specifier.
- **Docs:** where an override may live (global and unlayered), that the bare
  import needs a bundler, and that an adapter replaces the base import.
- `CHANGELOG.md` now ships in the package.

### Migration — change `--rv-*`, not `--color-rv-*`

To change a colour, edit the semantic token:

```css
:root {
  /* not --color-rv-bg, and not @theme { --color-rv-bg } */
  --rv-bg: #101828;
}
```

With `@theme inline`, the utility reads `var(--rv-bg)` on the element itself, so
an element-level `--color-rv-bg` no longer repaints `bg-rv-bg`. A later
`@theme { --color-rv-bg: … }` still wins, but it replaces the alias, and that
token then stops following `--rv-bg` for the rest of the stylesheet — including
subtree overrides.

Because a released version is never modified, this behaviour change was planned as
a minor: **0.2.0**. That bump was never published — `0.1.0` remains the only
release on npm — so the change ships inside `1.0.0-rc.1`, where a major already
tells a consumer to read the breaking notes.

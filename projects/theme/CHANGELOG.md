# @rivinia/theme

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.

## Unreleased

### Dark mode and the contrast gate (1.0.0-rc.1)

- **Dark values.** Every colour token ships a second value under
  `@media (prefers-color-scheme: dark)`, guarded so `:root[data-rv-theme="light"]`
  opts out, and under `:root[data-rv-theme="dark"]` so an explicit switch beats
  a light OS setting. The two blocks are identical by construction and the new
  gate fails if they ever drift. Proven in Chromium and Firefox on seven
  documents (`pnpm check:theme-dark`).
- **`color-scheme`.** The light block declares `light`, both dark blocks and the
  Bootstrap adapter declare their scheme, so form controls, scrollbars and the
  canvas follow the palette. Without it a dark surface kept a white scrollbar.
- **Contrast gate.** `pnpm check:contrast` reads `styles/theme.css`, checks that
  the three blocks carry the documented palette, and measures every documented
  pair against WCAG AA in both schemes: `--rv-fg`, `--rv-muted` and
  `--rv-accent` at 4.5:1; the four status tokens at 3:1 as indicators.
  Measured now: 18.88 / 7.46 / 5.37 (light) and 16.16 / 7.06 / 6.07 (dark) for
  text, 3.19–10.84 for indicators.
- **README.** The token table gained a dark column, and two new sections say
  what the switch is, what the contrast gate guarantees, and what it does not:
  `--rv-border` is decorative (1.32:1 on white) and the status tokens are not
  text colours.

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

Because a released version is never modified, this behaviour change ships as a
minor: **0.2.0**.

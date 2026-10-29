# @rivinia/theme

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.

## Unreleased

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

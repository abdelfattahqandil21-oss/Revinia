# @rivinia/theme — for contributors

Back to [the README](../../projects/theme/README.md)

- `pnpm build:theme` — production build into `dist/theme`.
- `pnpm test:theme` — the packaging-check tests, run against synthetic packages
  in temp dirs (no build needed).
- `pnpm check:theme` — asserts the packaged contract of `dist/theme` after a
  build: `exports["."].style` exists and resolves, every other export target
  exists, the file list is exactly the expected nine, and `styles/theme.css`
  declares `--rv-bg` inside `@layer rivinia-theme`. Pass a path to check
  something else — before a release, the tarball:
  `pnpm check:theme rivinia-theme-x.y.z.tgz`.
- `pnpm check:contrast` — reads `styles/theme.css`, proves the two dark blocks
  agree and the light block carries the palette, then measures every documented
  pair in both schemes against WCAG AA.
- `pnpm check:theme-dark` — renders eleven documents in Chromium and Firefox to
  prove the cascade: OS preference, `data-rv-theme` opt-out and override, and
  both Bootstrap directions. Needs the Playwright browsers installed.
- `pnpm check:component-theme` — the browser snapshot gate behind
  [what the theme restyles](component-theme.md): it re-derives each engine's
  `light` snapshot from the pre-wiring CSS and fails on any difference, so an
  unwired token cannot quietly become a visual change.

The stylesheet is plain CSS with `@supports` and `@media` only — no Sass or Less
syntax — so it compiles anywhere. The SCSS entry forwards it; it adds nothing.

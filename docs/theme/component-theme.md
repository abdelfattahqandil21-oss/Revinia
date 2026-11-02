# @rivinia/theme — what it restyles in the components

Back to [the README](../../projects/theme/README.md) ·
[theming every component](../theming.md)

The import reaches the interactive layer of each component, not just surfaces:

| Component | Reads `--rv-accent` for                                                       |
| --------- | ----------------------------------------------------------------------------- |
| select    | trigger, search and row focus rings; the active row's tint; the selected tick |
| menu      | the row focus ring and the active row's tint                                  |
| i18n      | the language toggle's focus ring and its held-down fill                       |

Every one of those reads is `var(--rv-accent, <its previous value>)`. A page
that imports nothing has no `--rv-accent`, so it renders exactly as it did
before the theme shipped — `pnpm check:component-theme` compares each engine's
`light` snapshot against one re-derived from the pre-wiring CSS (the header of
`scripts/check-component-theme.mjs` has the procedure) and fails on any
difference.

**Forced colors.** Windows High Contrast and Firefox's forced-colours mode
throw author colours away and flatten backgrounds; Chromium also forces author
`box-shadow` to `none`. What the UA leaves unreadable is re-stated with system
colours: `Canvas`, `CanvasText`, `Highlight`, `HighlightText` and `GrayText`.
The active row keeps a visible band and a ring that contrasts with it
(`CanvasText`, not `Highlight`), because the band is `Highlight`; a disabled
row turns grey at full opacity, because the UA does not force `opacity`.

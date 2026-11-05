# @rivinia/select — theming and the override surface

Back to [the README](../../projects/select/README.md) ·
[variants](variants.md) · [recipes](recipes.md) ·
[theming every Rivinia component](../theme/README.md)

This page is the select's own half. The cascade, the three levels of control,
where an override has to live, and light/dark all belong to the single shared
page: [theming every Rivinia component](../theme/README.md).

## The chain

Every colour reads its own token, then the shared semantic layer, then a
built-in default:

```css
--rv-select-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token            | Scope                               |
| -------------- | ---------------- | ----------------------------------- |
| 1. per package | `--rv-select-bg` | that component only                 |
| 2. global      | `--rv-bg`        | every Rivinia component, everywhere |
| 3. default     | —                | what you get if you set nothing     |

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
  --rv-border: #e0e0e0;
}
```

The library's defaults sit in `@layer rivinia-theme`, so your unlayered `:root`
rules win wherever they appear. **Map the global palette on `:root`, never on a
component element** — an element-level declaration shadows the root value and
the override silently stops working. A per-component token (`--rv-select-*`, or
the `--rv-select-popup-*` half of it) set on the `rv-select` host is the
exception: that scoping is what it is for.

## Colour and shape

| Token                                                                                                                                 | Falls back to                               | Built-in default                    | Applies to                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------- |
| `--rv-select-bg`                                                                                                                      | `--rv-bg`                                   | `#ffffff`                           | trigger + panel               |
| `--rv-select-fg`                                                                                                                      | `--rv-fg`                                   | `#111111`                           | trigger + panel               |
| `--rv-select-border`                                                                                                                  | `--rv-border`                               | `#e0e0e0`                           | trigger + search              |
| `--rv-select-muted`                                                                                                                   | `--rv-muted`                                | `#555555`                           | chevron, empty state          |
| `--rv-select-error`                                                                                                                   | `--rv-danger`                               | `#dc2626`                           | invalid trigger               |
| `--rv-select-radius`                                                                                                                  | `--rv-radius`                               | `0.625rem` / `0.75rem` / `0.875rem` | trigger, panel, premium panel |
| `--rv-select-shadow`                                                                                                                  | `--rv-shadow`                               | `0 16px 48px rgba(0, 0, 0, .22)`    | panel                         |
| `--rv-select-width`                                                                                                                   | —                                           | `14rem`                             | the control's reference width |
| `--rv-select-font`                                                                                                                    | —                                           | `system-ui, -apple-system, …`       | trigger and panel text        |
| `--rv-select-popup-bg` / `--rv-select-popup-fg` / `--rv-select-popup-border` / `--rv-select-popup-muted` / `--rv-select-popup-radius` | the matching `--rv-select-*`, then `--rv-*` | the panel's own values              | the opened panel              |

The panel tokens read the trigger's first, so setting `--rv-select-bg` colours
both, and `--rv-select-popup-bg` is for the case where the panel and the
trigger must differ.

## Metrics, spacing and motion

Everything else is a token too, and each has a literal default:

| Group    | Names                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| trigger  | `--rv-select-trigger-padding`, `--rv-select-trigger-size`, `--rv-select-trigger-gap`, `--rv-select-trigger-shadow`, `--rv-select-trigger-justify`, `--rv-select-value-align`, `--rv-select-caption-size`                                                                                                                     |
| rows     | `--rv-select-item-padding`, `--rv-select-item-radius`, `--rv-select-item-min-height`, `--rv-select-item-size`, `--rv-select-item-gap`, `--rv-select-item-align`, `--rv-select-item-disabled-opacity`, `--rv-select-item-hover-bg`, `--rv-select-item-active-bg`, `--rv-select-item-active-hover-bg`, `--rv-select-hint-size` |
| focus    | `--rv-select-focus-ring`, `--rv-select-focus-offset`                                                                                                                                                                                                                                                                         |
| search   | `--rv-select-search-padding`, `--rv-select-search-size`, `--rv-select-search-radius`, `--rv-select-search-gap`, `--rv-select-search-offset`                                                                                                                                                                                  |
| panel    | `--rv-select-panel-padding`, `--rv-select-popup-pad`, `--rv-select-popup-max-height`, `--rv-select-popup-width`, `--rv-select-popup-z`, `--rv-select-popup-shadow`                                                                                                                                                           |
| entrance | `--rv-select-popup-animation`, `--rv-select-popup-duration`, `--rv-select-popup-easing`, `--rv-select-popup-from-scale`, `--rv-select-popup-from-y`                                                                                                                                                                          |
| states   | `--rv-select-empty-padding`, `--rv-select-empty-size`, `--rv-select-loading-padding`, `--rv-select-loading-size`                                                                                                                                                                                                             |
| paging   | `--rv-select-popup-reach-end-offset` (default `3rem`, a **length** — see [recipes](recipes.md))                                                                                                                                                                                                                              |

```css
rv-select {
  --rv-select-trigger-padding: 0.625rem 0.875rem;
  --rv-select-trigger-size: 0.9375rem;
  --rv-select-item-padding: 0.75rem 0.875rem;
  --rv-select-item-radius: 0.25rem;
  --rv-select-item-min-height: 2.75rem;
  --rv-select-focus-ring: 2px solid var(--rv-accent);
}
```

**Every size is in `rem`, not `px`.** The components scale with the reader's
root font size, so they follow the browser's text-size preference, a user-set
accessibility default, and whatever `html { font-size }` the app sets.
Measured: at a 17px root the trigger is 14.875px with `0.5rem 0.75rem` padding;
at a 24px root it is 21px with `0.75rem 1.125rem` padding. In `px` none of it
would have moved.

## The panel is the trigger's width

`--rv-select-width` is the control's **reference width**, not a floor:
`rv-select` is `width: min(var(--rv-select-width, 14rem), 100%)` with
`max-width: 100%` and `min-width: 0`. The trigger fills it and the panel
follows the trigger exactly, so the two read as one control. Content never
decides the width — picking eight options leaves the trigger exactly where it
was; the multi summary keeps a long selection on one line. Widen the token and
all three grow together; set it to `100%` for a full-width field. In flex and
grid, `min-width: 0` overrides the automatic minimum size of a `nowrap` item,
so a narrow cell shrinks the control instead of pushing it out.

**Narrow containers.** Below the reference width the container wins: the control
shrinks with it, the trigger value truncates with an ellipsis and nothing
overflows. Option labels wrap (a 60-character unbroken string wraps instead of
widening the panel), and the panel never scrolls sideways: long lists scroll
**vertically** only. The smallest width that keeps a row on one line is 10rem
(160px); below that, labels wrap to two or three lines (measured 55–114px rows
between 128px and 96px) while the trigger keeps its shape. The trigger itself
stops shrinking at the sum of its padding, gaps and chevron — plus the pill in
multi mode — so a cell narrower than that is carried by the page, not by an
overflowing control.

## Accent and forced colors

`--rv-accent` paints the interactive layer: the premium trigger's focus ring,
the search field's ring, the row focus ring, the active row's tint and the
selected tick. Each read is `var(--rv-accent, <its previous value>)`, so a page
that never imports the theme looks exactly as it did before — unless you set
`--rv-select-focus-ring`, which still wins over all of it.

The tick has two fallbacks because it had two colours: `--rv-select-popup-muted`
on an ordinary row, and the row's own ink when that row is the active one.

Pointing at a row makes it the active row, so the tint must survive the pointer
too — it is `--rv-select-item-active-hover-bg` while hovered, and its fallback
is the 8% ink an unthemed page painted there before the theme was wired.

In forced-colours mode (`@media (forced-colors: active)`, Windows High Contrast)
the panel and rows switch to system colours: `Canvas`/`CanvasText` for the
surface, `Highlight`/`HighlightText` for the active row — which would otherwise
be flattened to invisible — and `GrayText` at full opacity for a disabled row.
The active row's focus ring becomes `CanvasText` (a `Highlight` ring on a
`Highlight` band is invisible), and the tick follows its row. The UA forces
author colours in that mode, so a brand palette is intentionally not applied:
overriding a `--rv-select-*` token there does not bring it back.

## Which styling stack?

Plain CSS, Tailwind v4 (including `@theme inline` and a dark-mode variant),
Bootstrap 5.3, Sass and Less spellings are in
[the shared page](../theme/styling-stacks.md); an adapter imports the base
stylesheet, so pick one, never both.

**No forced dark mode** — there is no `prefers-color-scheme` block anywhere in
this package, so a component can never override your explicit choice. Dark
comes from the theme layer the tokens resolve through; see
[theming every component](../theme/README.md) for both switches.

## Classes for anything the tokens do not cover

The component styles are unencapsulated, so these selectors are global and
stable:

```css
/* Roomier rows, square corners, no hover tint. */
.rv-select-popup-panel [rvselectpopupitem] {
  padding: 16px 20px;
  border-radius: 0;
}
.rv-select-popup-panel [rvselectpopupitem]:hover {
  background: transparent;
}
```

| Selector                                     | What it styles                  |
| -------------------------------------------- | ------------------------------- |
| `.rv-select-caption`                         | the label above the trigger     |
| `.rv-select-trigger`                         | the button                      |
| `.rv-select-value`                           | the trigger's text              |
| `.rv-select-count`                           | the multi `+N` pill             |
| `.rv-select-sr-only`                         | the hidden multi description    |
| `.rv-select-chevron`                         | the chevron                     |
| `.rv-select-search`                          | the filter box                  |
| `.rv-select-empty`                           | the "no results" state          |
| `.rv-select-hint`                            | an option's trailing hint       |
| `.rv-select-check`                           | the multi-mode check mark       |
| `.rv-select-popup-panel`                     | the opened panel                |
| `.rv-select-popup-menu`                      | the `role="menu"` row container |
| `.rv-select-popup-panel [rvselectpopupitem]` | an option row                   |

## Data attributes for state

| Hook              | On      | Means                            |
| ----------------- | ------- | -------------------------------- |
| `data-open`       | trigger | the panel is open                |
| `data-active`     | option  | the keyboard-active row          |
| `data-selected`   | option  | this row is in the selection     |
| `data-variant`    | both    | the skin the rules are scoped to |
| `data-placement`  | panel   | `bottom-start`, `top-end`, …     |
| `data-flipped`    | panel   | it flipped to the other side     |
| `data-positioned` | panel   | it has been measured             |
| `data-top-layer`  | panel   | it is in the browser top layer   |

## Further reading

- [Theming every Rivinia component](../theme/README.md) — the cascade, the four
  placements of an override, light and dark, `check:theme-dark`.
- [The token table](../theme/tokens.md) — the twelve global names, both schemes.
- [What the theme restyles in the components](../theme/component-theme.md).
- [Variants](variants.md) — which tokens each skin retunes, and what both cost.

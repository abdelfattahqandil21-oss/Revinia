# @rivinia/menu — theming and the override surface

Back to [the README](../../projects/menu/README.md) ·
[ready-made component](ready-made.md) ·
[theming every Rivinia component](../theming.md)

This page is the menu's own half. The cascade, the three levels of control,
where an override has to live, and light/dark all belong to the single shared
page: [theming every Rivinia component](../theming.md).

## The chain

Every colour reads its own token, then the shared semantic layer, then a
built-in default:

```css
--rv-menu-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token          | Scope                               |
| -------------- | -------------- | ----------------------------------- |
| 1. per package | `--rv-menu-bg` | that menu only                      |
| 2. global      | `--rv-bg`      | every Rivinia component, everywhere |
| 3. default     | —              | what you get if you set nothing     |

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
the override silently stops working. A per-menu token (`--rv-menu-*`) set on the
`rv-menu` host is the exception: that scoping is what it is for.

## Colour and shape

| Token                      | Falls back to | Built-in default                                                      | Applies to            |
| -------------------------- | ------------- | --------------------------------------------------------------------- | --------------------- |
| `--rv-menu-bg`             | `--rv-bg`     | `#ffffff`                                                             | panel                 |
| `--rv-menu-fg`             | `--rv-fg`     | `#111111`                                                             | panel                 |
| `--rv-menu-border`         | `--rv-border` | `#e0e0e0`                                                             | panel + divider       |
| `--rv-menu-muted`          | `--rv-muted`  | `#555555`                                                             | icon tone             |
| `--rv-menu-item-active-bg` | `--rv-accent` | `color-mix(in srgb, var(--rv-accent, currentColor) 10%, transparent)` | the active row's wash |
| `--rv-menu-radius`         | `--rv-radius` | `0.75rem` (12px)                                                      | panel                 |
| `--rv-menu-item-radius`    | `--rv-radius` | `0.5rem`                                                              | a row                 |
| `--rv-menu-shadow`         | `--rv-shadow` | `0 16px 48px rgba(0, 0, 0, .22)`                                      | panel                 |
| `--rv-menu-width`          | —             | `10rem`                                                               | panel min-width       |
| `--rv-menu-max-width`      | —             | `22rem`                                                               | panel max-width       |
| `--rv-menu-z`              | —             | `500`                                                                 | panel stacking        |

Every size token describes the **visible box**: the panel is `border-box`, so
`padding` and `border` live inside the declared width instead of adding to it.
A label wider than the cap wraps inside its row; rows are never ellipsized,
and a single long word breaks rather than overflowing the viewport.

## Metrics and motion

```css
rv-menu {
  --rv-menu-item-padding: 0.75rem 0.875rem;
  --rv-menu-item-radius: 0.25rem;
  --rv-menu-item-min-height: 2.75rem;
  --rv-menu-focus-ring: 2px solid var(--rv-accent);
}
```

| Token                             | Built-in default                           | Applies to                   |
| --------------------------------- | ------------------------------------------ | ---------------------------- |
| `--rv-menu-item-padding`          | `0.5rem 0.625rem`                          | a row                        |
| `--rv-menu-item-min-height`       | `2.5rem`                                   | a row                        |
| `--rv-menu-item-size`             | `0.875rem`                                 | a row's font size            |
| `--rv-menu-item-gap`              | `0.625rem`                                 | icon-to-label gap in a row   |
| `--rv-menu-item-align`            | `start`                                    | a row's cross-axis alignment |
| `--rv-menu-item-disabled-opacity` | `0.45`                                     | a disabled row               |
| `--rv-menu-focus-ring`            | `2px solid var(--rv-accent, currentColor)` | a focused row                |
| `--rv-menu-focus-offset`          | `-2px`                                     | that ring                    |
| `--rv-menu-panel-max-height`      | `min(20rem, calc(100dvh - 2rem))`          | the panel's scroll box       |
| `--rv-menu-duration`              | `160ms`                                    | the open animation           |
| `--rv-menu-easing`                | `cubic-bezier(0.16, 1, 0.3, 1)`            | the open animation           |

`--rv-menu-origin-x`, `--rv-menu-origin-y`, `--rv-menu-from-y` and
`--rv-menu-pad` belong to the open animation and are set by the component's own
rules; they are not part of the surface you are expected to write.

**Every size is in `rem`, not `px`.** The components scale with the reader's
root font size, so they follow the browser's text-size preference, a user-set
accessibility default, and whatever `html { font-size }` the app sets.
Measured: at a 17px root the trigger is 14.875px with `0.5rem 0.75rem` padding;
at a 24px root it is 21px with `0.75rem 1.125rem` padding. In `px` none of it
would have moved.

## Accent and forced colors

`--rv-accent` paints the row focus ring and the active row's tint. Both read
`var(--rv-accent, <their previous value>)`, so a page that never imports the
theme looks exactly as it did before — unless you set `--rv-menu-focus-ring` or
`--rv-menu-item-active-bg`, which still win over all of it.

In forced-colours mode (`@media (forced-colors: active)`, Windows High Contrast)
the panel and rows switch to system colours: `Canvas`/`CanvasText` for the
surface, `Highlight`/`HighlightText` for the active row — which would otherwise
be flattened to invisible — and `GrayText` at full opacity for a disabled row.
The active row's ring becomes `CanvasText`, because a `Highlight` ring on a
`Highlight` band cannot be seen.

## Which styling stack?

Plain CSS, Tailwind v4, Bootstrap 5.3, Sass and Less spellings are one table in
[the shared page](../theme/styling-stacks.md); an adapter imports the base
stylesheet, so pick one.

**No forced dark mode** — there is no `prefers-color-scheme` block in this
package. A menu gets dark colours only from the theme layer it reads through
`--rv-bg` and friends; a page that never imports `@rivinia/theme` keeps the
light defaults whatever the OS says.

## Classes for anything the tokens do not cover

The component styles are unencapsulated, so these selectors are global and
stable:

```css
.rv-menu-panel [rvmenuitem] {
  padding: 16px 20px;
  border-radius: 0;
}
```

| Selector                      | What it styles              |
| ----------------------------- | --------------------------- |
| `.rv-menu-panel`              | the opened panel            |
| `.rv-menu-trigger`            | the trigger slot            |
| `.rv-menu-panel [rvmenuitem]` | a menu row                  |
| `.rv-menu-check`              | the multi-mode check mark   |
| `.rv-menu-hint`               | a row's trailing hint       |
| `.rv-menu-empty`              | the "nothing to show" state |
| `rv-menu hr`                  | a divider between groups    |

## Data attributes for state

| Hook              | On    | Means                                 |
| ----------------- | ----- | ------------------------------------- |
| `data-active`     | row   | the keyboard-active row               |
| `data-placement`  | panel | `bottom-start`, `top-end`, …          |
| `data-flipped`    | panel | it flipped to the other side          |
| `data-positioned` | panel | it has been measured                  |
| `data-top-layer`  | panel | it is in the browser top layer        |
| `data-rtl`        | panel | the panel's current writing direction |

## Further reading

- [Theming every Rivinia component](../theming.md) — the cascade, the four
  placements of an override, light and dark, `check:theme-dark`.
- [The token table](../theme/tokens.md) — the twelve global names, both schemes.
- [Which styling stack?](../theme/styling-stacks.md)
- [What the theme restyles in the components](../theme/component-theme.md) — the
  accent wiring and forced colours, across all packages.

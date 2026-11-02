# @rivinia/select

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.
The full entry for every release is in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md);
this file keeps what a consumer of this package needs, including the migration
notes for 0.6.0, 0.5.0 and 0.2.0.

## Unreleased

- **Single rows are `menuitemradio` with `aria-checked`.** They were plain
  `menuitem`, so the selected option was not announced as selected (D85).
  Multi rows stay `menuitemcheckbox`. ARIA roles are public contract: a
  consumer that queried `[role="menuitem"]` inside the panel must query
  `[role="menuitemradio"]`.
- **The menu owns rows only.** The panel still holds everything, but the
  `role="menu"` element is now an inner rows container (`.rv-select-popup-menu`);
  the filter box, the empty state, the loader row and a consumer footer are its
  siblings. A `searchbox` child of `role="menu"` is an axe
  `aria-required-children` violation (critical, measured).
- **A custom `listTemplate` must give its rows a `menuitem*` role and
  `tabindex="-1"`.** Without them the menu owns elements it may not own and the
  scrollport is not focusable (measured: critical + serious). The recipe in
  [`docs/select/recipes.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/select/recipes.md)
  shows the attributes.
- **The trigger's name includes the visible value.** `aria-labelledby` composes
  the caption (or `ariaLabel`) with the value, so the accessible name always
  contains the text on screen (WCAG 2.5.3, axe `label-content-name-mismatch`,
  measured serious).
- **Fixed: Enter did nothing right after filtering.** The active row was the
  one the filter had just removed, and nothing took over; activation now falls
  to the top remaining row.
- **Fixed: the filter box vanished mid-word on a phone.** Any `resize` closed the
  panel, and an on-screen keyboard opening is exactly that — a `resize` with the
  height the only thing that changed. A height-only resize is now ignored while
  the caret is inside the panel's filter box; a width change still always closes,
  because width is the axis the panel is anchored on. Automated in
  `e2e/popup/conformance.spec.ts`; the real-device half of this is
  **not tested** and is listed in `docs/HUMAN-CHECKS-1.0.md` (S4).
- **The theme's accent now reaches the control.** `--rv-accent` paints the
  trigger, search and row focus rings, the active row's tint and the selected
  tick. Every read is `var(--rv-accent, <previous value>)`, so a page that does
  not import `@rivinia/theme` renders exactly as before (snapshot-proved).
  Hovering a row activates it, so a separate `:hover` wash used to repaint the
  active tint neutral; the active row now keeps the accent under the pointer
  (`--rv-select-item-active-hover-bg`), with the same 8% ink as its fallback.
- **Forced colors.** `@media (forced-colors: active)` gives the panel
  `Canvas`/`CanvasText`, the active row `Highlight`/`HighlightText` and a
  disabled row `GrayText` at full opacity — the UA otherwise flattens the active
  row into invisibility. The selected tick follows its row, and the active
  row's ring is `CanvasText`, because a `Highlight` ring on a `Highlight` band
  cannot be seen.

- **The CSS anchor-positioning gate now covers `anchor-scope` and
  `position-visibility`.** The popup entered that block on any engine with
  `anchor-name` (Chromium 125), but the scope — which stops a duplicated
  `anchor-name` resolving to the LAST trigger laid out — is Chromium 131, and
  `position-visibility: anchors-visible` is Safari 26.2. In those bands a panel
  could anchor to the wrong trigger; the repository measured three selects whose
  panels all landed on the third, up to 431px from their own. The prelude now
  probes the newest property in each engine, so nothing inside is newer than a
  probe, and the engines in between take the
  component's own coordinates — the path Firefox uses and the suite already
  measures on every run. See `docs/browser-support.md` for the two floors, and
  note that the band between them (Chrome 114–130, Safari 17–26.1) and real
  Safari itself were never run.

## 0.7.1

Two fixes to the multi trigger, both found in a browser and proved in a browser.
No public API changed — no new input, token or export — so this is a patch.

- **Fixed: the multi trigger grew with every pick.** `--rv-select-width` is now
  the control's reference width (`width: min(var(--rv-select-width, 14rem), 100%)`)
  instead of a `min-width` floor on a `nowrap` inline-block, so picks no longer
  widen the control or pull it away from its panel.
- **Fixed: the multi trigger showed one label and hid the rest.** Multi mode now
  shows the first picked label plus an `aria-hidden`, LTR-isolated `+N` pill, and
  exposes the full list as the trigger's description through `aria-describedby`.
  The description follows the page language through `Intl.ListFormat` and updates
  live when `<html lang>` changes.

Nothing to change in your templates. Two notes if you depended on the old
behaviour: a custom trigger built on the controller can still join every pick
(`selectedLabels().join(', ')` is unchanged), and a select that relied on its
content to widen it now needs `--rv-select-width` (or a wrapper width) — inside
an already-sized cell it looks the same as before.

## 0.7.0

- **`variant` input.** `simple` (default) keeps the flat control; `premium` is an
  opt-in skin driven entirely by `--rv-select-*` tokens. +801 B brotli for the
  `/ui` entry.
- **One-width model.** The panel follows the trigger width, including narrow
  containers, and wraps long labels instead of scrolling horizontally.
- **Docs:** the ARIA story now matches the shipped menu pattern (the package
  never shipped a listbox).

## 0.6.0

**Two things to do, both mechanical.**

**1. If you styled a select by targeting its markup**, the panel's class names
changed. The select's private panel was called `rv-select-menu`; it is now
`rv-select-popup`, so it can no longer collide with `@rivinia/menu`.

| Was                       | Now                        |
| ------------------------- | -------------------------- |
| `.rv-select-menu-panel`   | `.rv-select-popup-panel`   |
| `.rv-select-menu-trigger` | `.rv-select-popup-trigger` |
| `[rvselectmenuitem]`      | `[rvselectpopupitem]`      |
| `rvSelectMenuItem`        | `rvSelectPopupItem`        |
| `rvSelectMenuTrigger`     | `rvSelectPopupTrigger`     |
| `rvSelectMenuPanel`       | `rvSelectPopupPanel`       |
| `--rv-select-menu-*`      | `--rv-select-popup-*`      |

If you only set `--rv-select-*` on `rv-select`, there is nothing to change —
those names are unchanged.

**2. If you bound `[menuLabel]`**, rename it to `popupLabel`.

```html
<rv-select [options]="options" popupLabel="Status options" />
```

**Everything else is additive**: the DI helpers, the loader, `reachEnd`, the
footer slot, `listTemplate`, the frozen options — and the RTL fix, which 0.5.0
needed badly: there the panel pinned itself to the viewport edge instead of its
trigger's (measured: trigger at x=11..232, panel at x=708..929 in a 929px
viewport).

## 0.5.0

**No breaking change to the type-level API.** `rv-select` still exported exactly
`RiviniaSelectComponent` and `SelectChange`; no input, output or type you bind
has been renamed. What changed was the name of the vendored popup and the CSS
that positions it.

## 0.2.0

- **Theming tokens renamed.** `--rv-menu-*` → `--rv-select-*`. Update any CSS
  that overrode the old names:

  ```diff
  -.app { --rv-menu-bg: #161616; --rv-menu-fg: #f2f2f2; }
  +.app { --rv-select-bg: #161616; --rv-select-fg: #f2f2f2; }
  ```

- **Forced dark mode removed.** If you relied on the shipped dark palette, add
  your own `@media (prefers-color-scheme: dark)` block — or import
  `@rivinia/theme`, which ships both schemes.
- **New inputs** `label`, `ariaLabel`, `popupLabel`, `searchLabel` are additive;
  existing templates keep working.
- **`toggle()` on a single-mode controller now returns `false`** instead of
  mutating `values`. It never had a defined meaning in single mode.
- **`clear()` on the component now emits `selectionChange`** (`null` single, the
  empty array multi). If you drove `clear()` at the controller level and reacted
  to `value()`/`values()` directly, nothing changes; if you listen to
  `selectionChange`, you now also receive clears.

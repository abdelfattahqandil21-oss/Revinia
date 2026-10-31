# @rivinia/select

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.
Older releases (0.1.0 to 0.6.0) are documented in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md).

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
  scrollport is not focusable (measured: critical + serious). The README recipe
  shows the attributes.
- **The trigger's name includes the visible value.** `aria-labelledby` composes
  the caption (or `ariaLabel`) with the value, so the accessible name always
  contains the text on screen (WCAG 2.5.3, axe `label-content-name-mismatch`,
  measured serious).
- **Fixed: Enter did nothing right after filtering.** The active row was the
  one the filter had just removed, and nothing took over; activation now falls
  to the top remaining row.

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

## 0.7.0

- **`variant` input.** `simple` (default) keeps the flat control; `premium` is an
  opt-in skin driven entirely by `--rv-select-*` tokens. +801 B brotli for the
  `/ui` entry.
- **One-width model.** The panel follows the trigger width, including narrow
  containers, and wraps long labels instead of scrolling horizontally.
- **Docs:** the README ARIA section now matches the shipped menu pattern
  (the package never shipped a listbox).

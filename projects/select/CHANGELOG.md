# @rivinia/select

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.
Older releases (0.1.0 to 0.6.0) are documented in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md).

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

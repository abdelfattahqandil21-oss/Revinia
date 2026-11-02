# @rivinia/menu

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.
Older releases (0.1.0 to 0.4.0) are documented in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md).

## Unreleased

- **The theme's accent now reaches the panel.** `--rv-accent` paints the row
  focus ring and the active row's tint. Both read
  `var(--rv-accent, <previous value>)`, so a page that does not import
  `@rivinia/theme` renders exactly as before (snapshot-proved).
- **Forced colors.** `@media (forced-colors: active)` gives the panel
  `Canvas`/`CanvasText`, the active row `Highlight`/`HighlightText` and a
  disabled row `GrayText` at full opacity — the UA otherwise flattens the
  active row into invisibility. The active row's ring is `CanvasText`, because
  a `Highlight` ring on a `Highlight` band cannot be seen.
- **A resize that changes only the height keeps the panel open while the caret
  is in an editable element you projected into it** — the on-screen keyboard
  case. A built-in menu has nothing editable, so its behavior is unchanged:
  every resize closes, and so does any width change, because width is the axis
  the panel is anchored on. Now covered by one suite with the select popup
  (`e2e/popup/conformance.spec.ts`, eight cases run against the select, the
  built-in menu and a menu with a consumer field projected into its panel), which
  also asserts the panel's three global listeners are balanced again after a
  route change destroys an open panel. The real-device half of this is
  **not tested** and is listed in `docs/HUMAN-CHECKS-1.0.md` (S4).

## 0.5.0

The panel becomes a safe host for projected content. A language picker (or any
consumer widget) can live inside `rv-menu-panel` without the menu stealing its
keys, and the library gained the missing selection role it needed for that.
Minor under the pre-1.0 rule: the keyboard contract gains rules, and `[radio]`
is new.

- **Projected content keeps its own keys.** Row navigation (`ArrowUp`,
  `ArrowDown`, `Home`, `End`, `Enter`, `Space`, typeahead) only acts when the
  key comes from the panel itself or from inside a registered `rvMenuItem`.
  Typing in a projected `<input>` no longer moves the active row.
- **A nested control claims a key with `preventDefault()`.** If anything inside
  the panel already handled the key, the menu does nothing with it.
- **`Escape` and `Tab` act from anywhere in the panel.** `Escape` closes and
  returns focus to the trigger; `Tab` / `Shift+Tab` close and step focus past
  the trigger — never trapped, never dropped on `<body>`.
- **A pick returns focus to the trigger** when focus was inside the panel.
- **`[radio]` renders `menuitemradio`.** `checked` alone still means
  `menuitemcheckbox`; `radio` makes the row a `menuitemradio`, so a
  single-choice group (languages, density, theme) is announced correctly.
  `role="group"` and `aria-label` stay consumer markup.

No change to the headless controller, the panel's CSS or its positioning.

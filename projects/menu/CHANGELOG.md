# @rivinia/menu

From 1.0.0 this package follows **strict semver**: only a major may break, a new
input, output, token or export is a minor, and a patch never changes what a page
renders or what an assistive technology announces. Two things are public API here
rather than implementation detail: **the `--rv-menu-*` and `--rv-*` token names**,
and **the roles the panel emits** — `menu` on the panel, `menuitem` rows,
`menuitemradio` and `menuitemcheckbox` when the consumer's markup asks, and the
optional `role="group"` wrapper. Renaming a token or changing a role a consumer
has to write is a major. A new token is always additive: every rule reads
`var(--rv-menu-<name>, var(--rv-<semantic>, <previous value>))`.

Coming from 0.5.0: **nothing to do** — 1.0.0 removes no name and renames none.
The changes a 0.x consumer had to read are 0.4.0's pointer-open and width
defaults, recorded below, and the freeze that fixed what ships is
[`docs/API-SURFACE-1.0.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/API-SURFACE-1.0.md).
The full entry for every release is in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md);
this file keeps what a consumer of this package needs, including the migration
notes for 0.4.0 and 0.3.5.

## 1.0.0-rc.1

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

- **The CSS anchor-positioning gate now covers `anchor-scope` and
  `position-visibility`.** The panel used to enter that block on any engine with
  `anchor-name`, which Chromium gained in 125 while `anchor-scope` arrived in 131;
  inside that six-version band a browser ignored the scope, and a duplicate
  `anchor-name` resolves to the last trigger on the page — so a second menu
  would open against somebody else's button. It now probes the newest property
  in each engine, so every feature inside is no newer than some probe, and those
  engines take the component's own coordinates,
  which is the path Firefox uses and the suite already measures on every run.
  The same reading corrected two comments that called anchor positioning
  "Baseline widely-available since 2026-01": it is Baseline **low** since
  2026-01-13, and widely available in 2028-07. `docs/browser-support.md` holds
  the two floors this implies (Supported: Chromium/Edge 114, Firefox 125, Safari
  17 / iOS 18.3; Enhanced: Chromium 131, Safari 26.2; Firefox never, by a measured
  RTL bug). The band between them was never run, and real Safari is a human item.

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

## 0.4.0

This is a **minor** release: the pointer-open interaction changed on purpose.
**Nothing to do unless you relied on a click pre-selecting the first row.**
The full release entry is in the repository
[CHANGELOG](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/CHANGELOG.md);
what a consumer needs is here.

The panel is now `border-box` with a `22rem` cap (`--rv-menu-max-width`), and
the `--rv-menu-width` default drops from `16rem` to `10rem`; a menu that
already fits looks the same or narrower, and long labels wrap instead of
stretching the panel or being clipped. If you set `--rv-menu-width` yourself,
keep it: the token still works, it is only the default that changed.

Two interaction changes:

- A pointer open no longer activates the first row (`toggle('none')` through
  the controller). If you triggered your own logic when `activeId()` became
  non-null on open, move it to `opened` or to the first arrow key.
- Tab now closes the menu even when focus is still on the trigger, and in
  WebKit focus is re-seated on the trigger after a close so Shift+Tab
  continues naturally.

The `:hover` wash on rows is gone. Hover still activates the row (through the
controller), so consumers styling `--rv-menu-item-hover-bg` should move that
colour to `--rv-menu-item-active-bg`.

## 0.3.5

**Nothing to do.** No API changed, no token was renamed, no class was renamed.

The only difference is that the panel now stays attached to its trigger in
right-to-left layouts, where it used to drift to the edge of the viewport. If
you styled the panel by targeting its markup, the selectors are unchanged:

```css
.rv-menu-panel {
  /* unchanged */
}
.rv-menu-panel [rvmenuitem] {
  /* unchanged */
}
```

## 2026-10-31 — D83: the menu panel as a safe host — projection, not a template API

`docs/SPEC-menu-projected-content.md` (frozen before code) makes `rv-menu-panel`
a place where consumer markup can live next to menu rows. The motivating case
is a language picker, but nothing in the contract mentions i18n.

- **Projection only.** No `itemTemplate`, no generated-markup helper, and no
  second "Language Menu" component. The consumer writes the rows and the
  surrounding widgets; the menu keeps what it already owned — open state, the
  panel, positioning, trigger association and row behavior. A nested
  `rv-select` inside the panel was rejected: both would own the same keydown
  and the select never calls `stopPropagation`.
- **Ownership is decided by the event, not by an API.** `defaultPrevented` is
  checked first; row keys then require the target to be the panel or inside a
  row **that exists in the registry** (`closest('[rvmenuitem]')` plus a
  `data-rv-id` lookup in `controller().items()`). The attribute alone is not
  identity — a nested select carries its own `data-rv-id` — and enabled-ness is
  deliberately not part of the check, so a disabled row that holds focus can
  still arrow away. Nothing about this needs consumer configuration.
- **`Escape` and `Tab` are dismiss keys from anywhere in the panel.** Both were
  unhandled for projected controls, so an open panel could be left behind with
  focus outside it. Letting the browser tab while the panel stays open needs a
  `focusout` watcher that races the same native step the existing `Tab` handler
  exists to defeat; closing on `Tab` is the APG menu-button behavior and makes
  one rule for rows and projected content alike. A nested widget that needs
  `Tab` internally claims it.
- **Focus restoration is decided at pick time, synchronously.** If
  `document.activeElement` is inside the panel, close through the existing
  restoring path (trigger focus + the WebKit re-seat, D80); otherwise leave
  focus where it is. Reusing `doClose(restore)` means the outside-click
  philosophy and the popover quirk fix stay in one place. jsdom cannot focus
  on `click`, so the unit case focuses the row first; the real mouse path is
  covered in the browser suite.
- **`[radio]` is a general menu feature.** `checked` alone still maps to
  `menuitemcheckbox` (no existing consumer changes); `radio` selects
  `menuitemradio`. Exclusivity and the `role="group"` wrapper stay the
  consumer's: the menu cannot know which rows form one choice set, and silently
  grouping would be the wrong default for a menu of unrelated actions.
- **No dynamic re-measure.** The panel is measured on open as before; projected
  content that changes size while open re-lays-out but does not reposition.
  Accepted for this batch and documented, not hidden.
- **Evidence.** 59 unit tests (`npx ng test menu --watch=false`) and 66
  Playwright cases per engine (Chromium and Firefox; WebKit remains not
  runnable on this host — `libavif.so.16`). Every production hunk was
  mutation-checked: the `defaultPrevented` guard turns r3 and r9 red, the
  target gate r2, removing the restore r4 and r5b, always restoring r5, the
  selector scoping r6, the role mapping r7, and the `closest()` lookup r4, r8
  and r9. The two `Tab` paths (trigger and panel) both stay and are both
  tested.

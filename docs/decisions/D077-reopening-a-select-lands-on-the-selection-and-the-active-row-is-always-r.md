## 2026-10-30 — D77: reopening a select lands on the selection, and the active row is always revealed

- **What shipped.** `@rivinia/select` 0.7.0 (prepared, unpublished): the inner
  navigation controller holds an activation requested before its row exists,
  and the popup reveals the active row with
  `scrollIntoView({ block: 'nearest' })` after every change of the active row.
- **The race.** `(opened)` calls `activate(value)` while the declarative rows
  have not rendered, so the call returned `false` and the first row that
  registered won the open — the highlight sat on the first option while the
  trigger showed the chosen one. Rows register after the open, which is why
  the plain `activateFirst()` fallback existed at all; it lived in the popup
  component, so it could not know that a specific row had been requested.
  `SelectPopupControllerImpl.activate()` now stores the id while the menu is
  open and applies it when that row registers; a row that is not the
  requested one no longer claims the open, and any explicit navigation
  (`openMenu`, `activateFirst/Last/Next/Previous`, a successful `activate`)
  drops the request, as does `closePopup()`.
- **Why `scrollIntoView` and not `focus({ preventScroll: false })`.** Focus was
  deliberately moved with `preventScroll` so the panel never jumped under the
  pointer, and nothing else ever scrolled: measured in Chromium on the packed
  tarball, a reopen on the last governorate left `scrollTop` at 0 with the
  active row below the fold, and ArrowUp/ArrowDown/Home/End moved the active
  row without scrolling either — the `scroll-padding-top` D76 added had no
  consumer. `nearest` scrolls only when the row is outside the viewport, so
  typing, hovering and small arrow moves do not shift the list. Measured
  after, in the consumer page: reopen on the last governorate → `scrollTop`
  131, active row `kafr-elsheikh` at 600.9–640.9 inside a panel of
  321.9–641.9; `End` → same row back in view; `ArrowDown` past the end wraps to
  `cairo` and scrolls to `scrollTop` 1 with the row top at 371.9, exactly at
  the pinned bar's bottom edge.
- **A registration write must not be a dependency.** `register()` now reads the
  registry to tell a new row from a re-register. Called from the row
  directive's own effect, that read made the effect depend on the array it
  wrote — every registration re-ran every row's effect forever (the test run
  hung at 100% CPU on seven workers). Registration, unregistration and the
  navigation commands are `untracked()`; the select's query effect, which used
  to re-run `activateFirst()` on every registration, is now untracked around
  that call too — the last registration was overwriting the requested value.
- **Trade-off, documented.** When the requested option never registers (a
  value that is not in `[options]`, or a paginated page that has not loaded),
  nothing is active until the user navigates; the first arrow then enters the
  list at its first row. Highlighting a different option was the bug. A
  virtualised list that drops the active row from the DOM has no element to
  reveal — the consumer owns scrolling there.
- **Tests.** `projects/select/tests/select-active-reveal.spec.ts` (6 cases):
  the controller contract (a requested id activates when it registers; a
  request is not resurrected across opens; an explicit move drops it; an
  unresolvable request does not activate another row) and two DOM cases that
  spy on `Element.prototype.scrollIntoView` and expect
  `{ block: 'nearest' }` on the selected row after opening and on the next row
  after an ArrowDown. Mutation-checked: dropping the stored request fails the
  controller cases; removing the `revealActive` call fails both DOM cases.
- **Not covered.** Firefox and WebKit were not re-run for this change; the
  reveal relies on each engine's `scrollIntoView` honouring `scroll-padding`,
  which is the reason D76 put the padding there.

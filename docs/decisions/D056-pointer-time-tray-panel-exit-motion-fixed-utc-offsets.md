## 2026-10-25 — D56: pointer time tray, panel exit motion, fixed UTC offsets

- Context: D55 shipped date + time in one panel. Three follow-ups were
  reported: a pointer/touch user should not have to type or use arrow keys;
  the panel should open AND close with motion, and dismiss the way a
  non-modal popover does; and a developer must be able to fix a GMT offset in
  code without exposing a time-zone selector to the end user.

- **The time tray is an overlay, not a second step.** The clock button (a real
  button with `aria-expanded` / `aria-controls`) opens one
  `role="listbox"` per unit — hour, minute, and second only with
  `showSeconds` — above the time row, over the day grid, inside the same
  panel. It is `position: absolute`, so it changes neither the panel's width
  nor its height. Each column scrolls independently, opens centred on its
  selected value, and each row is a `role="option"` with `aria-selected`.
  Picking a row writes the **draft** and leaves everything open; `OK` is still
  the only commit. `Escape` closes the tray first (panel stays open, focus
  returns to the clock button); an outside pointer or leaving the tray closes
  only the tray. The tray is the clock button's immediate sibling in the DOM,
  so the tab order is clock → selected hour → selected minute → [second] →
  meridiem → Now → OK; only the selected row of each column has
  `tabindex="0"`, and the rest are `-1` (APG roving tabindex).

- **Panel exit motion uses the existing `closing` state.** On dismissal the
  panel gets `.rv-datepicker-panel--closing`, `inert`, `aria-hidden="true"` and
  `pointer-events: none`, and plays a 100 ms exit animation. Completion comes
  from `animationend`, with a 500 ms fallback, and then the panel is removed.
  - Angular scopes CSS animation names (`_ngcontent-…_rv-datepicker-exit`), so
    the completion check uses `event.animationName.endsWith('rv-datepicker-exit')`
    rather than equality — the first implementation compared exactly and the
    panel stayed until the 500 ms fallback (measured: `animationend` fired at
    ~100 ms, panel still present).
  - `prefers-reduced-motion: reduce`, or an environment without `matchMedia`
    (jsdom), closes instantly; another picker taking over
    (`closeForAnotherPanel()`) skips the exit so two panels never coexist.
  - During the exit the panel is inert, so a second click cannot re-enter a
    control that is on its way out.

- **Fixed UTC offsets are first-class `timeZone` values.** `+03:00` and
  `-05:30` resolve through the same `Intl` path as an IANA id: offset `180`
  minutes, `kind: 'unique'`, no gap and no overlap, in January and July alike.
  `Etc/GMT-3` is the IANA zone with the same offset (POSIX signs are
  inverted); `GMT+3` is rejected because it is a display name, not an offset.
  `isValidTimeZone()` accepts the fixed form; `listTimeZones()` does not list
  it (it enumerates IANA ids). There is **no end-user time-zone selector**:
  the developer chooses `timeZone` in code, as required.

- Verified in this session (2026-10-25):
  - **462/462 unit tests in 14 files**, including a new DOM-order test that
    pins the tray directly after the clock button, one tab stop per column,
    and the actions after the tray; plus the `+03:00` / `Etc/GMT-3` / `GMT+3`
    core test and the scoped-animation-completion test.
  - `ng build datepicker` (both entry points); tarball **8 files**
    (`package.json`, README, two FESM bundles + maps, two `.d.ts`); dist FESM
    imports only `@angular/core` (core) and `@angular/core` +
    `@rivinia/datepicker` (UI); zero `tslib` imports; the D20-injected
    `tslib` dependency entry is expected.
  - Tarball reinstalled into the consumer playground; production build
    **371.50 kB raw / 88.64 kB transfer**.
  - Chromium against that production build, zero console errors:
    - exit: `animationstart` → `animationend` for
      `…_rv-datepicker-exit` at ~100 ms, panel gone by the 150 ms sample;
      closing class, `inert` and `aria-hidden` present immediately.
    - tab order: clock → selected hour → selected minute → Now → OK, with
      the tray closing on the step out; picking an hour left the tray and the
      panel open.
    - fixed offset: `+03:00` at 16:00 resolved `offset 180 min`,
      `instant 2026-10-25T13:00:00.000Z`, `kind unique`; the trigger showed
      `GMT+3`.
    - narrow 320 × 568: panel 304 × 336.8 at x = 16, `Now`/`OK` bottom
      566.6, panel bottom 577.1 — **9.1 px of the panel's bottom padding is
      below the viewport**; no control is clipped and the page scrolls. This
      is documented in the README as a measured limitation; the panel is
      clamped in width, not shifted vertically.
- Not published. Version remains **0.1.0**. Firefox/WebKit and SSR are still
  unverified and are not claimed.

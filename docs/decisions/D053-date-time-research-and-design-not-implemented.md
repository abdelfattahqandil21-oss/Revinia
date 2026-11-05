## 2026-10-25 — D53: date + time — research and design, NOT implemented

- Context: the user asked whether the picker will support date + time, and
  required that time be an extension of the SAME panel ("لا تكسره وتعيده"),
  that the panel respect the parent width, and that it keep a minimum width.
  This entry records the research and the design. **No time code exists in
  `projects/datepicker/`.**

- Sources consulted (2026-10-25):
  - PrimeNG 22.1.4 `DatePicker` — `showTime`, `hourFormat`, `timeOnly`,
    per-unit spinner buttons with `aria-label`s (`prevHour`, `nextMinute`,
    `am`/`pm`), popup `role="dialog"`, grid roles, `selectionMode`.
  - ng-zorro 22.1.2 `DatePicker` — `nzShowTime`, `nzOnOk`, `nzShowNow`,
    `nzDisabledTime`, the "Now"/"Today" footer.
  - Ant Design 6 `TimePicker` — `needConfirm` (commit only on confirm),
    `hourStep` / `minuteStep` / `secondStep`, `use12Hours`, `showNow`,
    `renderExtraFooter`.
  - MDN `<input type="datetime-local">` — value is always `YYYY-MM-DDTHH:mm`,
    no time-zone/locale control, browser-owned UI, `size` does not apply.
  - W3C APG **Spinbutton** pattern — the keyboard/ARIA model for a time field.
  (MUI X and the Material 3 spec did not load in this environment; nothing in
  this entry is attributed to them.)

- **Native input rejected** for the same reasons the date half already rejects
  it: the displayed format and the UI belong to the browser, so it cannot follow
  the package's tokens, its RTL rules, or the panel rules above.

- **Design: the time is a row inside the existing panel.**
  ```
  ┌────────────────────────────────────────────┐
  │  ‹        October 2026        ›   [Today]  │
  │  Mo Tu We Th Fr Sa Su                      │
  │  …              day grid …                 │   never unmounted
  ├────────────────────────────────────────────┤
  │  [ 09 ] : [ 30 ]  [AM|PM]   [Now]   [OK]   │   the time row
  └────────────────────────────────────────────┘
  ```
  - Same panel element, same popover/anchor, same border/shadow/tokens — the
    row is added, the panel is not rebuilt or replaced by a second step.
  - The day grid stays mounted while the time row is used, so focus and the
    visible month are preserved.

- **Commit is explicit.** A time makes the value incomplete, so a day click
  updates a DRAFT; `OK` commits date and time together and closes; Escape or an
  outside click discards. (`needConfirm` in Ant Design is the same rule.)
  `Now` fills the draft and does not commit.

- **Typed API.** A separate `rv-datetimepicker`, not a `showTime` flag on
  `rv-datepicker`: `RiviniaDate` and `RiviniaDateTime = { date, time }` are
  different types, and a union-typed model would push a narrowing check into
  every consumer. The UI guarantee is unaffected because the panel parts
  (`rv-calendar`, a new `rv-time-row`) are shared inside the same shell.
  - `RiviniaTime { hour: 0–23; minute: 0–59; second: 0–59 }` always carries
    seconds; `showTime: 'minutes' | 'seconds'` decides what is editable and
    formatted.

- **Time controls are spinbuttons, not dials or 60-row lists.** Per APG:
  `role="spinbutton"`, `aria-valuenow/min/max`, localized `aria-valuetext`,
  Up/Down ±1, PageUp/PageDown ±step, Home/End, and a digit buffer for direct
  entry. A clock dial has no APG pattern, mirrors awkwardly in RTL, and is
  pointer-heavy; two 60-option listboxes add 120 nodes and long scrolling.
  The meridiem is a two-button `aria-pressed` group; 12/24h comes from the
  locale's `Intl` `hourCycle` (`hour12: 'auto'`), never hardcoded.

- **Width — the explicit rules, unchanged where they already exist.**
  - Panel: `max(field, 19.25rem)`, capped by `100vw - 1rem`, 4px gap, logical
    anchor alignment — exactly D51/D52.
  - Time row: `display: flex; flex-wrap: wrap; min-inline-size: 0`, every child
    shrinkable. Its natural width is below the 19.25rem floor, so time never
    widens the panel; at large text or 320px it wraps and the panel grows in
    BLOCK size only, never beyond the parent/viewport inline size.
  - The day grid keeps `--rv-calendar-width` and stays centred.

- **Formatting.** `format` stays the date; `timeFormat` accepts `'short'` /
  `'medium'` or a pattern (`HH:mm`, `hh:mm a`). The trigger joins both through
  `Intl.DateTimeFormat({ dateStyle, timeStyle })` so the locale's separator,
  digits and bidi marks are used; `formatTime(locale, time, …)` is exported from
  the headless entry. The date-only picker keeps REJECTING time tokens.

- **Timezone/DST seam.** The core stores civil date + time and never constructs
  a `Date`; a spring-forward gap cannot be validated here. The app converts to
  an instant (`Temporal.ZonedDateTime` where available) — the same seam D51
  documents, not a new one.

- Planned tests are listed in the README (core arithmetic/formatting,
  spinbutton keys, draft/commit/discard, RTL, width with the row wrapped, and
  the browser pass). Status: **designed, not started**; no version is promised
  for it.

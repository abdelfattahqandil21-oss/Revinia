## 2026-10-25 — D55: date + time in the same panel, and time zones made explicit

- Context: D53 designed date + time and time-zone handling but shipped nothing.
  The user chose to finish both before the first publish. The panel had to stay
  one panel (not a second step), respect its parent width, keep a minimum
  width, and remain usable from Reactive Forms, `ngModel` and Signal Forms.
- **The value model.** `RiviniaDateTime = { date: RiviniaDate; time:
  RiviniaTime }` is civil: no zone, no offset, no implicit instant.
  `RiviniaTime` always carries `second` (0–59), even when the row does not edit
  it; two shapes for the same fact would be a compatibility trap. A separate
  `<rv-datetimepicker>` (not a `showTime` flag) keeps `RiviniaDate` and
  `RiviniaDateTime` distinct, so no consumer needs a narrowing check. The
  panel parts are shared: the same `<rv-calendar>` and panel shell, with
  `<rv-time-row>` below the grid.
- **One panel, draft + explicit commit.** A day click or a time edit updates a
  draft; `OK` commits both halves and closes. Escape or an outside click
  discards. The calendar is never unmounted while the time is used, so the
  visible month, the focused day and the selected date survive. `Now` fills the
  draft (in the selected zone when one is set) and does not commit. This is the
  Ant Design `needConfirm` rule: a date + time is incomplete until time is
  confirmed.
- **The time controls are APG spinbuttons**, not a clock dial: Arrow ±1,
  PageUp/PageDown ±`minuteStep` on minute/second (±1 on hour), Home/End,
  direct typing with clamping and padding, Enter commits. A two-button
  `aria-pressed` group is the meridiem. The locale's `Intl` `hourCycle` and
  day periods decide 12/24h and `AM`/`م`; `hour12` overrides. Digits are
  localized (`٠٩:٣٠`).
- **Formatting is two independent halves.** `format` remains date-only and
  still rejects time tokens; `timeFormat` accepts `short`, `medium` or a
  case-sensitive time pattern (`HH:mm`, `hh:mm a`, `HH:mm:ss`). Mixing a
  24-hour token with `a` (or with `h`) throws instead of guessing; `M`, `S`,
  `A`, `k`, `K`, date and zone letters throw with an actionable message.
  `formatDateTime` uses one `Intl.DateTimeFormat({dateStyle,timeStyle})` when
  both halves are styles; otherwise it joins with the locale's date-time
  connector (` في ` in Arabic, a comma elsewhere).
- **Time zones are a resolver, not a dependency.** `resolveWallTime(value,
  zone, disambiguation?)` uses `Intl` only; there is no Temporal dependency and
  no bundled tzdata. It returns `unique`, `ambiguous` or `nonexistent`, with
  every candidate's `instant`, `offsetMinutes` and actual wall time.
  `compatible` (default) takes the earlier instant for an overlap and the later
  wall time for a gap; `earlier`/`later` are explicit; `reject` throws.
  `wallTimeInTimeZone`, `getTimeZoneOffsetMinutes`, `nowInTimeZone`,
  `todayInTimeZone`, `isValidTimeZone` and `listTimeZones` complete the
  surface. The picker never stores an instant: it shows the zone's offset and
  name, warns on a gap or overlap, offers the overlap offsets and the real
  post-gap wall time as an explicit `Use …` action, and emits
  `{ value, timeZone, resolution }` on commit **only when the zone is valid**.
  An invalid zone warns and emits nothing. A time that crosses a gap is still
  civil until the user adopts the suggestion; if they press `OK` anyway the
  resolution is reported as `nonexistent`, never silently moved.
- **Width.** The datetime field defaults to `15rem` (`--rv-datetimepicker-
  width`) with the same parent cap as the date field. The panel keeps the
  date picker's `19.25rem` floor, follows a wider field, and is capped by
  `100vw - 1rem`. The time row is a wrapping flex row; it is below the floor's
  width and cannot widen the panel; if forced it wraps in the block direction.
- **`FormValueControl` and bounds.** The datetime picker implements
  `FormValueControl<RiviniaDateTime | null>` with `value` + `touch`, like the
  date picker. Its `min`/`max` inputs are therefore typed
  `RiviniaDateTime | undefined` (a `RiviniaDate` bound would not satisfy the
  interface); the calendar uses their `.date`, and the time half is not
  bounded. All three form APIs bind the whole value; a form write while the
  panel is open updates the calendar and the draft, while a draft edit does not
  echo into the form. The Angular 22 template-driven validator gap documented
  in D54 applies unchanged.
- **`config.today` on open.** The date/time opener reads
  `provideRiviniaDatepicker({ today })` before the zone/local clock, so the
  visible month and today marker are deterministic under SSR pinning. Added a
  regression test with a zone set (`today: 2026-03-09` opens March 2026).
- Deliberately out of 0.1.0: a time-zone picker, time bounds, a time-only
  picker, range/presets, typed date segments, date-pattern parsing, a Hijri
  grid, year-view virtualisation, and Firefox/WebKit/SSR proof.
- Verified in this session (2026-10-25):
  - **444/444 unit tests in 14 files** (up from 395/395 before the time work),
    including the 15 core time/zone cases, the 21 datetime UI cases, and the
    three datetime form APIs.
  - `ng build datepicker` (both entry points); tarball **8 files / 111.2 kB**,
    shasum `3bc37e8d8b67ee6c6cf6a9dee650ff93c48931fb`, SHA-256
    `98f244d5098d98f7a39f3bb00a3c0910c63842058d0edb573a5cfe40cf0147b5`.
    Dist FESM imports only `@angular/core` (core) and
    `@angular/core` + `@rivinia/datepicker` (UI); no `tslib` import;
    `@angular/forms` is a type-only peer import for `FormValueControl`.
  - Installed the tarball into the consumer playground, production build
    **357.63 kB raw / 86.65 kB transfer** (the demo now carries date, datetime,
    zones, DST presets and forms, so this is not comparable to D54's date-only
    figure).
  - Chromium against that production build, zero console errors:
    - four shared datetime formats rendered `25 Oct 2026, 15:30`,
      `25/10/2026, 15:30`, `Sunday, 25 October 2026, 03:30 pm` and
      `2026-10-25, 15:30:00`; editing the first to `16:45` left all triggers
      unchanged until `OK`, then all four changed; the calendar stayed mounted
      and the heading was unchanged while typing; Escape discarded.
    - date and datetime pickers share the one-panel registry (opening a
      datetime closed a date; one panel).
    - Reactive datetime showed `12 Oct 2026, 09:45` with touched/valid yes;
      `ngModel` showed `2026-10-20T09:45:00`; Signal Forms showed a valid,
      touched value on 15 Oct.
    - `Africa/Cairo` line `Africa/Cairo · EEST · GMT+3`; New York resolved
      `-240` at `2026-10-25T19:00:00.000Z`. The Cairo overlap offered
      `EEST GMT+3` / `EET GMT+2`, choosing the second resolved
      `ambiguous`, offset `120`, `2026-10-29T21:30:00.000Z`. The Cairo gap
      warned about 24 Apr 2026 01:30; `OK` reported `nonexistent`, offset
      `180`, `2026-04-23T22:30:00.000Z`; `Use 01:30` removed the warning and
      committed `unique` with the same instant.
    - widths, measured: default field **240px**, panel **308px**, time row
      **290px** with no overflow (panel client/scroll 306/306); full-width
      field and panel **1211px**; at a **320px viewport** the panel was
      **304px** starting at x=16, the field 235px, and neither the panel nor
      the time row overflowed (302/302 and 286/286). The first narrow run
      exposed a **demo-only** 21rem grid track; the demo was fixed, not the
      library.
    - Arabic: `dir=rtl`, Arabic digits/names, time fields computed `ltr`,
      meridiem `ص`/`م`, `OK` = `موافق`; the panel opened **above** the field
      with a **4px** gap, start-aligned, inside the viewport, 308px wide.
    - Dark: scheme `dark`; field, panel and time input `rgb(24,24,27)`, text
      `rgb(244,244,245)`, selected day `rgb(139,139,240)`.
    - axe-core on `#datetime`, `#zones` and `#datetime-forms`: **zero**
      violations; the old date-only playground pass also stayed green.
  - The package is **not published**. Version remains **0.1.0** (the name is
    new; the registry returns 404). Firefox/WebKit and SSR were not run and are
    not claimed. npm auth is currently absent on npmjs (the default registry is
    the mirror), so a publish requires a login and explicit user confirmation.

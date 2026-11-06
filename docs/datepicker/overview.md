# Overview

A concise map of the package capabilities and their boundaries.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Quick features

- **Headless first.** The calendar is a service; the components only render it.
- **Gregorian, by contract.** The grid is built with integer `{year, month, day}`
  arithmetic. The time layer is civil too: `{ hour, minute, second }` and
  `{ date, time }` never carry an implicit zone. `Date` appears only at the
  explicit bridges — reading the browser's clock, turning a civil value into an
  epoch for `Intl`, and formatting a reference instant.
- **Date + time in one panel.** `<rv-datetimepicker>` adds a time row **inside**
  the same panel; the calendar is never unmounted while the time is edited, and
  the time is a draft until `OK` (Escape discards it). A clock button opens a
  pointer-friendly hour/minute/second tray over the day grid — the panel keeps
  its width and height.
- **Time zones and DST, as data.** A civil `{ date, time }` plus an optional
  IANA zone **or fixed UTC offset** (`+03:00`); `resolveWallTime()` tells you
  whether the wall time is unique, occurs twice, or does not exist — with both
  alternatives and their offsets. No DST table is bundled: the runtime's ICU is
  the authority.
- **Arabic and English, both directions.** Week start comes from CLDR
  (`Intl.Locale.getWeekInfo()`), month and weekday names and the digits come
  from `Intl`, and the horizontal arrows follow the reading direction. The time
  fields keep a numeric LTR order (`09:30`) inside an RTL field.
- **One format input per half, two modes each.** A style keyword (`short`,
  `medium`, `long`, `full`) formats a date through `Intl.DateTimeFormat`; a
  date-only pattern (`dd/MM/yyyy`, `MM-dd-yy`, …) formats through a small token
  formatter. `timeFormat` is separate and accepts `short`, `medium`, or a time
  pattern (`HH:mm`, `hh:mm a`, `HH:mm:ss`).
- **Form-ready.** Implements the documented Angular 22 `FormValueControl`
  contract (`value` is a `model()`), so Signal Forms, Reactive Forms and
  `ngModel` all bind it without a custom accessor.
- **Three views.** Day, month and year, each with a roving tabindex.
- **Non-modal popover panel.** In the browser's top layer where available
  (`popover` + CSS anchor positioning), with an absolutely-positioned fallback.
  It fades out in 100ms and is inert during the exit; `prefers-reduced-motion`
  closes it instantly.
- **One panel at a time.** Opening a second picker closes the first, whether it
  was opened by mouse or by keyboard — two pickers side by side never look like
  one control. The outgoing panel skips its exit animation when another picker
  takes over, so there is never a moment with two live panels.
- **Clearable on request.** `[clearable]` adds a labeled clear button that
  publishes `null`, marks the field touched and returns focus to the trigger.
- **Themable end to end.** One global token layer (`@rivinia/theme`) or
  per-component tokens — see [Theming](theming.md).
- **Light, dark, or the page's choice.** `theme="light" | "dark" | "auto"` pins
  the colour scheme per picker; the built-in palette is written with
  `light-dark()`. No forced colour scheme, ever.

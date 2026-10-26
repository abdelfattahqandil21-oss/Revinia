# @rivinia/datepicker

[![npm version](https://img.shields.io/npm/v/@rivinia/datepicker.svg)](https://www.npmjs.com/package/@rivinia/datepicker)
[![license](https://img.shields.io/npm/l/@rivinia/datepicker.svg)](https://www.npmjs.com/package/@rivinia/datepicker)

Headless Gregorian calendar behaviour for Angular 22+: integer date math, a
locale-aware month grid, keyboard intents and RTL as a first-class rule — no
DOM, no styling. Rendering lives in `@rivinia/datepicker/ui` or in your own UI.

- Package version: **0.1.0**
- Requires: **Angular `^22.0.0`** (`@angular/core`, and `@angular/forms` for the
  `FormValueControl` type that the component implements).
- Entry points: `@rivinia/datepicker` (headless) and `@rivinia/datepicker/ui`
  (the calendar and the picker).
- Side effects: **none** (`sideEffects: false`).

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
  per-component tokens — see [Theming](#theming).
- **Light, dark, or the page's choice.** `theme="light" | "dark" | "auto"` pins
  the colour scheme per picker; the built-in palette is written with
  `light-dark()`. No forced colour scheme, ever.

## Install

```bash
npm install @rivinia/datepicker
```

or

```bash
pnpm add @rivinia/datepicker
```

or

```bash
yarn add @rivinia/datepicker
```

or

```bash
bun add @rivinia/datepicker
```

The optional theme layer, if you want the shared token set:

```bash
npm install @rivinia/theme
```

## Imports

Two entry points. The components live only in the UI entry point; the service,
the date math and the formatters live in the headless one.

| Symbol                                                          | `@rivinia/datepicker` | `@rivinia/datepicker/ui` |
| --------------------------------------------------------------- | :-------------------: | :----------------------: |
| `RiviniaDatepickerComponent` (`<rv-datepicker>`)                 |           —           |            ✅            |
| `RiviniaDatetimepickerComponent` (`<rv-datetimepicker>`)         |           —           |            ✅            |
| `RiviniaTimeRowComponent` (`<rv-time-row>`)                      |           —           |            ✅            |
| `RiviniaCalendarComponent` (`<rv-calendar>`)                     |           —           |            ✅            |
| `RiviniaCalendar` (the calendar service)                         |           ✅          |            —             |
| `buildMonth`, `resolveCalendarKey`                               |           ✅          |            —             |
| `formatDate`, `formatWithPattern`, `parseDatePattern`            |           ✅          |            —             |
| `formatTime`, `formatDateTime`, `formatTimeWithPattern`          |           ✅          |            —             |
| `resolveWallTime`, `wallTimeInTimeZone`, `isValidTimeZone`, …    |           ✅          |            —             |
| the date math (`addDays`, `toIso`, `parseDate`, `isSameDay`, …)  |           ✅          |            —             |
| the time math (`addMinutes`, `parseTime`, `compareDateTime`, …)  |           ✅          |            —             |
| `provideRiviniaDatepicker`, `injectRiviniaDatepicker`            |           ✅          |            —             |
| `RiviniaDatepickerTheme`, `DATEPICKER_THEMES`                    |           ✅          |            —             |
| `RiviniaDate`, `RiviniaDateFormat`, `RiviniaDatepickerLabels`, … |           ✅          |            —             |
| `RiviniaTime`, `RiviniaDateTime`, `RiviniaTimeFormat`, `RiviniaTimeZone*` |     ✅          |            —             |

```ts
// Ready-made UI
import { RiviniaDatepickerComponent } from '@rivinia/datepicker/ui';

// Headless core
import { RiviniaCalendar, buildMonth, type RiviniaDate } from '@rivinia/datepicker';
```

Importing `RiviniaDatepickerComponent` from `@rivinia/datepicker` is a compile
error.

## Quick start

```ts
// src/app/flight-date.component.ts
import { Component, signal } from '@angular/core';
import { RiviniaDatepickerComponent } from '@rivinia/datepicker/ui';
import type { RiviniaDate } from '@rivinia/datepicker';

@Component({
  selector: 'app-flight-date',
  imports: [RiviniaDatepickerComponent],
  templateUrl: './flight-date.component.html',
})
export class FlightDateComponent {
  readonly departure = signal<RiviniaDate | null>(null);
}
```

```html
<!-- src/app/flight-date.component.html -->
<rv-datepicker
  [(value)]="departure"
  locale="en-GB"
  format="dd/MM/yyyy"
  [min]="{ year: 2026, month: 1, day: 1 }"
  [max]="{ year: 2026, month: 12, day: 31 }"
/>
```

The trigger shows the formatted date; the panel opens under it, focuses the
selected day (or today), and closes as soon as a day is picked.

For a date **and** a time, use the sibling component — same field, same panel,
plus a time row:

```ts
import { Component, signal } from '@angular/core';
import { RiviniaDatetimepickerComponent } from '@rivinia/datepicker/ui';
import type { RiviniaDateTime, RiviniaDateTimeResolution } from '@rivinia/datepicker';

@Component({
  selector: 'app-appointment',
  imports: [RiviniaDatetimepickerComponent],
  template: `
    <rv-datetimepicker
      [(value)]="appointment"
      label="Appointment"
      locale="en-GB"
      format="dd/MM/yyyy"
      timeFormat="HH:mm"
      timeZone="Europe/London"
      (resolved)="onResolved($event)"
    />
  `,
})
export class AppointmentComponent {
  readonly appointment = signal<RiviniaDateTime | null>(null);

  onResolved(event: RiviniaDateTimeResolution): void {
    // event.value is the civil wall time; event.resolution.instant is the
    // exact epoch in event.timeZone, with the DST rule already applied.
    console.log(event.resolution.instant, event.resolution.kind);
  }
}
```

The value stays civil (`{ date, time }`); the `timeZone` tells the picker which
zone to display and validate against, and the `resolved` output carries the
instant on commit. See [Date + time](#date--time) and
[Time zones and DST](#time-zones-and-dst).

## Formatting

The `format` input accepts either a **style** or a **pattern**. One input, two
modes, and the mode is detected from the value.

### Styles

`short`, `medium` (the default), `long` and `full` are passed to
`Intl.DateTimeFormat` as a `dateStyle` — **date only**, never a time.

```html
<rv-datepicker format="short" />  <!-- 10/25/26 (en-US), ٢٥‏/١٠‏/٢٠٢٦ (ar-EG) -->
<rv-datepicker format="medium" /> <!-- Oct 25, 2026 / ٢٥‏/١٠‏/٢٠٢٦ -->
<rv-datepicker format="long" />   <!-- October 25, 2026 / ٢٥ أكتوبر ٢٠٢٦ -->
<rv-datepicker format="full" />   <!-- Sunday, October 25, 2026 / الأحد، ٢٥ أكتوبر ٢٠٢٦ -->
```

Formatters are cached per locale and options, so a 42-cell grid does not
construct `Intl.DateTimeFormat` objects on every render.

### Patterns

A pattern is a date-only string built from these tokens. **Case is ignored;
the width is the number of letters.**

| Token      | Meaning                                   | Example (25 October 2026) |
| ---------- | ----------------------------------------- | ------------------------- |
| `d`        | day, no padding                           | `25`                      |
| `dd`       | day, two digits                           | `25`                      |
| `M`, `mm`  | month, no padding / two digits            | `10`                      |
| `MMM`      | abbreviated month name                    | `Oct`                     |
| `MMMM`     | full month name                           | `October`                 |
| `yy`       | year, two digits                          | `26`                      |
| `yyyy`     | year, four digits                         | `2026`                    |
| `EEEE`     | weekday, full name                        | `Sunday`                  |

```html
<rv-datepicker format="MM-dd-yyyy" />  <!-- 10-25-2026 -->
<rv-datepicker format="MM-dd-yy" />    <!-- 10-25-26 -->
<rv-datepicker format="dd-mm-yy" />    <!-- 25-10-26 -->
<rv-datepicker format="dd/mm/yyyy" />  <!-- 25/10/2026 -->
<rv-datepicker format="dd MMMM yyyy" /><!-- 25 October 2026 -->
```

- Month and weekday **names and digits still come from the locale**: the same
  `dd MMMM yyyy` renders `25 أكتوبر 2026` in `ar-EG`.
- `''` is an escaped quote (e.g. `dd ''of'' MMMM`).
- Non-ASCII letters are literals, so an Arabic pattern never swallows a word.
- A **time** token (`h`, `H`, `k`, `K`, `s`, `S`, `a`, `A`, `X`, `Z`, `z`,
  `O`, `v`, `V`, `b`, `B`) throws a descriptive error: a date picker has no
  time, and silently dropping it would be a lie. `ddd` also throws — use
  `EEEE`.

### Time styles and patterns

`timeFormat` is independent from `format`. The same two modes apply:

```html
<rv-datetimepicker timeFormat="short" />   <!-- 15:30 (en-GB), 3:30 PM (en-US) -->
<rv-datetimepicker timeFormat="medium" />  <!-- 15:30:00 / 3:30:00 PM -->
<rv-datetimepicker timeFormat="HH:mm" />
<rv-datetimepicker timeFormat="hh:mm a" />
<rv-datetimepicker timeFormat="HH:mm:ss" />
```

Time styles are `short` (hour and minute) and `medium` (adds seconds). The
locale's own clock is used unless `hour12` says otherwise: `en-GB` is 24-hour,
`en-US` and `ar-EG` are 12-hour, and the day period is the locale's (`PM`, `م`).

A time pattern uses these tokens. Unlike the date pattern language, **case is
significant** here, because `h` and `H` mean different clocks:

| Token    | Meaning                              | Example (`15:30:05`) |
| -------- | ------------------------------------ | -------------------- |
| `H`      | hour, 0–23, no padding               | `15`                 |
| `HH`     | hour, 0–23, two digits               | `15`                 |
| `h`      | hour, 1–12, no padding               | `3`                  |
| `hh`     | hour, 1–12, two digits               | `03`                 |
| `m`/`mm` | minute, no padding / two digits      | `30`                 |
| `s`/`ss` | second, no padding / two digits      | `5` / `05`           |
| `a`      | the locale's day period              | `PM` / `م`           |

- Digits come from the locale: `HH:mm` in `ar-EG` is `١٥:٣٠`.
- `''` is an escaped quote; non-ASCII letters are literals.
- Mixing a 24-hour token with a 12-hour token or `a` (`HH:mm a`) throws, because
  the result would be ambiguous.
- `M`, `S`, `A`, `k`, `K`, the timezone letters and the date letters throw with
  a message. In particular `HH:MM` says *use `m` for minutes* — in the date
  pattern language `M` is the month, so guessing would be worse than an error.
- `formatTime(locale, time, format, { hour12? })`,
  `formatTimeWithPattern(locale, time, pattern)` and `parseTimePattern()` are
  exported for your own templates and tests.

`formatDateTime(locale, value, dateFormat, timeFormat, { hour12? })` joins the
two halves. When **both** are style keywords it uses one combined
`Intl.DateTimeFormat({ dateStyle, timeStyle })`, which is the only way to get
ICU's locale-specific separator and bidi marks; otherwise it formats each half
and joins with the locale's comma (Arabic uses ` في `).

### Why not `DatePipe`

Angular's `DatePipe` is a poor fit for a date-only field:

- its `short`, `medium`, `long` and `full` presets all include **time**;
- its pattern letters include time, so `dd/MM/yyyy` style patterns become
  ambiguous;
- it does not produce Arabic-Indic digits, and its bidi marks vary by locale.

So the package formats with `Intl` for styles and with its own per-token
formatter for patterns. `formatDate(locale, date, format)` exposes the same
behaviour to your own templates.

## API

### `<rv-datepicker>`

| Input         | Type                                             | Default        | Notes                                                                 |
| ------------- | ------------------------------------------------ | -------------- | --------------------------------------------------------------------- |
| `value`       | `RiviniaDate \| null`                            | config         | Two-way: `[(value)]`. Starts at `provideRiviniaDatepicker({ selected })`. |
| `locale`      | `string`                                         | config, `en-US`| Any BCP-47 tag. Digits, names, week start and direction follow it.    |
| `format`      | `RiviniaDateFormat`                              | `'medium'`     | A style or a date-only pattern.                                      |
| `firstDay`    | `RiviniaWeekday` (`0`–`6`)                       | CLDR           | Overrides the locale's first day of the week.                        |
| `min` / `max` | `RiviniaDate`                                    | config         | Bounds. A bound day is focusable but cannot be picked.               |
| `labels`      | `Partial<RiviniaDatepickerLabels>`               | locale         | Per-instance label overrides (`chooseDate`, `previousMonth`, …).     |
| `disabled`    | `boolean`                                        | `false`        | A form binds this automatically when the control is disabled.        |
| `placeholder` | `string`                                         | `labels.chooseDate` | Trigger text when there is no value.                            |
| `label`       | `string`                                         | —              | The field name ("Departure"). Becomes the trigger's accessible name: `Departure: Oct 25, 2026`. |
| `theme`       | `'auto' \| 'light' \| 'dark'`                    | `'auto'` (config) | The colour scheme of this picker. `auto` inherits the page's `color-scheme`; `light`/`dark` pin it. Mirrored on the host as `data-theme`. |
| `clearable`   | `boolean`                                        | `false` (config) | Shows a clear button while a value is set. Hidden when disabled.   |

| Output        | Payload                | When                                                              |
| ------------- | ---------------------- | ----------------------------------------------------------------- |
| `valueChange` | `RiviniaDate \| null`  | The value really changed (a pick, `value.set()` or the clear button). A form write updates the model **without** emitting. |
| `touch`       | `void`                 | The interaction finished: the panel closed, the clear button was pressed, or focus left the host. |

Method: `focus(options?)` — focuses the trigger (the `FormUiControl.focus`
hook).

### `<rv-datetimepicker>`

The date picker's API, plus the time half. The value is a `RiviniaDateTime`
(`{ date, time }`), `min`/`max` are datetimes (only the date part bounds the
grid), and the panel contains the same `<rv-calendar>` plus an
`<rv-time-row>`.

| Input          | Type                                      | Default        | Notes |
| -------------- | ----------------------------------------- | -------------- | ----- |
| `value`        | `RiviniaDateTime \| null`                 | `null`         | Two-way: `[(value)]`. Civil, with no zone. |
| `locale`       | `string`                                  | config, `en-US`| Same locale rules as the date picker. |
| `format`       | `RiviniaDateFormat`                       | `'medium'`     | The **date** half only; time tokens still throw. |
| `timeFormat`   | `RiviniaTimeFormat`                        | `'short'`      | `short`, `medium`, or a time pattern. |
| `showSeconds`  | `boolean`                                 | `false` (config) | Adds the seconds spinbutton. The value always carries seconds. |
| `minuteStep`   | `number`                                  | `1` (config)   | Step for `PageUp`/`PageDown` on minutes/seconds; arrows stay ±1. |
| `hour12`       | `boolean \| 'auto'`                       | `'auto'` (config) | `'auto'` follows the locale's clock. |
| `timeZone`     | `string`                                  | config, unset  | An IANA zone or fixed UTC offset (`+03:00`) used for the offset, DST checks and "today". Not stored in the value. |
| `firstDay`     | `RiviniaWeekday` (`0`–`6`)                | CLDR           | Forwarded to the calendar. |
| `min` / `max`  | `RiviniaDateTime`                         | config         | Bounds. The grid uses their `date`; the time half is not restricted. |
| `labels`       | `Partial<RiviniaDatepickerLabels>`        | locale         | Includes the time labels (`chooseTime`, `hour`, `minute`, `ok`, `now`, `dstGap`, …). |
| `disabled`     | `boolean`                                 | `false`        | A form binds this automatically. |
| `placeholder`  | `string`                                  | `labels.chooseDateTime` | Trigger text when empty. |
| `label`        | `string`                                  | —              | Field name; joins the trigger and clear-button accessible names. |
| `theme`        | `'auto' \| 'light' \| 'dark'`             | `'auto'` (config) | Same as the date picker. |
| `clearable`    | `boolean`                                 | `false` (config) | Clear button while a value is set. |

| Output        | Payload                        | When |
| ------------- | ------------------------------ | ---- |
| `valueChange` | `RiviniaDateTime \| null`      | A committed `OK`, `value.set()`, or the clear button. A form write does not echo. |
| `touch`       | `void`                         | The interaction finished: the panel closed, the clear button was pressed, or focus left the host. |
| `resolved`    | `RiviniaDateTimeResolution`    | On commit **only when a valid `timeZone` is set**. Carries `{ value, timeZone, resolution }`; `resolution.instant` is the epoch, `kind` is `unique`, `ambiguous` or `nonexistent`. |

Methods: `focus(options?)` (trigger) and `closeForAnotherPanel()` (the panel
coordination hook; not needed by normal consumers).

The time is a **draft** until `OK`: picking a day or editing a time leaves
`value` untouched, and Escape or an outside click discards the draft. This is
the same rule Ant Design calls `needConfirm`; a date + time is incomplete until
the time is confirmed.

### `<rv-time-row>`

The row is exported so a custom panel can compose the same controls. The
component is controlled: it never keeps a date or a zone.

| Input         | Type                       | Notes |
| ------------- | -------------------------- | ----- |
| `value`       | `RiviniaTime`              | **Required.** |
| `locale`      | `string`                   | **Required.** Digits and day periods. |
| `labels`      | `RiviniaDatepickerLabels`  | **Required.** The full label set; `chooseTime` is optional and falls back to the row label. |
| `hour12`      | `boolean \| 'auto'`        | Default `'auto'`. |
| `showSeconds` | `boolean`                  | Default `false`. |
| `minuteStep`  | `number`                   | Default `1`; also spaces the minute/second tray options. |
| `disabled`    | `boolean`                  | Default `false`. |

Outputs: `valueChange` (`RiviniaTime`), `commit` (Enter or `OK`), `now`
(the `Now` button). The row owns the clock button and the tray; they are part
of the same component, not separate controls a consumer must wire.

### Configuration

```ts
provideRiviniaDatepicker({
  locale: 'ar-EG',
  format: 'dd MMMM yyyy',
  firstDay: 6,
  theme: 'auto',       // or 'light' / 'dark'
  clearable: true,
  selected: null,
  min: undefined,
  max: undefined,
  // The time half (used by rv-datetimepicker; harmless for rv-datepicker)
  timeFormat: 'short', // or 'HH:mm', 'hh:mm a', …
  showSeconds: false,
  minuteStep: 1,
  hour12: 'auto',
  timeZone: 'Africa/Cairo',
});
```

Every input above wins over the configuration for that instance; an unbound
input leaves the configured value in place.

### Labelling the field

Put the visible label **next to** the picker and pass its text to `label`:

```html
<div class="field">
  <span id="departure-label">Departure</span>
  <rv-datepicker label="Departure" [(value)]="departure" />
</div>
```

Do not wrap the picker in a `<label>`: the browser forwards every click inside a
label to its control, so a click on a day would also click the trigger and
re-open the panel. The panel cancels that forwarding (measured in Chrome), but
a sibling label is the markup that does not need the workaround.

### The clear button

`[clearable]="true"` (or `provideRiviniaDatepicker({ clearable: true })`) adds a
× button inside the field, next to the trigger:

```html
<rv-datepicker label="Departure" [clearable]="true" [(value)]="departure" />
```

- It exists **only while a value is set**, and disappears on a disabled picker —
  a required date must not look optional, which is why `clearable` is opt-in.
- Pressing it sets the value to `null`, emits `valueChange(null)`, marks the
  control touched, closes an open panel, and returns focus to the trigger (the
  button itself disappears with the value).
- Its accessible name includes the field name: `Departure: Clear date`, or
  `المغادرة: مسح التاريخ`, so a screen reader user knows which field is cleared.
- `rv-datetimepicker` uses the same button with `clearDateTime`:
  `Appointment: Clear date and time` / `الموعد: مسح التاريخ والوقت`.

### Several pickers on one page

Each `<rv-datepicker>` provides its **own** calendar state, so two adjacent
pickers never share a focused day, a month, or a value. Opening one closes the
other — the coordination is a root service (`DatepickerPanelRegistry`), so it
works for keyboard activation too, which fires no pointer event. Clicking
anywhere outside closes without stealing focus; Escape closes and returns focus
to the trigger. `<rv-datetimepicker>` uses the same registry, so a date picker
and a datetime picker on one page also never leave two panels open.

### `<rv-calendar>`

The rendering half, usable without the trigger.

| Input       | Type              | Notes                                                      |
| ----------- | ----------------- | ---------------------------------------------------------- |
| `calendar`  | `RiviniaCalendar` | **Required.** The state to render.                          |
| `headingId` | `string`          | Id for the heading, so a host dialog can label itself by it.|
| `autofocus` | `boolean`         | Focus the active cell on first render.                      |

| Output     | Payload       | When                              |
| ---------- | ------------- | --------------------------------- |
| `picked`   | `RiviniaDate` | The user committed a day.         |
| `dismissed`| `void`        | The user pressed Escape.          |

## Headless usage

```ts
import { Component, computed, inject } from '@angular/core';
import { RiviniaCalendar, buildMonth, resolveCalendarKey } from '@rivinia/datepicker';

@Component({ /* … */ })
export class MyDateField {
  readonly calendar = inject(RiviniaCalendar);
  readonly grid = computed(() => buildMonth({ /* … */ }));

  onKeydown(event: KeyboardEvent): void {
    const intent = resolveCalendarKey({ key: event.key, direction: 'rtl' });
    if (intent) this.calendar.applyAction(intent);
  }
}
```

`RiviniaCalendar` exposes `focused()`, `selected()`, `view()` (`day` | `month` |
`year`), `locale()`, `firstDay()`, `weekdays()`, `monthGrid()`, `months()`,
`years()`, `heading()`, and the methods `focus`, `setSelected`, `setLocale`,
`setFirstDay`, `setBounds`, `setLabels`, `setView`, `chooseMonth`, `chooseYear`,
`applyAction`.

`provideRiviniaDatepicker({ … })` and the per-instance inputs both feed it; a
picker always provides its **own** `RiviniaCalendar`, so two pickers never
share a focused day.

The time and zone halves are headless too, and they are the part to reuse when
the value crossing your API is an **instant**:

```ts
import {
  formatDateTime,
  nowInTimeZone,
  resolveWallTime,
  wallTimeInTimeZone,
} from '@rivinia/datepicker';

const departure = { date: { year: 2026, month: 10, day: 25 }, time: { hour: 15, minute: 30, second: 0 } };

// Civil → instant, with the DST rule made explicit.
const resolved = resolveWallTime(departure, 'Africa/Cairo');
// { kind: 'unique', instant: 1792…, offsetMinutes: 180, alternatives: [...] }

// Instant → civil, for display.
const shown = wallTimeInTimeZone('Africa/Cairo', resolved!.instant);
// { date: { year: 2026, month: 10, day: 25 }, time: { hour: 15, minute: 30, second: 0 } }

// The browser's "now" as read on that zone's wall.
const todayThere = nowInTimeZone('Africa/Cairo');

// One display string, with the locale's separator and digits.
const label = formatDateTime('ar-EG', departure, 'long', 'short');
// ٢٥ أكتوبر ٢٠٢٦ في ٣:٣٠ م
```

`resolveWallTime(value, zone, disambiguation?)` returns `null` for an invalid
zone or an invalid civil value; otherwise:

- `kind: 'unique'` — one candidate;
- `kind: 'ambiguous'` — the clock fell back; `alternatives` has two entries
  sorted by instant, and the default rule picks the **earlier** one;
- `kind: 'nonexistent'` — the clock jumped forward; `alternatives[0]` is the
  real wall time before the gap, `alternatives[1]` after it, and `dateTime` is
  the suggested wall time (the default `compatible` rule takes the later one).

`disambiguation` is `'compatible'` (default), `'earlier'`, `'later'`, or
`'reject'` (throws a `RangeError` instead of guessing). Every alternative has
`instant` (epoch ms), `offsetMinutes` (east of UTC) and the actual `dateTime`.

## Forms

`value` is a `model()`, which is exactly the required member of Angular 22's
`FormValueControl`. So all three forms APIs work with no accessor:

```html
<!-- Reactive Forms -->
<rv-datepicker [formControl]="departure" />

<!-- Template-driven -->
<rv-datepicker [(ngModel)]="departure" />

<!-- Signal Forms -->
<rv-datepicker [formField]="form.departure" />
```

The datetime picker is the same contract, with a `RiviniaDateTime` value:

```html
<rv-datetimepicker [formControl]="appointment" />
<rv-datetimepicker [(ngModel)]="appointment" />
<rv-datetimepicker [formField]="form.appointment" />
```

A form writes the whole `{ date, time }` value at once. A form writing while
the panel is open updates the calendar and the time row; a day click or a time
edit is still a draft until `OK`, so the form never sees half a value. The
`resolved` output is the place to turn a valid `timeZone` into an instant for
your API — it is not a form value.

- `valueChange` is the model's output. It fires when the value really changed;
  a form writing the value in does **not** echo back.
- `touch` marks the control touched. It fires when the panel closes and when
  focus leaves the whole control, so a pick (which returns focus to the trigger)
  still counts as touched.
- `disabled` is bound by the form layer when the control is disabled.

> **Template-driven validation.** Angular 22 applies `NG_VALIDATORS` to a
> classic `ControlValueAccessor`, not to a value-model custom control. With
> `[(ngModel)]`, a `required` attribute on the picker therefore does **not**
> mark the `NgModel` invalid — verified in Angular 22.2.2: the picker's
> `NgModel.errors` stays `null` while a plain `<input required>` in the same
> form reports `{ required: true }`. Reactive Forms (`[formControl]`) and
> Signal Forms (`[formField]`) validate normally. For template-driven forms,
> check the value in the submit handler, or use a reactive control whose
> `FormControl` carries the validators.

## Keyboard

| Key                     | Day view                        | Month view        | Year view         |
| ----------------------- | ------------------------------- | ----------------- | ----------------- |
| `←` / `→`               | previous / next day **(RTL: mirrored)** | previous / next month | previous / next year |
| `↑` / `↓`               | previous / next week            | previous / next row (3 months) | previous / next row (3 years) |
| `Home` / `End`          | first / last day of the week    | first / last month of the row | first / last year of the row |
| `PageUp` / `PageDown`   | previous / next month           | previous / next year | ±12 years         |
| `Shift+PageUp/Down`     | previous / next year            | ±12 years         | ±120 years        |
| `Enter` / `Space`       | pick the focused day            | open that month (day view) | open that year (month view) |
| `Escape`                | close the panel, restore focus  | close the panel   | close the panel   |

The heading is a button: `Tab` to it and press `Enter` to go from the day view
to the months, and from the months to the years.

`Shift+Arrow` is deliberately unhandled: it is the gesture for range selection,
which this version does not offer — staying silent is better than moving focus
as if Shift meant nothing.

Disabled days stay **focusable** (`aria-disabled`, not the `disabled`
attribute), and `Enter` on one does nothing.

Time spinbuttons follow the W3C APG spinbutton pattern:

| Key                 | On a time spinbutton |
| ------------------- | -------------------- |
| `↑` / `↓`           | ±1 unit (hour, minute or second) |
| `PageUp` / `PageDown` | ±`minuteStep` on minute/second; ±1 on hour |
| `Home` / `End`      | first / last value (hour `00`/`23`, minute/second `00`/`59`) |
| digits              | direct entry; the value is clamped, and the field pads on blur |
| `Enter`             | commits the draft and closes the panel |
| `Escape`            | closes and discards the draft |
| `Tab`               | next control; the `OK` and `Now` buttons are real tab stops |

The AM/PM control is a two-button `aria-pressed` group, not a listbox. The
`Now` button fills the draft with the current wall time in the selected zone;
it does not commit.

## RTL

The grid is rendered once and the **reading direction decides the horizontal
arrows**: in a right-to-left calendar the next day is drawn to the left, so
`ArrowLeft` moves **forward** and `ArrowRight` moves **back**. Vertical keys,
`Home`/`End` and the page keys are never mirrored.

Direction is read at keydown time from the nearest `[dir]` attribute (else the
computed `direction`), so switching the language at runtime works without
re-creating the component. The chevrons mirror themselves in CSS with
`:dir(rtl)`.

The time row keeps its **numeric fields** in LTR order (`09:30`), because a
clock is a number sequence, not a sentence; the day-period buttons, `Now` and
`OK` follow the page's direction around them. The digits themselves are still
the locale's (`٠٩:٣٠` in Arabic).

## Theming

### Light, dark, or the page's choice

`theme="dark"` pins the scheme for that picker; `theme="light"` pins the other;
`auto` (the default) declares **nothing**, so the picker follows whatever the
page already decided:

```css
:root { color-scheme: light dark; }               /* follow the OS */
html[data-theme='dark'] { color-scheme: dark; }    /* follow the app toggle */
```

```html
<rv-datepicker theme="dark" />
<rv-datepicker theme="light" />
```

The built-in palette is written with `light-dark()`, so the same rule covers
both schemes. `theme` also sets `color-scheme` on the host and mirrors the value
as `data-theme="dark"`, so a theme layer that maps `[data-theme='dark']` reaches
the picker too.

The picker **never declares a colour token on its own host**: every value is
read at the point of use as `var(--rv-datepicker-x, var(--rv-semantic,
light-dark(light, dark)))`. That is what makes an application's tokens win — a
declaration on the host would out-rank any ancestor value.

```html
<!-- no build step: one variable on :root themes every Rivinia component -->
<style>
  :root {
    --rv-bg: #0f172a;
    --rv-fg: #f1f5f9;
    --rv-border: #334155;
    --rv-accent: #38bdf8;
    --rv-radius: 0.25rem;
  }
</style>
```

Three levels, each beating the next:

1. a per-component token, e.g. `--rv-calendar-selected-bg`;
2. a semantic token from `@rivinia/theme`, e.g. `--rv-accent`, `--rv-bg`,
   `--rv-fg`, `--rv-muted`, `--rv-border`, `--rv-radius`, `--rv-shadow`;
3. the built-in `light-dark()` default.

Component tokens:

- **Field** — `--rv-datepicker-{width,gap,padding,font,font-size,bg,fg,border,radius,shadow,hover-bg,active-border,focus-ring,disabled-opacity,icon-fg}`
- **Clear button** — `--rv-datepicker-clear-hover-bg`
- **Panel** — `--rv-datepicker-panel-{width,max-width,padding,gap,bg,fg,border,radius,shadow}`, `--rv-datepicker-animation-duration`
- **Calendar** — `--rv-calendar-{width,font,font-size,fg,gap,grid-gap,header-gap,header-padding,nav-size,nav-radius,nav-hover-bg,heading-padding,heading-weight,heading-hover-bg,weekday-padding,weekday-fg,weekday-size,weekday-weight,day-size,day-radius,day-hover-bg,today-ring,selected-fg,selected-bg,selected-weight,disabled-opacity,focus-ring,options-gap,option-padding}`
- **Datetime field** — `--rv-datetimepicker-width`, `--rv-datetimepicker-panel-padding`
- **Time row** — `--rv-time-{row-gap,row-padding,border,fg,font-size,fields-gap,field-width,field-padding,input-fg,input-bg,input-border,input-radius,focus,disabled-opacity,separator,meridiem-padding,meridiem-fg,meridiem-active-fg,meridiem-active-bg,action-gap,action-padding,action-radius,now-fg,now-hover-bg,ok-fg,ok-bg,ok-border,ok-hover-bg}`
- **Time tray** — `--rv-time-{options-bg,options-border,options-radius,options-padding,options-gap,options-max-height,option-list-bg,option-list-border,option-list-radius,option-heading-fg,option-heading-gap,option-heading-size,option-fg,option-padding,option-size,option-hover-bg,option-selected-fg,toggle-size,toggle-bg,toggle-fg,toggle-hover-bg,toggle-active-fg,toggle-active-border}`
- **Zone line / warnings** — `--rv-datetimepicker-{zone-gap,zone-padding,zone-fg,zone-font-size,warning-gap,warning-margin,warning-padding,warning-fg,warning-bg,warning-border,warning-radius,warning-font-size,action-padding,action-fg,action-border,action-radius,offset-gap,offset-padding,offset-fg,offset-border,offset-radius,offset-active-fg}`

Class names are a stable override surface: `.rv-datepicker-field`,
`.rv-datepicker-trigger`, `.rv-datepicker-clear`, `.rv-datepicker-panel`,
`.rv-calendar`, `.rv-calendar-header`, `.rv-calendar-nav`,
`.rv-calendar-heading`, `.rv-calendar-grid`, `.rv-calendar-weekday`,
`.rv-calendar-day`, `.rv-calendar-option`, `.rv-datetimepicker-panel`,
`.rv-datetimepicker-zone`, `.rv-datetimepicker-warning`,
`.rv-datetimepicker-action`, `.rv-datetimepicker-offsets`,
`.rv-datetimepicker-offset`, `.rv-time-row`, `.rv-time-fields`,
`.rv-time-input`, `.rv-time-meridiem`, `.rv-time-meridiem-button`,
`.rv-time-toggle`, `.rv-time-options`, `.rv-time-option-column`,
`.rv-time-option-heading`, `.rv-time-option-list`, `.rv-time-option`,
`.rv-time-actions`, `.rv-time-now`, `.rv-time-ok`. State hooks: `data-open`,
`data-disabled`, `data-theme` (host), `data-date`, `aria-selected`,
`aria-current="date"`, `data-month`, `data-year`, `aria-pressed` (meridiem and
DST-offset choice), `aria-valuenow` (spinbuttons).

All sizes are **`rem`**, so the picker follows the user's text-size preference
and the application's root font size. Only hairlines (`1px`), focus rings
(`2px`) and the 16px icon box stay in `px`.

### Width

The field is **`11rem`** and capped by its parent: `--rv-datepicker-width`
changes it (`100%` fills the row, or set `inline-size` on the host). A parent
narrower than the field wins — the field never overflows its cell.

`<rv-datetimepicker>` uses **`15rem`** by default (`--rv-datetimepicker-width`)
to fit the time and often the zone offset, with the same parent cap. The time
row is `display: flex; flex-wrap: wrap` and every child can shrink; its natural
width is below the panel floor, so adding time never widens the panel beyond
the rule below. At the verified 320px viewport the row still fitted on one
line; if a larger text size or a narrower container forces it, it wraps in the
block direction (the panel grows taller, not wider).

The panel is **never narrower than the field** and never narrower than a
readable calendar:

- at least 19.25rem — 7 day cells of `2.5rem`, the gaps and the panel padding;
- otherwise it follows the field's width (`max(field, 19.25rem)`), capped by
  `--rv-datepicker-panel-max-width` (default `100vw - 1rem`);
- a field wider than the calendar keeps the day grid at `--rv-calendar-width`
  and centres it inside the panel, so the cells never stretch into rectangles.

Set `--rv-datepicker-panel-width` **together with** `--rv-calendar-day-size` if
you resize the cells; otherwise the panel grows and the grid stays centred.

## Accessibility

- The day view is a real `table[role="grid"]` with `th[scope="col"]` headers and
  one roving `tabindex="0"`; the day cell itself is the `gridcell` (no nested
  button hiding the tab stop).
- The focused day is labelled with its full date (`Sunday, October 25, 2026`,
  localized), today carries `aria-current="date"`, and a selected day carries
  `aria-selected="true"`.
- The panel is a non-modal `role="dialog"` labelled by the calendar heading.
  It does not trap focus, closes on Escape or an outside click, and returns
  focus to the trigger.
- The month and year views are 3 × 4 panels of buttons in a `role="group"`,
  labelled by the same heading; the focused month or year carries
  `aria-current="true"` (it is the one the next view opens on).
- The grid is announced with instructions (arrow keys, Enter, Escape) through a
  visually hidden paragraph.
- The trigger's accessible name carries the field name when `label` is set
  ("Departure: ٢٥/١٠/٢٠٢٦"), so a screen-reader user knows which date field the
  value belongs to.
- The clear button is a real `<button>` in the tab order, named after its field
  ("Departure: Clear date"). The field draws **one** focus ring around the
  trigger and the clear button, both in keyboard and pointer use.
- The time row is a named `role="group"`; each field is a `role="spinbutton"`
  with localized `aria-label`, `aria-valuenow`, `aria-valuemin/max` and an
  `aria-valuetext` ("30 minutes", "3 PM"). The AM/PM control is a two-button
  group with `aria-pressed`; the zone line uses `<bdi>` so an LTR IANA id cannot
  reorder an RTL sentence.
- The clock button that opens the tray exposes `aria-expanded` and
  `aria-controls`, and the tray is one labelled `role="listbox"` per unit with
  a `role="option"` per row and `aria-selected="true"` on the current value.
  Each row's accessible name starts with its visible text (`03, 3 PM`,
  `٠٥, ٥ دقائق`) so voice control can say what it sees (WCAG 2.5.3).
  Opening the tray moves focus to the selected row; `Escape` closes the tray
  first and returns focus to the clock button. The tray is not a second popup:
  it is part of the panel's own DOM, so it is announced in context.
- A DST gap or overlap is announced through a polite `role="status"`; an
  overlap offers one `aria-pressed` button per offset, and the chosen offset is
  the one emitted on commit. The warning text names the suggested wall time, so
  the choice is never only visual.
- Only one panel is open at a time, and an outside click closes without moving
  focus (the user's own click keeps its target).
- `prefers-reduced-motion` removes the panel's entrance **and** exit
  animations; the panel then closes immediately.

## Version 0.1.0 scope

Included: day/month/year views, single-date picking, Gregorian calendar,
locale week start, date styles and date patterns, clear action, one-panel
coordination, light/dark/auto theming, all three Angular form APIs, RTL.

Also included in 0.1.0: date + time in the same panel, time styles and time
patterns, locale digits and clocks, the APG spinbutton keyboard model, an
optional IANA time zone **or fixed UTC offset** with offset display, DST
gap/overlap reporting and an explicit disambiguation choice, the `resolved`
instant output, the pointer-friendly time tray, and enter/exit panel motion.

Deliberately **not** in this version (each is additive):

- a typed date input with segments (`dd/MM/yyyy` typed by hand) — the time row
  is typed, the date grid is not;
- range selection, presets, a time-only picker, and a separate timezone picker;
- time bounds in `min`/`max` (the grid uses the date half; a time outside a
  bound is not rejected);
- a Hijri (Umm al-Qura) grid — the formatting seam is documented in
  `DECISIONS.md`, the grid is not implemented;
- date/time pattern **parsing** (patterns format; they do not parse);
- virtualisation of the year view;
- a Temporal dependency. The resolver is `Intl`-only, so it needs no new
  engine feature; `Temporal` is an application option, not a package
  requirement.

## Date + time

`<rv-datetimepicker>` is the date picker plus a time row. It is a separate
component because the value type is different — `RiviniaDateTime`, not
`RiviniaDate` — and a union-typed model would push a narrowing check into every
consumer. The **panel parts are shared**: the same `<rv-calendar>` and the same
panel shell, with `<rv-time-row>` added below the grid.

### One panel, never a second step

```
┌────────────────────────────────────────────┐
│  ‹        October 2026        ›   [Today]  │  existing header
│  Mo Tu We Th Fr Sa Su                      │
│  …              day grid …                 │  existing grid — never unmounted
├────────────────────────────────────────────┤
│  [ 09 ] : [ 30 ]  [clock] [AM|PM] [Now] [OK]│  the time row
└────────────────────────────────────────────┘
```

The clock button opens a tray **over the day grid**, inside the same panel:

```
┌────────────────────────────────────────────┐
│  ‹        October 2026        ›   [Today]  │  header stays
│  Mo Tu We Th Fr Sa Su                      │  weekday row stays
│  ┌───────────┐ ┌───────────┐               │
│  │   Hour    │ │  Minute   │               │  the tray
│  │   13      │ │   00      │               │  (scrolls; never
│  │   14      │ │   05      │               │   grows the panel)
│  │  [15]     │ │   30      │               │
│  └───────────┘ └───────────┘               │
├────────────────────────────────────────────┤
│  [ 15 ] : [ 30 ]  [clock] [AM|PM] [Now] [OK]│
└────────────────────────────────────────────┘
```

- **One panel for both halves.** The same popover, anchor, border, shadow,
  width rules and tokens as the date picker. Time adds a row; it does not
  rebuild or replace the panel.
- **The day grid stays mounted** while the time row and the tray are used, so
  the visible month, the focused day and the selected date survive editing the
  time. The tray is an overlay, so opening it does **not** change the panel's
  block size.
- **Commit is explicit.** A day click updates a draft; `OK` commits date and
  time together and closes. Escape or an outside click discards the draft.
  (Ant Design calls this `needConfirm`; a date + time is incomplete until the
  time is confirmed, so closing on a day click would lose it.)
- **`Now`** fills the draft with the current wall time in the selected zone; it
  does not commit.
- **The 12/24h clock and the meridiem come from the locale**: `Intl`'s
  `hourCycle` and `formatToParts`, never a hardcoded "AM"/"PM". `hour12`
  overrides the locale. `en-GB` is 24-hour; `en-US` and `ar-EG` are 12-hour.

### Pointer-friendly time tray

Typing and the spinbutton keys are still first-class; the tray is the
pointer/touch path for the same draft.

- Press the clock button next to the time fields. It is a real button with
  `aria-expanded` and `aria-controls`; its name is `Choose time`
  (`اختر الوقت`), or the `chooseTime` label override.
- The tray has one `role="listbox"` per unit: hour, minute, and second only
  when `showSeconds` is on. Each list is labelled (`Hour`, `Minute`, …), each
  row is a `role="option"` with `aria-selected`, and every column opens
  scrolled to its selected value.
- Hours follow the clock: `12, 01 … 11` in 12-hour mode (the AM/PM choice is
  kept), `00 … 23` in 24-hour mode. Minute and second rows honour
  `minuteStep` (a typed off-step value such as `59` is still shown).
- Picking a row updates the **draft** and leaves the tray and the panel open;
  `OK` is still the only commit. A day cell, another field or an outside
  pointer closes the tray without closing the panel.
- The tray is inside the panel, not a second popup. Its lists are capped at
  `--rv-time-options-max-height` (default `10rem`) and scroll; the panel's
  width is unchanged. In RTL the columns stay in numeric hour → minute order,
  while the digits, labels and accessible names are Arabic.
- Keyboard: in a list, `↑`/`↓` move one row, `PageUp`/`PageDown` move five,
  `Home`/`End` jump to the ends, `Enter`/`Space` pick, and `Escape` closes the
  tray first (leaving the panel open) and returns focus to the clock button.
- The tray is in the normal tab order, directly after the clock button: the
  selected row of each column is the only row with `tabindex="0"` (the rest are
  `-1`), so `Tab` visits one row per column and then leaves the tray for the
  meridiem and the actions. Opening the tray focuses the selected row, and
  `Shift+Tab` from it returns to the clock button, then to the seconds/minute
  field. Tabbing or clicking out of the tray closes it without closing the
  panel or discarding the draft.

### The value

```ts
export interface RiviniaTime {
  readonly hour: number;   // 0–23
  readonly minute: number; // 0–59
  readonly second: number; // 0–59, always present
}

export interface RiviniaDateTime {
  readonly date: RiviniaDate;
  readonly time: RiviniaTime;
}
```

Seconds are always present even when `showSeconds` is false: dropping the field
would make `{ hour: 9, minute: 30 }` and `{ hour: 9, minute: 30, second: 0 }`
two incompatible shapes for the same fact. The row simply does not edit them.

### Formatting

```html
<rv-datetimepicker
  [(value)]="appointment"
  format="dd/MM/yyyy"
  timeFormat="HH:mm"
/>
<!-- 25/10/2026, 15:30 -->
```

- `format` is the **date** half and still rejects time tokens; `timeFormat` is
  the time half. See [Time styles and patterns](#time-styles-and-patterns).
- `timeFormat="short"` is hour + minute; `"medium"` adds seconds. A pattern
  such as `HH:mm`, `hh:mm a` or `HH:mm:ss` is also accepted.
- `showSeconds` controls the **row** (and the seconds spinbutton), not the
  value shape. If you display seconds with `timeFormat="medium"` but do not
  edit them, the value keeps whatever seconds it already carried; set
  `[showSeconds]="true"` for an end-to-end seconds UI.
- `minuteStep` changes `PageUp`/`PageDown` on minutes and seconds; arrow keys
  stay ±1, and typing is exact.
- `formatDateTime(locale, value, dateFormat, timeFormat, { hour12? })` is the
  exported formatter the trigger uses. When both halves are style keywords it
  uses one combined `Intl.DateTimeFormat`; otherwise it joins the halves with
  the locale's date-time connector (` في ` in Arabic, a comma elsewhere).

### Width

The datetime field defaults to **15rem** (`--rv-datetimepicker-width`) so it
fits the time and often the zone offset, with the same parent cap as the date
field. The panel keeps the date picker's floor of **19.25rem**, follows a wider
field, and is capped by `--rv-datepicker-panel-max-width` (`100vw - 1rem`).

The time row is `display: flex; flex-wrap: wrap; min-inline-size: 0`, and every
child can shrink. Its natural width is below the panel floor, so adding time
does not widen the panel; at the verified 320px viewport it still fitted on one
line. If a larger text size or a narrower container forces a wrap, the actions
move to a second line and the panel grows **in block size only**. The day grid
keeps `--rv-calendar-width` and stays centred.

### Keyboard

| Key                   | On a time spinbutton |
| --------------------- | -------------------- |
| `↑` / `↓`             | ±1 unit (hour, minute or second) |
| `PageUp` / `PageDown` | ±`minuteStep` on minute/second; ±1 on hour |
| `Home` / `End`        | first / last value |
| digits                | direct entry, clamped; pads on blur |
| `Enter`               | commit the draft and close |
| `Escape`              | discard the draft, close, restore focus |
| `Tab`                 | hour → minute → [second] → clock → tray rows → meridiem → Now → OK (the tray rows only while it is open) |

The full day-grid table is in [Keyboard](#keyboard). The time row is a named
`role="group"`; each unit is a `role="spinbutton"` with localized
`aria-valuenow`, `aria-valuemin/max` and `aria-valuetext`. The meridiem is a
two-button `aria-pressed` group.

### Why not the native input

The native `<input type="datetime-local">` was rejected for the reasons the
date half already rejected it:

- the value is always `YYYY-MM-DDTHH:mm`, while the **displayed** format is the
  operating system's choice — the page cannot pick the digit set, the order or
  12/24h;
- the UI is browser-owned, differs between desktop and mobile builds, and
  cannot carry this package's tokens or panel rules;
- it exposes no locale or time-zone control (MDN), and `size` does not apply.

A clock dial and two 60-option lists were rejected too: neither has an APG
pattern, a dial mirrors awkwardly in RTL, and 120 extra options at 12:59 are
worse than three spinbuttons.

## Time zones and DST

The value is **civil**: `{ date, time }` describes what the user read on the
wall, not an instant. A time zone is a separate, optional input on the picker
and a separate argument in the core. That separation is deliberate — storing an
instant loses the wall time the user chose, and storing only a wall time cannot
tell you which instant it meant during a DST overlap.

### In the picker

Set `timeZone` to an IANA id, or to a **fixed UTC offset** when the zone must
not follow DST:

```html
<rv-datetimepicker
  [(value)]="departure"
  timeZone="Africa/Cairo"
  (resolved)="save($event)"
/>

<!-- always GMT+3, in January and in July, with no DST rules -->
<rv-datetimepicker
  [(value)]="shift"
  timeZone="+03:00"
  (resolved)="save($event)"
/>
```

A fixed offset is written `+HH:MM` or `-HH:MM` (`+03:00`, `-05:30`, `+00:00`).
It is resolved by `Intl` like a zone: `resolveWallTime()` returns
`kind: 'unique'` for every wall time, the offset is the literal one, and there
is no gap or overlap. `GMT+3` is **not** accepted (that is a display name, not
an offset); `Etc/GMT-3` is the IANA zone with the same offset — note the POSIX
sign inversion. Use the fixed offset when the business rule is "3 hours ahead
of UTC", and an IANA zone when the rule is "Cairo's local time". There is no
end-user time-zone selector: the developer chooses the zone or offset in code.

- The trigger shows the zone's offset (e.g. `GMT+3`); the panel adds the IANA
  id as `<bdi>` and the zone name when `Intl` gives one.
- The picker validates the wall time on every draft change:
  - **unique** — one instant;
  - **overlap** (the clock fell back) — two offsets are offered as
    `aria-pressed` buttons; the chosen one is used on commit. The default is
    the **earlier** instant, matching `Temporal`'s `compatible` rule;
  - **gap** (the clock jumped forward) — a polite warning names the real wall
    time after the gap and offers a `Use …` button. Nothing is moved silently:
    the user must adopt the suggestion. `OK` on a gap keeps the civil value but
    `resolved` reports `kind: 'nonexistent'` with both sides;
  - **invalid zone** — a warning is shown, no `resolved` is emitted, and the
    picker still works as a civil date + time picker.
- `resolved` is emitted only on commit and only with a valid zone:
  `{ value, timeZone, resolution }`, where `resolution.instant` is epoch ms and
  `resolution.kind` is `unique`, `ambiguous` or `nonexistent`.
- The picker's "today" follows the zone when one is set. If you pin
  `provideRiviniaDatepicker({ today })` for SSR determinism, that pin wins over
  the zone's clock.

### In the headless core

| Function | Answer |
| --- | --- |
| `resolveWallTime(value, timeZone, disambiguation?)` | The instant(s), offset(s) and kind for a civil wall time. `null` for an invalid zone/value. |
| `wallTimeInTimeZone(timeZone, instant)` | The civil wall time at an epoch. |
| `getTimeZoneOffsetMinutes(timeZone, instant)` | Offset east of UTC in minutes, or `null`. |
| `nowInTimeZone(timeZone)` / `todayInTimeZone(timeZone)` | The zone's current wall time / date. |
| `isValidTimeZone(id)` / `listTimeZones()` | Validate an IANA id or a fixed offset (`+03:00`) / enumerate the runtime's IANA zones (fixed offsets are not listed). |
| `formatTimeZoneName(locale, zone, instant, style?)` | `short` (`EEST`), `shortOffset` (`GMT+3`), `long`, `longOffset`. |

`disambiguation` is `'compatible'` (default), `'earlier'`, `'later'` or
`'reject'`. `'reject'` throws a `RangeError` instead of guessing — for an
application that must never move a value silently.

### Recipes

**Civil + zone → instant.** Resolve once, store the instant (or its ISO
string), and keep the civil value only for display/editing:

```ts
const resolved = resolveWallTime(departure, 'Africa/Cairo');
if (!resolved) throw new Error('Invalid date or zone');
await api.save({ at: new Date(resolved.instant).toISOString(), kind: resolved.kind });
```

**Instant → civil, for display.** Never read `Date` getters; they use the
machine's zone:

```ts
const shown = wallTimeInTimeZone('Africa/Cairo', instant)!;
formatDateTime('en-GB', shown, 'medium', 'short'); // 25 Oct 2026, 15:30
```

**Overlap.** The UI offers both offsets. Headless, choose explicitly:

```ts
const earlier = resolveWallTime(value, zone, 'earlier')!; // first occurrence
const later = resolveWallTime(value, zone, 'later')!;     // second occurrence
```

**Gap.** The UI offers the suggested wall time. Headless:

```ts
const r = resolveWallTime(value, zone); // { kind: 'nonexistent', dateTime, alternatives }
// r.alternatives[0] is the real wall time before the gap,
// r.alternatives[1] after it.
```

**Detect DST without a table.** Compare the offsets six months apart:

```ts
const jan = getTimeZoneOffsetMinutes(zone, Date.UTC(2026, 0, 15, 12))!;
const jul = getTimeZoneOffsetMinutes(zone, Date.UTC(2026, 6, 15, 12))!;
const observesDst = jan !== jul;
```

**The list of zones.** `listTimeZones()` returns the runtime's ids (418 in the
verified environment). A demo selector or a settings page can use it directly;
`Intl.supportedValuesOf('timeZone')` is the underlying API.

### Measured examples (2026)

- `+03:00` — a fixed offset: 25 Oct 2026 16:00 resolves to `+180` minutes and
  `2026-10-25T13:00:00.000Z`, `kind: 'unique'`, in January and July alike.
  `Etc/GMT-3` resolves to the same offset; `GMT+3` is rejected by
  `isValidTimeZone()`. `listTimeZones()` (418 ids here) does not include the
  fixed offset, by design.
- `Africa/Cairo` — 25 Oct 2026 15:00 is `GMT+3`; 29 Oct 2026 23:30 occurs twice
  (`20:30Z` at `+3`, `21:30Z` at `+2`); 24 Apr 2026 00:30 does not exist and
  the compatible suggestion is 01:30 `+3` (the earlier side is 23:30 on 23
  April at `+2`).
- `America/New_York` — 8 Mar 2026 02:30 → 03:30 `-4`; 1 Nov 2026 01:30 occurs
  at `-4` and `-5`.
- `Australia/Lord_Howe` — a **30-minute** DST shift: 4 Oct 2026 02:15 → 02:45
  `+11`; 5 Apr 2026 01:45 occurs at `+11` and `+10:30`.
- `Asia/Riyadh` — no DST; 25 Oct 2026 15:00 is uniquely `+3`.

These are facts of the runtime's ICU data, verified in the unit suite; they can
change if a government changes its rules. The package bundles no rules, so it
follows the runtime.

### Limits

- No time-zone **picker** is included; `listTimeZones()` is the data, the
  application owns the control. Auto-detection is
  `Intl.DateTimeFormat().resolvedOptions().timeZone` in your app.
- No `ZonedDateTime` and no Temporal dependency. The resolver is `Intl`-only
  and was exercised in Node and Chromium ICU; `Temporal` can be used by the
  application on top of the same civil value.
- Historic and future rule changes follow the runtime's tzdata. A runtime with
  no `Intl.supportedValuesOf` still resolves zones; only `listTimeZones()` is
  empty.
- The value has no offset field. If you need to preserve "the user meant +03:00
  even if the zone's rules change", store the resolved `instant` **and** the
  zone id, not the civil value alone.
- SSR: the picker's "today" in a zone reads the current clock unless `today` is
  pinned in the provider. The formatters are deterministic for a given civil
  value and locale.
- On a short viewport the panel shifts **up** by the deficit so its bottom edge
  stays 8px inside the viewport (measured 320 × 568: bottom 560.1 on a 568
  viewport, previously 577.1). It overlaps its field by that amount — the
  native-select behaviour — because a 337px panel cannot fit on either side of
  a field near the middle. The shift is recomputed when the panel grows (a DST
  warning, a wrapped action row) and resets on every open. Width is unaffected.
- The browser evidence is **Chromium** (headless Playwright, production build).
  Firefox and WebKit, and SSR hydration, are not claimed for 0.1.0.

## Research notes

The same-panel design follows the sources that were actually inspected for this
work: PrimeNG 22.1.4 (`showTime` in the date panel), ng-zorro 22.1.2
(`nzShowTime` with Today/Now/OK) and Ant Design 6 (`showTime`, `needConfirm`,
`showNow`, time steps). The W3C APG spinbutton pattern supplies the time
keyboard model, and MDN's `<input type="datetime-local">` documents why the
native control is not used (browser-owned display, no locale/zone control).
The pointer tray follows the APG **listbox** pattern (`role="listbox"` /
`role="option"`, `aria-selected`, one roving tab stop); it is a second input
path for the same draft, not a second step or a second popup.
The package follows the brief: **one panel, one value, one commit**.

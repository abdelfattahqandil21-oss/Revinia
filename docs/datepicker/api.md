# API reference

Find the public entry points, symbols, and exports.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Imports

Two entry points. The components live only in the UI entry point; the service,
the date math and the formatters live in the headless one.

| Symbol                                                                    | `@rivinia/datepicker` | `@rivinia/datepicker/ui` |
| ------------------------------------------------------------------------- | :-------------------: | :----------------------: |
| `RiviniaDatepickerComponent` (`<rv-datepicker>`)                          |           —           |            ✅            |
| `RiviniaDatetimepickerComponent` (`<rv-datetimepicker>`)                  |           —           |            ✅            |
| `RiviniaTimeRowComponent` (`<rv-time-row>`)                               |           —           |            ✅            |
| `RiviniaCalendarComponent` (`<rv-calendar>`)                              |           —           |            ✅            |
| `RiviniaCalendar` (the calendar service)                                  |          ✅           |            —             |
| `buildMonth`, `resolveCalendarKey`                                        |          ✅           |            —             |
| `formatDate`, `formatWithPattern`, `parseDatePattern`                     |          ✅           |            —             |
| `formatTime`, `formatDateTime`, `formatTimeWithPattern`                   |          ✅           |            —             |
| `resolveWallTime`, `wallTimeInTimeZone`, `isValidTimeZone`, …             |          ✅           |            —             |
| the date math (`addDays`, `toIso`, `parseDate`, `isSameDay`, …)           |          ✅           |            —             |
| the time math (`addMinutes`, `parseTime`, `compareDateTime`, …)           |          ✅           |            —             |
| `provideRiviniaDatepicker`, `injectRiviniaDatepicker`                     |          ✅           |            —             |
| `RiviniaDatepickerTheme`, `DATEPICKER_THEMES`                             |          ✅           |            —             |
| `RiviniaDate`, `RiviniaDateFormat`, `RiviniaDatepickerLabels`, …          |          ✅           |            —             |
| `RiviniaTime`, `RiviniaDateTime`, `RiviniaTimeFormat`, `RiviniaTimeZone*` |          ✅           |            —             |

```ts
// Ready-made UI
import { RiviniaDatepickerComponent } from '@rivinia/datepicker/ui';

// Headless core
import { RiviniaCalendar, buildMonth, type RiviniaDate } from '@rivinia/datepicker';
```

Importing `RiviniaDatepickerComponent` from `@rivinia/datepicker` is a compile
error.


## API

### `<rv-datepicker>`

| Input         | Type                               | Default             | Notes                                                                                                                                     |
| ------------- | ---------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `RiviniaDate \| null`              | config              | Two-way: `[(value)]`. Starts at `provideRiviniaDatepicker({ selected })`.                                                                 |
| `locale`      | `string`                           | config, `en-US`     | Any BCP-47 tag. Digits, names, week start and direction follow it.                                                                        |
| `format`      | `RiviniaDateFormat`                | `'medium'`          | A style or a date-only pattern.                                                                                                           |
| `firstDay`    | `RiviniaWeekday` (`0`–`6`)         | CLDR                | Overrides the locale's first day of the week.                                                                                             |
| `min` / `max` | `RiviniaDate`                      | config              | Bounds. A bound day is focusable but cannot be picked.                                                                                    |
| `labels`      | `Partial<RiviniaDatepickerLabels>` | locale              | Per-instance label overrides (`chooseDate`, `previousMonth`, …).                                                                          |
| `disabled`    | `boolean`                          | `false`             | A form binds this automatically when the control is disabled.                                                                             |
| `placeholder` | `string`                           | `labels.chooseDate` | Trigger text when there is no value.                                                                                                      |
| `label`       | `string`                           | —                   | The field name ("Departure"). Becomes the trigger's accessible name: `Departure: Oct 25, 2026`.                                           |
| `theme`       | `'auto' \| 'light' \| 'dark'`      | `'auto'` (config)   | The colour scheme of this picker. `auto` inherits the page's `color-scheme`; `light`/`dark` pin it. Mirrored on the host as `data-theme`. |
| `clearable`   | `boolean`                          | `false` (config)    | Shows a clear button while a value is set. Hidden when disabled.                                                                          |

| Output        | Payload               | When                                                                                                                       |
| ------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `valueChange` | `RiviniaDate \| null` | The value really changed (a pick, `value.set()` or the clear button). A form write updates the model **without** emitting. |
| `touch`       | `void`                | The interaction finished: the panel closed, the clear button was pressed, or focus left the host.                          |

Method: `focus(options?)` — focuses the trigger (the `FormUiControl.focus`
hook).

### `<rv-datetimepicker>`

The date picker's API, plus the time half. The value is a `RiviniaDateTime`
(`{ date, time }`), `min`/`max` are datetimes (only the date part bounds the
grid), and the panel contains the same `<rv-calendar>` plus an
`<rv-time-row>`.

| Input         | Type                               | Default                 | Notes                                                                                                             |
| ------------- | ---------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `value`       | `RiviniaDateTime \| null`          | `null`                  | Two-way: `[(value)]`. Civil, with no zone.                                                                        |
| `locale`      | `string`                           | config, `en-US`         | Same locale rules as the date picker.                                                                             |
| `format`      | `RiviniaDateFormat`                | `'medium'`              | The **date** half only; time tokens still throw.                                                                  |
| `timeFormat`  | `RiviniaTimeFormat`                | `'short'`               | `short`, `medium`, or a time pattern.                                                                             |
| `showSeconds` | `boolean`                          | `false` (config)        | Adds the seconds spinbutton. The value always carries seconds.                                                    |
| `minuteStep`  | `number`                           | `1` (config)            | Step for `PageUp`/`PageDown` on minutes/seconds; arrows stay ±1.                                                  |
| `hour12`      | `boolean \| 'auto'`                | `'auto'` (config)       | `'auto'` follows the locale's clock.                                                                              |
| `timeZone`    | `string`                           | config, unset           | An IANA zone or fixed UTC offset (`+03:00`) used for the offset, DST checks and "today". Not stored in the value. |
| `firstDay`    | `RiviniaWeekday` (`0`–`6`)         | CLDR                    | Forwarded to the calendar.                                                                                        |
| `min` / `max` | `RiviniaDateTime`                  | config                  | Bounds. The grid uses their `date`; the time half is not restricted.                                              |
| `labels`      | `Partial<RiviniaDatepickerLabels>` | locale                  | Includes the time labels (`chooseTime`, `hour`, `minute`, `ok`, `now`, `dstGap`, …).                              |
| `disabled`    | `boolean`                          | `false`                 | A form binds this automatically.                                                                                  |
| `placeholder` | `string`                           | `labels.chooseDateTime` | Trigger text when empty.                                                                                          |
| `label`       | `string`                           | —                       | Field name; joins the trigger and clear-button accessible names.                                                  |
| `theme`       | `'auto' \| 'light' \| 'dark'`      | `'auto'` (config)       | Same as the date picker.                                                                                          |
| `clearable`   | `boolean`                          | `false` (config)        | Clear button while a value is set.                                                                                |

| Output        | Payload                     | When                                                                                                                                                                               |
| ------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valueChange` | `RiviniaDateTime \| null`   | A committed `OK`, `value.set()`, or the clear button. A form write does not echo.                                                                                                  |
| `touch`       | `void`                      | The interaction finished: the panel closed, the clear button was pressed, or focus left the host.                                                                                  |
| `resolved`    | `RiviniaDateTimeResolution` | On commit **only when a valid `timeZone` is set**. Carries `{ value, timeZone, resolution }`; `resolution.instant` is the epoch, `kind` is `unique`, `ambiguous` or `nonexistent`. |

Methods: `focus(options?)` (trigger) and `closeForAnotherPanel()` (the panel
coordination hook; not needed by normal consumers).

The time is a **draft** until `OK`: picking a day or editing a time leaves
`value` untouched, and Escape or an outside click discards the draft. This is
the same rule Ant Design calls `needConfirm`; a date + time is incomplete until
the time is confirmed.

### `<rv-time-row>`

The row is exported so a custom panel can compose the same controls. The
component is controlled: it never keeps a date or a zone.

| Input         | Type                      | Notes                                                                                       |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `value`       | `RiviniaTime`             | **Required.**                                                                               |
| `locale`      | `string`                  | **Required.** Digits and day periods.                                                       |
| `labels`      | `RiviniaDatepickerLabels` | **Required.** The full label set; `chooseTime` is optional and falls back to the row label. |
| `hour12`      | `boolean \| 'auto'`       | Default `'auto'`.                                                                           |
| `showSeconds` | `boolean`                 | Default `false`.                                                                            |
| `minuteStep`  | `number`                  | Default `1`; also spaces the minute/second tray options.                                    |
| `disabled`    | `boolean`                 | Default `false`.                                                                            |

Outputs: `valueChange` (`RiviniaTime`), `commit` (Enter or `OK`), `now`
(the `Now` button). The row owns the clock button and the tray; they are part
of the same component, not separate controls a consumer must wire.

### Configuration

```ts
provideRiviniaDatepicker({
  locale: 'ar-EG',
  format: 'dd MMMM yyyy',
  firstDay: 6,
  theme: 'auto', // or 'light' / 'dark'
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
anywhere outside closes without stealing focus; tabbing out of the control also
closes its panel while leaving focus at the new target. Escape closes and
returns focus to the trigger. `<rv-datetimepicker>` uses the same registry, so a date picker
and a datetime picker on one page also never leave two panels open.

### `<rv-calendar>`

The rendering half, usable without the trigger.

| Input       | Type              | Notes                                                        |
| ----------- | ----------------- | ------------------------------------------------------------ |
| `calendar`  | `RiviniaCalendar` | **Required.** The state to render.                           |
| `headingId` | `string`          | Id for the heading, so a host dialog can label itself by it. |
| `autofocus` | `boolean`         | Focus the active cell on first render.                       |

| Output      | Payload       | When                      |
| ----------- | ------------- | ------------------------- |
| `picked`    | `RiviniaDate` | The user committed a day. |
| `dismissed` | `void`        | The user pressed Escape.  |

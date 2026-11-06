# Date and time

Use the combined civil date and time picker.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

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
  readonly hour: number; // 0–23
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
<rv-datetimepicker [(value)]="appointment" format="dd/MM/yyyy" timeFormat="HH:mm" />
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
  the locale's date-time connector (`في` in Arabic, a comma elsewhere).

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

| Key                   | On a time spinbutton                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `↑` / `↓`             | ±1 unit (hour, minute or second)                                                                         |
| `PageUp` / `PageDown` | ±`minuteStep` on minute/second; ±1 on hour                                                               |
| `Home` / `End`        | first / last value                                                                                       |
| digits                | direct entry, clamped; pads on blur                                                                      |
| `Enter`               | commit the draft and close                                                                               |
| `Escape`              | discard the draft, close, restore focus                                                                  |
| `Tab`                 | hour → minute → [second] → clock → tray rows → meridiem → Now → OK (the tray rows only while it is open); leaving the picker closes it without restoring focus |

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

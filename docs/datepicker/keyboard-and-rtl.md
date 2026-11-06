# Keyboard and RTL

Navigate the controls with a keyboard in either reading direction.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Keyboard

| Key                   | Day view                                | Month view                     | Year view                     |
| --------------------- | --------------------------------------- | ------------------------------ | ----------------------------- |
| `←` / `→`             | previous / next day **(RTL: mirrored)** | previous / next month          | previous / next year          |
| `↑` / `↓`             | previous / next week                    | previous / next row (3 months) | previous / next row (3 years) |
| `Home` / `End`        | first / last day of the week            | first / last month of the row  | first / last year of the row  |
| `PageUp` / `PageDown` | previous / next month                   | previous / next year           | ±12 years                     |
| `Shift+PageUp/Down`   | previous / next year                    | ±12 years                      | ±120 years                    |
| `Enter` / `Space`     | pick the focused day                    | open that month (day view)     | open that year (month view)   |
| `Escape`              | close the panel, restore focus          | close the panel                | close the panel               |
| `Tab` / `Shift+Tab`    | when focus leaves: close; keep the new focus | when focus leaves: close; keep the new focus | when focus leaves: close; keep the new focus |

The heading is a button: `Tab` to it and press `Enter` to go from the day view
to the months, and from the months to the years.

`Shift+Arrow` is deliberately unhandled: it is the gesture for range selection,
which the component does not offer — staying silent is better than moving focus
as if Shift meant nothing.

Disabled days stay **focusable** (`aria-disabled`, not the `disabled`
attribute), and `Enter` on one does nothing.

Time spinbuttons follow the W3C APG spinbutton pattern:

| Key                   | On a time spinbutton                                           |
| --------------------- | -------------------------------------------------------------- |
| `↑` / `↓`             | ±1 unit (hour, minute or second)                               |
| `PageUp` / `PageDown` | ±`minuteStep` on minute/second; ±1 on hour                     |
| `Home` / `End`        | first / last value (hour `00`/`23`, minute/second `00`/`59`)   |
| digits                | direct entry; the value is clamped, and the field pads on blur |
| `Enter`               | commits the draft and closes the panel                         |
| `Escape`              | closes and discards the draft                                  |
| `Tab`                 | next control; the `OK` and `Now` buttons are real tab stops    |

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

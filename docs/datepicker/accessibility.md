# Accessibility

Understand the controls’ accessible names, roles, and focus behavior.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

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

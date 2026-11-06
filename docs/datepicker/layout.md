# Picker layout and widths

Understand the picker field and panel sizing rules.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

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

All sizes are **`rem`**, so the picker follows the user's text-size preference
and the application's root font size. Only hairlines (`1px`), focus rings
(`2px`) and the 16px icon box stay in `px`.

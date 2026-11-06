# Columns

Define typed data and display columns.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/table/v1.0.1/projects/table/README.md)

## Columns

A column is data, not a component. `tableColumn<T>()` has two builders:
`accessor(key, def?)` reads a field of the row, `display(id, def?)` has no field
and exists for a template or an actions column.

| Field          | Meaning                                                             |
| -------------- | ------------------------------------------------------------------- |
| `header`       | Visible header text. Omit for an icon-only column.                  |
| `width`        | A CSS length. Fixed columns take part in `table-layout: fixed`.     |
| `flex`         | `> 0` absorbs free space; `0` stays fixed.                          |
| `align`        | `'start' \| 'center' \| 'end'` — logical, so RTL needs no override. |
| `sortable`     | Adds the three-state sort affordance and `aria-sort`.               |
| `format`       | `(value, row, locale) => string` for display only.                  |
| `comparator`   | Sort with something other than the default compare.                 |
| `pinned`       | `'start' \| 'end'` — stays visible during horizontal scroll.        |
| `textOverflow` | `'nowrap'` (default), `'wrap'`, `'clamp'`.                          |
| `lines`        | Clamp height, default 2.                                            |
| `hidden`       | Removed from the visible set without losing its definition.         |

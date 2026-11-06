# Accessibility

Understand the controls’ accessible names, roles, and focus behavior.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/table/v1.0.1/projects/table/README.md)

## Accessibility

- The grid is `role="grid"` with `aria-rowcount` / `aria-colcount`, `aria-sort`
  on headers and `aria-selected` on rows.
- With `selectable`, each row draws a **decorative** box in its first cell and
  the state lives in `aria-selected` — one announcement per row, not two, and
  no second tab stop inside the cell. Clicking the row or pressing Space
  toggles it.
- Merged cells are one cell: a screen reader hears the value once, not once per
  covered position.
- Truncated text is available to assistive technology through
  `aria-describedby`; a visual tooltip is the consumer's choice.
- Loading, empty and error states are live regions (`role="status"`), never
  silent.

# Row and column spans

Define row and column spans.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/table/v1.0.1/projects/table/README.md)

## Row and column spans

Spans are part of the core, not an add-on: pinning, keyboard navigation and
selection all need to know the grid's real geometry. Three ways to declare one,
in increasing power:

```ts
// 1. Row span by a shared key: consecutive rows with an equal value merge.
tableColumn<Invoice>().accessor('department', { header: 'Department', merge: 'equal' });

// 2. Column span: this cell covers N columns to its end.
tableColumn<Invoice>().accessor('note', { header: 'Notes', colSpan: 2 });

// 3. Both axes, computed per cell.
tableColumn<Invoice>().display('summary', {
  span: ({ rowIndex }) => (rowIndex === 0 ? { colSpan: 5 } : null),
});
```

Rules, enforced at `createTable()` rather than at render time:

- `span` cannot be combined with `merge` or `colSpan` — the call throws.
- `merge` without an accessor warns and does not merge (there is nothing to
  compare).
- `merge` and `colSpan` compose into one rectangle.
- Overlapping spans are shrunk so the anchor wins, and the overlap is reported.

`table.spans` is a resolved `SpanModel` with `at(row, column)`,
`owner(row, column)` and `move(row, column, dRow, dColumn)`. Every query is
O(1) against a dense matrix built once per `(rows, columns)` pair, so a
10,000-row page does not re-walk your callbacks on scroll.

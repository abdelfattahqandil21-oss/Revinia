# @rivinia/table

[![npm version](https://img.shields.io/npm/v/@rivinia/table.svg)](https://www.npmjs.com/package/@rivinia/table)
[![license](https://img.shields.io/npm/l/@rivinia/table.svg)](https://www.npmjs.com/package/@rivinia/table)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

A headless Angular table with typed columns, real row and column spans,
sorting, filtering, selection and paging — plus an optional ready-made grid.
The core owns the data and the geometry; it never renders a cell, never knows
what an "action" is, and never imports a stylesheet.

- Package version: **0.1.0**
- Requires: **Angular `^22.0.0`** (`@angular/core` and `@angular/common`).
- Entry points: `@rivinia/table` (headless controller + pure helpers) and
  `@rivinia/table/ui` (the `rv-table` grid, div-based, `role="grid"`).
- Side effects: **none** (`sideEffects: false`).

## Quick features

- **Headless first.** The controller is signals and pure functions — no DOM, no
  browser needed to test the pipeline. The grid is a component you can throw
  away and replace with your own markup.
- **Real spans, not CSS tricks.** `merge: 'equal'` for consecutive equal values,
  `colSpan: n`, or a per-cell `span(ctx)` for both axes. The result is a resolved
  matrix, so the keyboard, the ARIA and the pinned columns all follow the real
  geometry.
- **One pipeline.** Filter → sort → page → selection, in that order, every step
  a signal, so a page never recomputes more than it must.
- **Selection by id, never by index.** It survives sorting, filtering and
  paging, and an action always receives the row it was rendered for.
  `selectAllOnPage()` is page-scoped on purpose.
- **A shareable view.** `table.state` is the serialisable slice (sort, filters,
  search, page, page size, selection) — put it in the URL and `setState()`
  restores what the user sees.
- **The actions column is yours.** `display('actions')` reserves the column;
  `<ng-template rvTableCell="actions">` fills it. Five icons, one link, or a
  permission-driven set — the grid passes the row and gets out of the way.
- **Four bodies, not four screens.** Loading skeletons that keep the header
  widths, an empty state, an error alert and the data, all inside one grid, all
  live regions.
- **Right-to-left ready.** Every inset is logical, the header mirrors with the
  body, labels ship in English and Arabic, and each value carries `dir="auto"`
  so an English name stays intact in an Arabic table.
- **Themable end to end.** `--rv-table-*` beats `--rv-*` from `@rivinia/theme`,
  which beats the built-in default; sizes are `rem`, so the grid follows the
  browser's text size.
- **Zero runtime dependencies.** Angular peers only.

## Install

```bash
npm install @rivinia/table
```

or

```bash
pnpm add @rivinia/table
```

or

```bash
yarn add @rivinia/table
```

or

```bash
bun add @rivinia/table
```

## Why another table

Most Angular tables couple three things that change at different speeds: the
data pipeline, the DOM, and the styling. This one separates them. The pipeline
is signals and pure functions, so it is testable without a browser; the grid is
a component you can replace; and every colour, size and radius is a CSS custom
property read at the use site.

## Quick start

```ts
import { createTable, tableColumn } from '@rivinia/table';

@Component({ /* … */ })
export class InvoicesPage {
  private readonly table = createTable<Invoice>(() => ({
    // Columns are a FACTORY too: `options()` runs inside a computed, so a
    // column list that reads a signal re-renders. A bare array is not accepted.
    columns: () => [
      tableColumn<Invoice>().accessor('number', { header: 'Invoice', width: '7rem' }),
      tableColumn<Invoice>().accessor('client', { header: 'Client', flex: 1 }),
      tableColumn<Invoice>().accessor('amount', {
        header: 'Amount',
        align: 'end',
        format: (value) => new Intl.NumberFormat('en-EG').format(value),
      }),
      tableColumn<Invoice>().accessor('status', { header: 'Status' }),
    ],
    data: () => this.invoices(),
    pageSize: 25,
    selection: { mode: 'multi' },
  }));

  readonly rows = this.table.pageRows;
  readonly columns = this.table.visibleColumns;
}
```

`createTable()` must be called in an injection context: the controller is built
from signals and computeds, so it is either a field initialiser or inside
`inject()`-capable code.

## Columns

A column is data, not a component. `tableColumn<T>()` has two builders:
`accessor(key, def?)` reads a field of the row, `display(id, def?)` has no field
and exists for a template or an actions column.

| Field | Meaning |
| --- | --- |
| `header` | Visible header text. Omit for an icon-only column. |
| `width` | A CSS length. Fixed columns take part in `table-layout: fixed`. |
| `flex` | `> 0` absorbs free space; `0` stays fixed. |
| `align` | `'start' \| 'center' \| 'end'` — logical, so RTL needs no override. |
| `sortable` | Adds the three-state sort affordance and `aria-sort`. |
| `format` | `(value, row, locale) => string` for display only. |
| `comparator` | Sort with something other than the default compare. |
| `pinned` | `'start' \| 'end'` — stays visible during horizontal scroll. |
| `textOverflow` | `'nowrap'` (default), `'wrap'`, `'clamp'`. |
| `lines` | Clamp height, default 2. |
| `hidden` | Removed from the visible set without losing its definition. |

## Row and column spans

Spans are part of the core, not an add-on: pinning, keyboard navigation and
selection all need to know the grid's real geometry. Three ways to declare one,
in increasing power:

```ts
// 1. Row span by a shared key: consecutive rows with an equal value merge.
tableColumn<Invoice>().accessor('department', { header: 'Department', merge: 'equal' })

// 2. Column span: this cell covers N columns to its end.
tableColumn<Invoice>().accessor('note', { header: 'Notes', colSpan: 2 })

// 3. Both axes, computed per cell.
tableColumn<Invoice>().display('summary', {
  span: ({ rowIndex }) => (rowIndex === 0 ? { colSpan: 5 } : null),
})
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

## Selection

Ids, not array positions — so a selection survives sorting, filtering and
paging, and an action always receives the row it was rendered for. Turn it on
in the options (`'single'` or `'multi'`); a table without it renders none of the
affordance and every method is a no-op:

```ts
createTable<Invoice>(() => ({
  columns: () => this.columns,
  data: () => this.invoices(),
  selection: { mode: 'multi' },
}));
```

```ts
table.selection.toggle(row.id);
table.selection.isSelected(row.id);
table.selection.selectAllOnPage();   // page scope, never "everything by accident"
table.selection.clear();
```

## Paging and state

`page`, `pageSize`, `sorting`, `filters` and `globalSearch` are writable
signals; `rows` (filtered and sorted), `pageRows` (sliced) and `total` are
read-only computeds. `table.state` is the serialisable slice — put it in the URL
and the user can share what they see; `setState()` and `resetState()` restore it.

## UI entry point

```ts
import { RvTable } from '@rivinia/table/ui';
```

```html
<rv-table
  aria-label="Invoices"
  [columns]="columns()"
  [rows]="rows()"
  [spans]="table.spans()"
  [totalRows]="table.total()"
  [(sort)]="sort"
  [(selected)]="selected"
  [skeletonRows]="'auto'"
  [loading]="loading()"
>
  <!-- The actions column is YOUR template. Five buttons, one button, or a
       link — the table only reserves the column and hands you the row. -->
  <ng-template rvTableCell="actions" let-row>
    <button type="button" (click)="approve(row)">Approve</button>
  </ng-template>
</rv-table>
```

The grid renders a single `role="grid"` container, a sticky header that shares
its column widths with the body, one roving `tabindex`, and cells that respect
`span.move()` for keyboard navigation. It ships no icons and no action
semantics.

Two details that are easy to miss:

- `aria-label` written on `<rv-table>` becomes the grid's accessible name; the
  `[ariaLabel]` input is the reactive equivalent and wins over it.
- `[totalRows]` is what `aria-rowcount` reports when the page is smaller than
  the data set. Without it the grid can only count what it renders, which on a
  paged table is the page, not the table.
- A cell can be narrower than its content. The grid does not clip a cell by
  default, because a floating menu inside a cell has to be able to leave it —
  so an actions cell that does not fit paints over its neighbour. Size the
  column (`width`) or let the content wrap; if your cells never float
  anything, `overflow: clip` on `.rv-table-cell` is the strict fix.

## Theming

Every visual value is a token read where it is used, so a value set on an
ancestor wins:

```
--rv-table-<property>   wins for the table only
--rv-<semantic>         from @rivinia/theme
<built-in default>      last
```

Sizes are in `rem`, so the grid follows the browser's text size; hairlines stay
`1px` and focus rings `2px`.

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

## Status

`0.1.0` is not published yet. Client-mode sorting, filtering, paging, selection
and spans are the 0.1.0 scope; server mode (`TableRequest`, `reload()`) and
editing (`@rivinia/table/editing`) are planned, additive, and not part of this
version.

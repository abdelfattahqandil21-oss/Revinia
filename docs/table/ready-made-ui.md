# Ready-made UI

Render a modal with the optional UI entry point.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/projects/table/README.md)

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

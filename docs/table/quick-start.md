# Quick start

Build the first working example from the package quick start.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/projects/table/README.md)

## Quick start

```ts
import { createTable, tableColumn } from '@rivinia/table';

@Component({/* … */})
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

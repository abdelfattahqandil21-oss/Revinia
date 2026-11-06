# Selection

Select rows using stable row identity.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/table/v1.0.1/projects/table/README.md)

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
table.selection.selectAllOnPage(); // page scope, never "everything by accident"
table.selection.clear();
```

### Row identity contract

`getRowId` must return a unique, stable, non-empty string or finite number for
every row in the full active data set. Validation runs before filtering,
sorting, paging, or selection state is committed. In development, duplicate IDs
throw an error naming the ID and source row indices; invalid values name their
source index. In production, rows with ambiguous IDs remain visible, but
selection and other identity-dependent actions are disabled for those rows.
The table never substitutes an array index for an invalid ID. If rows have no
stable `id`, provide a `getRowId` backed by a persistent domain key.

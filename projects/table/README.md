# @rivinia/table

[![npm version](https://img.shields.io/npm/v/@rivinia/table.svg)](https://www.npmjs.com/package/@rivinia/table)
[![license](https://img.shields.io/npm/l/@rivinia/table.svg)](https://www.npmjs.com/package/@rivinia/table)

A headless Angular table controller with typed columns, spans, selection, and optional grid UI.

```ts
import { Component } from '@angular/core';
import { createTable, tableColumn } from '@rivinia/table';
import { RvTable } from '@rivinia/table/ui';
@Component({ imports: [RvTable], template: '<rv-table aria-label="Invoices" [columns]="table.visibleColumns()" [rows]="table.pageRows()" />' })
export class InvoicesPage {
  readonly table = createTable<Invoice>(() => ({
    columns: () => [tableColumn<Invoice>().accessor('number', { header: 'Invoice' })],
    data: () => this.invoices(),
  }));
}
```

## Why @rivinia/table

- The signal pipeline is headless and testable without rendering a grid.
- Typed columns, spans, paging, filters, sorting, and selection share one model.
- The optional grid renders the model and can be replaced with custom markup.

## Install

```bash
npm install @rivinia/table
```

## Quick start

1. Install the package and import `createTable` and `tableColumn`.
2. Create the controller in an Angular injection context.
3. Render `<rv-table>` with its columns and rows.

## Two ways to use it

| Ready-made UI | Headless controller |
| --- | --- |
| `@rivinia/table/ui` | `@rivinia/table` |

The UI and controller are independent; use either or combine them.

## Compatibility

| Angular | Node | Browser verification |
| --- | --- | --- |
| `^22.0.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` | Chromium and Firefox; native Safari not verified |

## Go further

| Topic | Read |
| --- | --- |
| Overview | [Overview](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/overview.md) |
| Install | [Install](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/installation.md) |
| Quick start | [Quick start](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/quick-start.md) |
| Columns | [Columns](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/columns.md) |
| Row and column spans | [Row and column spans](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/spans.md) |
| Selection | [Selection](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/selection.md) |
| Paging and state | [Paging and state](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/paging-and-state.md) |
| Ready-made UI | [Ready-made UI](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/ready-made-ui.md) |
| Theming | [Theming](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/theming.md) |
| Accessibility | [Accessibility](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/accessibility.md) |
| Scope and limits | [Scope and limits](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/docs/table/scope-and-limits.md) |

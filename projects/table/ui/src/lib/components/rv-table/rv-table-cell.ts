import { Directive, TemplateRef, inject, input } from '@angular/core';

import type { TableUiCellContext } from '../../models/ui.types';

/**
 * `[rvTableCell]="columnId"` — the consumer's renderer for one column.
 *
 * Put it on an `<ng-template>`; the grid never renders the template directly,
 * it asks for it BY COLUMN ID and instantiates it once per row. That is what
 * makes an actions column possible without the table knowing anything about
 * actions: the column list only declares geometry and a header, and the
 * markup decides what a cell contains.
 *
 * ```html
 * <rv-table [columns]="columns()" [rows]="rows()">
 *   <ng-template rvTableCell="actions" let-row let-data="data">
 *     <button type="button" (click)="edit(data)">Edit</button>
 *   </ng-template>
 * </rv-table>
 * ```
 *
 * A column whose id has no template and no `accessor` renders an empty cell,
 * so declare the column for its width/header and supply the template here.
 * The template wins over `accessor` when both exist: markup is an override.
 *
 * The context is {@link TableUiCellContext} — `$implicit` (and `row`) is the
 * `TableRow`, `data` is your object, `value` is the accessor's value.
 */
@Directive({ selector: '[rvTableCell]' })
export class RvTableCell {
  /**
   * The id of the column this template renders. It must match a
   * `TableColumn.id`; an id that matches nothing is simply never used (the
   * grid cannot throw at render time for a template it was given).
   */
  readonly columnId = input.required<string>({ alias: 'rvTableCell' });

  /** The template to instantiate. Injected from the `<ng-template>` host. */
  readonly template = inject(TemplateRef) as TemplateRef<TableUiCellContext>;
}

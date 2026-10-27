/*
 * Public API of `@rivinia/table/ui` — the ready-made grid.
 *
 * The UI depends INWARD on the headless core and never the reverse (D06/D21);
 * it exports components, the cell-template directive, and the label contract
 * a consumer can localise. No core internals leak through here.
 */
export type {
  TableUiCellContext,
  TableUiColumn,
  TableUiDensity,
  TableUiLabels,
  TableUiRow,
  TableUiSelectionChange,
} from './lib/models/ui.types';
export { TABLE_UI_LABELS_AR, TABLE_UI_LABELS_EN } from './lib/models/ui.types';
export { RiviniaTableComponent } from './lib/components/rv-table/rv-table';
export { RvTableCell } from './lib/components/rv-table/rv-table-cell';

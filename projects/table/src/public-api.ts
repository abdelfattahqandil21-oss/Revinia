/*
 * Public API of `@rivinia/table` — the headless core.
 *
 * The entry point is the package boundary: anything not exported here is an
 * implementation detail the UI (or a future editing entry) may change freely.
 */

// ── the contract ────────────────────────────────────────────────────────────
export type {
  CellSpan,
  ColumnDef,
  FilterState,
  SortDirection,
  SortState,
  SpanCell,
  SpanContext,
  SpanModel,
  TableColumn,
  TableColumnAccessor,
  TableRequest,
  TableRow,
  TableRowId,
  TableState,
  TextOverflow,
} from './lib/models/table.models';

// ── pure helpers (also used by the UI) ──────────────────────────────────────
export type { SpanBuildOptions, SpanWarnOptions } from './lib/utils/spans';
export { assertSpanColumns, buildSpanModel } from './lib/utils/spans';
export type { TablePage } from './lib/utils/table-pipeline';
export {
  applyFilters,
  applySearch,
  applySort,
  paginate,
  readCellValue,
} from './lib/utils/table-pipeline';
export type { TableColumnFactory } from './lib/utils/table-column';
export { tableColumn } from './lib/utils/table-column';

// ── the controller ──────────────────────────────────────────────────────────
export type {
  RiviniaTableSelection,
  TableOptions,
  TableServerOptions,
  TableSelectionKind,
  TableSelectionMode,
  TableSelectionOptions,
  TableSelectionScope,
} from './lib/services/rivinia-table';
export { RiviniaTable, createTable } from './lib/services/rivinia-table';

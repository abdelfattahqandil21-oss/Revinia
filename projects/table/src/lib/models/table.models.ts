/**
 * The public vocabulary of `@rivinia/table`.
 *
 * Everything here is data: no behaviour, no Angular imports. The controller
 * and the UI both read these shapes, which is what keeps the headless core
 * testable without a DOM and the UI replaceable without touching the logic.
 */

/** Rows are identified by a stable id, never by an array position. */
export type TableRowId = string | number;

export type SortDirection = 'asc' | 'desc';

/** One active sort level. Multi-sort is an ordered list of these. */
export interface SortState {
  readonly column: string;
  readonly direction: SortDirection;
}

/** One active column filter. The value shape belongs to the app's filter. */
export interface FilterState {
  readonly column: string;
  readonly value: unknown;
}

/** A row after the pipeline has given it an id and a position. */
export interface TableRow<T> {
  /** Stable across sorting and paging: what selection and actions refer to. */
  readonly id: TableRowId;
  readonly data: T;
  /** Position in `rows`, i.e. after filtering and sorting. */
  readonly index: number;
}

/** A rectangle of a grid, expressed in cell coordinates. */
export interface CellSpan {
  readonly rowSpan?: number;
  readonly colSpan?: number;
}

/** What a `span()` / `colSpan()` callback is given. */
export interface SpanContext<T> {
  readonly row: TableRow<T>;
  readonly column: TableColumn<T>;
  readonly value: unknown;
  readonly rowIndex: number;
  readonly columnIndex: number;
}

/** A span anchored at one cell; the cells it covers are not rendered. */
export interface SpanCell {
  readonly row: number;
  readonly column: number;
  readonly rowSpan: number;
  readonly colSpan: number;
}

/**
 * The resolved span grid for the current rows and columns.
 *
 * Every query is O(1): the model is a dense matrix of anchors built once per
 * (rows, columns) pair, so rendering 10,000 rows does not re-walk the options.
 */
export interface SpanModel {
  /** Anchors only, in reading order. Covered cells appear nowhere. */
  readonly cells: readonly SpanCell[];
  /** True when a span STARTS at this position. */
  at(row: number, column: number): SpanCell | null;
  /** The span COVERING this position, including the anchor itself. */
  owner(row: number, column: number): SpanCell | null;
  /** One step of keyboard navigation that respects spans. */
  move(
    row: number,
    column: number,
    dRow: number,
    dColumn: number,
  ): { readonly row: number; readonly column: number };
}

/** A value accessor: a key of the row, or a function for computed cells. */
/**
 * `V` defaults to `any`, not `unknown`, on purpose.
 *
 * A column array holds columns of DIFFERENT value types, so it is written
 * `TableColumn<Invoice>[]`. With `V = unknown` that annotation means
 * `TableColumn<Invoice, unknown>`, and every `accessor('amount', …)` — which
 * infers `V = number` — is rejected, because `format(value: number)` cannot
 * accept an `unknown` parameter. `any` keeps the inferred type at the call site
 * (`accessor('amount').format` still gets `number`) while letting the array
 * annotation erase it.
 */
export type TableColumnAccessor<T, V = any> =
  | (keyof T & string)
  | ((row: T) => V);

/** How a cell's text behaves when it does not fit. See the text section. */
export type TextOverflow = 'nowrap' | 'wrap' | 'clamp';

export interface TableColumn<T, V = any> {
  readonly id: string;
  readonly header?: string;
  readonly accessor?: TableColumnAccessor<T, V>;
  readonly sortable?: boolean;
  readonly width?: string;
  /** 0 = fixed; > 0 absorbs free space. */
  readonly flex?: number;
  readonly pinned?: 'start' | 'end';
  readonly align?: 'start' | 'center' | 'end';
  readonly format?: (value: V, row: T, locale: string) => string;
  readonly comparator?: (a: V, b: V) => number;
  readonly hidden?: boolean;
  /** Per column, because a note column and an id column need different rules. */
  readonly textOverflow?: TextOverflow;
  /** Only meaningful with `textOverflow: 'clamp'`. Defaults to 2. */
  readonly lines?: number;

  // ── spans ────────────────────────────────────────────────────────────────
  /** Row-span sugar: merge consecutive rows whose key is equal. */
  readonly merge?: 'equal' | ((row: T, anchor: T) => boolean);
  /** Column-span sugar: how many columns this cell covers. */
  readonly colSpan?: number | ((context: SpanContext<T>) => number);
  /** Escape hatch, both axes. Cannot be combined with `merge` / `colSpan`. */
  readonly span?: (context: SpanContext<T>) => CellSpan | null | undefined;
}

/** A column definition without the two fields `tableColumn()` supplies. */
export type ColumnDef<T, V = unknown> = Omit<
  TableColumn<T, V>,
  'id' | 'accessor'
>;

/** Server mode: the app fetches, the table only describes what it needs. */
export interface TableRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: readonly SortState[];
  readonly filters: readonly FilterState[];
  readonly search: string;
}

/** The serialisable slice of the table: what a URL or a saved view holds. */
export interface TableState {
  readonly sort: readonly SortState[];
  readonly filters: readonly FilterState[];
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
  /** Column ids in display order. */
  readonly order: readonly string[];
  /** Column ids the user hid. */
  readonly hidden: readonly string[];
  /** Pinned column ids on the start edge. */
  readonly pinnedStart: readonly string[];
  /** Pinned column ids on the end edge. */
  readonly pinnedEnd: readonly string[];
  /** Row ids, and the ids explicitly excluded from the set. */
  readonly selected: readonly TableRowId[];
  readonly excluded: readonly TableRowId[];
}

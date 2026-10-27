/**
 * The UI-only vocabulary of `@rivinia/table/ui`.
 *
 * The column, row, span and sort shapes are NOT redeclared here — they come
 * from `@rivinia/table` (single source of truth). This file only holds what a
 * renderer needs and the headless core could not know: density presets, the
 * text a grid shows when it has nothing to show, and the context handed to a
 * consumer's projected cell template.
 */

import type {
  CellSpan,
  TableRow,
  TableRowId,
  TextOverflow,
} from '@rivinia/table';

/**
 * The column shape the grid READS — a renderer-facing contract, not a copy of
 * the core type.
 *
 * Why not `TableColumn<any>`: that looks like the obvious "some column" type,
 * but it is not a supertype of a real one. Its accessor is
 * `(keyof any & string) | ((row: any) => V)` = `string | …`, and a concrete
 * `keyof Person & string` is narrower, so `TableColumn<Person>` would NOT be
 * assignable to `TableColumn<any>` — a consumer could not pass their own
 * typed columns at all. The same inversion repeats through `SpanContext`.
 *
 * So the callbacks here take `any` as their PARAMETER type (always assignable
 * in both directions) instead of `any` as the type argument. The result is a
 * genuine supertype: every `TableColumn<T>` is assignable to it.
 *
 * The renderer reads `id`, `header`, `accessor`, `format`, `sortable`,
 * `width`, `flex`, `align`, `hidden`, `textOverflow` and `lines`. The rest is
 * declared so a column literal typed as `TableUiColumn[]` can carry the full
 * core vocabulary without an excess-property error: spans are rendered from
 * `[spans]` (not from the column), `comparator` belongs to the core's sorting,
 * and pinning is not implemented by this entry point.
 */
export interface TableUiColumn {
  readonly id: string;
  readonly header?: string;
  readonly accessor?: string | ((row: any) => unknown);
  readonly sortable?: boolean;
  readonly width?: string;
  /** 0 = fixed; > 0 absorbs free space. */
  readonly flex?: number;
  readonly pinned?: 'start' | 'end';
  readonly align?: 'start' | 'center' | 'end';
  readonly format?: (value: any, row: any, locale: string) => string;
  readonly comparator?: (a: any, b: any) => number;
  readonly hidden?: boolean;
  readonly textOverflow?: TextOverflow;
  readonly lines?: number;
  readonly merge?: 'equal' | ((row: any, anchor: any) => boolean);
  readonly colSpan?: number | ((context: any) => number);
  readonly span?: (context: any) => CellSpan | null | undefined;
}

/** A row as the grid reads it. `TableRow<T>` has no variance, so this is safe. */
export type TableUiRow = TableRow<any>;

/** Row height + padding preset. Token values per preset are in the CSS. */
export type TableUiDensity = 'compact' | 'default' | 'comfortable';

/**
 * The text a grid shows on its own. Everything here is also a `[labels]`
 * override, so an Arabic page gets Arabic text without a second code path.
 */
export interface TableUiLabels {
  /** The grid's accessible name when `[ariaLabel]` is unset. */
  readonly grid: string;
  /** Announced while `[loading]` is true (the skeletons are decorative). */
  readonly loading: string;
  /** Fallback when `[error]` holds something that is not an `Error`/string. */
  readonly error: string;
  /** Used when `[emptyMessage]` is unset. */
  readonly empty: string;
  /** The grid's `aria-describedby`: what the keyboard does. */
  readonly keyboardHelp: string;
}

export const TABLE_UI_LABELS_EN: TableUiLabels = {
  grid: 'Data grid',
  loading: 'Loading…',
  error: 'The data could not be loaded.',
  empty: 'No rows to show.',
  keyboardHelp:
    'Use the arrow keys to move between cells, Home and End for the first and last cell of a row, Page Up and Page Down to move a screen at a time, Enter to open the focused row, and Space to select it.',
};

export const TABLE_UI_LABELS_AR: TableUiLabels = {
  grid: 'شبكة بيانات',
  loading: 'جارٍ التحميل…',
  error: 'تعذّر تحميل البيانات.',
  empty: 'لا توجد صفوف لعرضها.',
  keyboardHelp:
    'استخدم مفاتيح الأسهم للتنقل بين الخلايا، و Home و End لأول خلية وآخر خلية في الصف، و Page Up و Page Down للتنقل شاشةً كاملة، و Enter لفتح الصف الذي عليه التركيز، ومسافة لتحديده.',
};

/**
 * The label set for a locale, defaulting to English.
 *
 * It is a plain function (not a DI token) because it is pure and the UI entry
 * must stay usable without a provider — the same rule the core follows.
 */
export function tableUiLabels(locale: string | undefined): TableUiLabels {
  return locale?.toLowerCase().startsWith('ar')
    ? TABLE_UI_LABELS_AR
    : TABLE_UI_LABELS_EN;
}

/**
 * What a projected `[rvTableCell]` template receives.
 *
 * `$implicit` is the {@link TableRow} wrapper — the same shape the `rows`
 * input holds — so `let-row` is what the grid itself sees. `data` is the
 * consumer's own object, `value` is the accessor's resolved value BEFORE
 * `format`, and `column` is the column definition. The value is untrusted
 * (`unknown`) because the grid does not know the column's value type.
 *
 * ```html
 * <ng-template rvTableCell="actions" let-row let-data="data">
 *   <button (click)="open(row.id)">Open {{ data.number }}</button>
 * </ng-template>
 * ```
 */
export interface TableUiCellContext<T = unknown> {
  readonly $implicit: TableRow<T>;
  /** The same row under a named key, for templates that already destructure. */
  readonly row: TableRow<T>;
  /** The consumer's own object (`row.data`). */
  readonly data: T;
  /** The accessor's value before `column.format`. */
  readonly value: unknown;
  /** The renderer-facing column definition the grid rendered. */
  readonly column: TableUiColumn;
  /** Position inside the rendered page, not the index in the full data set. */
  readonly rowIndex: number;
}

/** Payload of `(selectionChange)`: the new set AND which row moved it. */
export interface TableUiSelectionChange<T = unknown> {
  readonly selected: ReadonlySet<TableRowId>;
  /** `null` when no single row caused the change (programmatic or clear-all). */
  readonly row: TableRow<T> | null;
}

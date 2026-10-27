import type { FilterState, SortState, TableColumn, TableRow } from '../models/table.models';

/*
 * The row pipeline: filter -> search -> sort -> page, as pure functions.
 *
 * Nothing here imports Angular and nothing mutates its input. The controller
 * composes these into `computed`s, which is what gives incremental
 * recomputation: changing the page does not re-sort, changing the sort does
 * not re-filter. Keeping them free of signals also makes them usable by a
 * headless consumer and testable without a TestBed.
 */

/**
 * The value of one cell, resolved through the column's accessor.
 *
 * The accessor is either a key or a function (the shared contract allows
 * both), so every consumer — the pipeline, the span engine, a custom renderer
 * — reads a cell the same way. A display/action column has no accessor and
 * therefore no value; `undefined` is the honest answer, not an error.
 */
export function readCellValue<T, V = unknown>(
  column: TableColumn<T, V>,
  row: TableRow<T>,
): V | undefined {
  const accessor = column.accessor;
  if (accessor === undefined) return undefined;
  if (typeof accessor === 'string') {
    // The key form is a runtime index; TS cannot prove it exists on a generic
    // `T`, and the column author already asserted it by choosing the key.
    const keyed = row.data as unknown as Record<string, V | undefined>;
    return keyed[accessor];
  }
  return accessor(row.data);
}

/**
 * A range filter value. Bounds are inclusive and either side may be open, so
 * one shape covers "from", "to" and "between" for both numbers and dates.
 *
 * Numbers and dates share it on purpose: a date bound is compared as a
 * timestamp and a numeric bound as a number, which is exactly what a date
 * input and a number input produce in the UI.
 */
export interface TableFilterRange {
  readonly min?: number | Date | null;
  readonly max?: number | Date | null;
}

/** The result of `paginate`, with the display range the footer needs. */
export interface TablePage<T> {
  readonly pageRows: readonly TableRow<T>[];
  /** Rows before pagination. */
  readonly total: number;
  /** `ceil(total / pageSize)`; `0` when there is no row. */
  readonly pageCount: number;
  /** 1-based index of the first row on this page; `0` when the page is empty. */
  readonly start: number;
  /** 1-based index of the last row on this page; `0` when the page is empty. */
  readonly end: number;
}

const COLLATORS = new Map<string, Intl.Collator>();

/**
 * One collator per locale, cached. `Intl.Collator` construction is expensive
 * and a sort asks it once per comparison; `numeric` makes "item 10" sort after
 * "item 9", and `base` ignores case and accents so `Ahmed` and `أحمد` behave
 * like a human expects in a search-and-sort list.
 */
function collatorFor(locale: string): Intl.Collator {
  const key = locale === '' ? 'en' : locale;
  const cached = COLLATORS.get(key);
  if (cached !== undefined) return cached;
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(key, { numeric: true, sensitivity: 'base' });
  } catch {
    // An invalid locale tag must degrade to the runtime default, never break
    // a render: a table that throws on `locale = ''` is worse than an
    // approximate order.
    collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  }
  COLLATORS.set(key, collator);
  return collator;
}

/**
 * Case-, accent- and Arabic-aware search key: NFD decomposition, combining
 * marks, tashkeel, tatweel, the alef forms, alef maqsura, hamza carriers and
 * ta marbuta. The same rules the select's search documents — a user typing
 * `احمد` must find `أحمد`, and `محمود` must find `محمّد`.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** An empty string, `null`, `undefined` or an empty array means "no filter". */
function isActiveFilter(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return !Array.isArray(value) || value.length > 0;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

/**
 * A comparable timestamp for a date-ish or numeric cell/ bound.
 *
 * Numeric strings are read as numbers BEFORE `Date.parse`, because
 * `Date.parse('5')` happily returns a 2001 date and would make a numeric range
 * silently match nothing.
 */
function toTime(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isRange(value: unknown): value is TableFilterRange {
  return typeof value === 'object' && value !== null && ('min' in value || 'max' in value);
}

function matchesRange(cell: unknown, range: TableFilterRange): boolean {
  const min = range.min === null || range.min === undefined ? null : toTime(range.min);
  const max = range.max === null || range.max === undefined ? null : toTime(range.max);
  if (min === null && max === null) return true;
  const time = toTime(cell);
  if (time === null) return false;
  return (min === null || time >= min) && (max === null || time <= max);
}

/**
 * What a filter value means is decided by its SHAPE, because the shared
 * contract stores it as `unknown` and a column carries no filter kind.
 * `'text'` -> substring, `true` -> boolean, `5` -> number, `Date` -> day,
 * `[...]` -> one of, `{min,max}` -> range. Everything else falls back to
 * identity, which is safe: an unrecognised filter can only be too strict,
 * never silently match everything.
 */
function matchesFilter(cell: unknown, filter: unknown): boolean {
  if (Array.isArray(filter)) return filter.some((item) => Object.is(item, cell));
  if (typeof filter === 'boolean') return Boolean(cell) === filter;
  if (filter instanceof Date) {
    const time = toTime(cell);
    return time !== null && time === filter.getTime();
  }
  if (typeof filter === 'number') {
    const numeric = toNumber(cell);
    return numeric !== null && numeric === filter;
  }
  if (typeof filter === 'bigint') {
    const numeric = toNumber(cell);
    return numeric !== null && numeric === Number(filter);
  }
  if (isRange(filter)) return matchesRange(cell, filter);
  if (typeof filter === 'string') {
    return normalizeSearchText(String(cell ?? '')).includes(normalizeSearchText(filter));
  }
  return Object.is(cell, filter);
}

/**
 * Keeps the rows that satisfy EVERY active filter.
 *
 * A filter on a column that is hidden, unknown, or has no accessor is ignored
 * rather than treated as "match nothing": a saved view that references a
 * removed column should lose that constraint, not empty the table.
 */
export function applyFilters<T>(
  rows: readonly TableRow<T>[],
  columns: readonly TableColumn<T>[],
  filters: readonly FilterState[],
): readonly TableRow<T>[] {
  if (filters.length === 0) return rows;

  const byId = new Map(columns.map((column) => [column.id, column]));
  const plan: Array<{ readonly column: TableColumn<T>; readonly value: unknown }> = [];
  for (const filter of filters) {
    if (!isActiveFilter(filter.value)) continue;
    const column = byId.get(filter.column);
    if (column === undefined || column.accessor === undefined) continue;
    plan.push({ column, value: filter.value });
  }
  if (plan.length === 0) return rows;

  return rows.filter((row) => {
    for (const entry of plan) {
      if (!matchesFilter(readCellValue(entry.column, row), entry.value)) return false;
    }
    return true;
  });
}

/**
 * Global search across every column that has a value.
 *
 * Display columns are skipped (they hold no data), and the needle is
 * normalized with the same Arabic rules as the filters, so search finds a name
 * written with or without diacritics. An empty search returns the input array
 * unchanged — identity matters, because the controller's `computed` chain
 * uses it to avoid downstream work.
 */
export function applySearch<T>(
  rows: readonly TableRow<T>[],
  columns: readonly TableColumn<T>[],
  search: string,
): readonly TableRow<T>[] {
  const needle = normalizeSearchText(search.trim());
  if (needle === '') return rows;
  const searchable = columns.filter((column) => column.accessor !== undefined);
  if (searchable.length === 0) return [];

  return rows.filter((row) => {
    for (const column of searchable) {
      const value = readCellValue(column, row);
      if (value === null || value === undefined) continue;
      if (normalizeSearchText(String(value)).includes(needle)) return true;
    }
    return false;
  });
}

/**
 * Compares two present (non-nullish) values. `column.comparator` wins when the
 * consumer declared one, because only the consumer knows what the value means.
 */
function comparePresent(
  left: unknown,
  right: unknown,
  comparator: ((left: unknown, right: unknown) => number) | undefined,
  collator: Intl.Collator,
): number {
  if (comparator !== undefined) return comparator(left, right);
  if (left instanceof Date && right instanceof Date) {
    const a = left.getTime();
    const b = right.getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === 'bigint' && typeof right === 'bigint') {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return left === right ? 0 : left ? 1 : -1;
  }
  return collator.compare(String(left), String(right));
}

/**
 * Multi-level, stable sort with nulls LAST in both directions.
 *
 * Two decisions worth stating: a missing value always sorts to the end (a
 * blank salary at the top of an ascending list is noise, and flipping it with
 * the direction would put it at the top of a descending one too), and the
 * pre-sort index is the final tie-break, so equal keys keep their order even
 * on an engine whose sort is not stable.
 *
 * Sort levels that reference a hidden, unknown or accessor-less column are
 * skipped rather than applied as a no-op, so `sorting` never lies about what
 * is active.
 */
export function applySort<T>(
  rows: readonly TableRow<T>[],
  columns: readonly TableColumn<T>[],
  sorting: readonly SortState[],
  locale = 'en',
): readonly TableRow<T>[] {
  if (sorting.length === 0) return rows;

  const byId = new Map(columns.map((column) => [column.id, column]));
  const plan: Array<{
    readonly state: SortState;
    readonly column: TableColumn<T>;
  }> = [];
  for (const state of sorting) {
    const column = byId.get(state.column);
    if (column === undefined || column.accessor === undefined) continue;
    plan.push({ state, column });
  }
  if (plan.length === 0) return rows;

  const collator = collatorFor(locale);
  // Keys are read once per row, not once per comparison: at 10k rows the
  // accessor would otherwise run ~130k times instead of 10k.
  const keyed = rows.map((row) => ({
    row,
    keys: plan.map((entry) => readCellValue(entry.column, row)),
  }));

  keyed.sort((a, b) => {
    for (let index = 0; index < plan.length; index++) {
      const left = a.keys[index];
      const right = b.keys[index];
      const leftMissing = isNullish(left);
      const rightMissing = isNullish(right);
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) continue;
        return leftMissing ? 1 : -1;
      }
      const entry = plan[index];
      const result = comparePresent(left, right, entry.column.comparator, collator);
      if (result !== 0) return entry.state.direction === 'desc' ? -result : result;
    }
    return a.row.index - b.row.index;
  });

  return keyed.map((entry) => entry.row);
}

/**
 * Slices one page and reports the footer's numbers.
 *
 * `start` / `end` are 1-based and inclusive ("1-25 of 12,345"), and both are 0
 * when the page holds nothing — a page past the end is legal and returns an
 * empty page, it is not silently clamped to the last one (clamping would hide
 * a controller bug and lie about the requested state).
 *
 * A non-positive / non-finite `pageSize` means "no pagination": every row on
 * one page. That is a deliberate degradation rather than a crash.
 */
export function paginate<T>(
  rows: readonly TableRow<T>[],
  page: number,
  pageSize: number,
): TablePage<T> {
  const total = rows.length;
  const size = Number.isFinite(pageSize) ? Math.floor(pageSize) : 0;
  const currentPage = Number.isFinite(page) ? Math.max(0, Math.floor(page)) : 0;

  if (size <= 0) {
    return {
      pageRows: rows,
      total,
      pageCount: total > 0 ? 1 : 0,
      start: total > 0 ? 1 : 0,
      end: total,
    };
  }

  const pageCount = Math.ceil(total / size);
  const offset = currentPage * size;
  const pageRows = offset >= total ? [] : rows.slice(offset, offset + size);

  return {
    pageRows,
    total,
    pageCount,
    start: pageRows.length === 0 ? 0 : offset + 1,
    end: pageRows.length === 0 ? 0 : offset + pageRows.length,
  };
}

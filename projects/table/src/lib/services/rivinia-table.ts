import { computed, isDevMode, linkedSignal, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import type {
  FilterState,
  SortState,
  TableColumn,
  TableRequest,
  TableRow,
  TableRowId,
  TableState,
} from '../models/table.models';
import { assertSpanColumns, buildSpanModel } from '../utils/spans';
import type { SpanModel } from '../models/table.models';
import { applyFilters, applySearch, applySort, paginate } from '../utils/table-pipeline';

/** How many rows a table can select. */
export type TableSelectionKind = 'none' | 'single' | 'multi';

/**
 * The shape of the selection set (not how many rows may be selected).
 *
 * `include` lists the selected ids; `exclude` means "everything the current
 * rows contain, minus these". The second form is what makes "select all 12,345
 * matching rows" representable without materializing 12,345 ids, and it is why
 * a server can be sent `{ all: true, except: [...] }` instead.
 */
export type TableSelectionMode = 'include' | 'exclude';

/** Which rows "select all" covers. */
export type TableSelectionScope = 'page' | 'filtered' | 'all';

/** Selection configuration. Absent means selection is off. */
export interface TableSelectionOptions {
  /**
   * `'none'` renders no selection affordance and makes every method a no-op.
   * @default 'none'
   */
  readonly mode?: TableSelectionKind;
  /**
   * Scope used by `selectAll()` when the caller does not pass one.
   * @default 'filtered'
   */
  readonly selectAllScope?: TableSelectionScope;
}

/**
 * Server-mode loader shape. Declared so the public contract is stable, but
 * NOT wired in 0.1.0: the client-only build never fetches.
 */
export interface TableServerOptions<T> {
  readonly load: (
    request: TableRequest,
    context: { readonly abortSignal: AbortSignal },
  ) => Promise<{ readonly items: readonly T[]; readonly total: number }>;
}

/**
 * Everything `createTable()` needs.
 *
 * It is a FUNCTION, not an object, because every read must happen inside the
 * controller's `computed`s: passing `data: () => this.api.rows()` (a signal
 * read) is what makes the row model react to new data without a subscription
 * or a `reload()` call.
 */
export interface TableOptions<T> {
  /** The declared columns, in display order. */
  readonly columns: () => readonly TableColumn<T>[];
  /** Client mode: the whole data set. */
  readonly data?: () => readonly T[];
  /** Server mode: declared only, not wired in 0.1.0 (the table warns). */
  readonly server?: TableServerOptions<T>;
  /**
   * Row identity. Defaults to `row.id`, then a per-object generated id kept in
   * a `WeakMap`. Never the array index: an index changes under sorting and
   * filtering, and would silently break selection and focus.
   */
  readonly getRowId?: (row: T) => TableRowId;
  /** Locale for collation and formatting; read lazily so it can be a signal. */
  readonly locale?: () => string;
  /** Selection configuration; absent = selection off. */
  readonly selection?: TableSelectionOptions;
  /**
   * Rows per page. `initialState.pageSize` — a restored view — wins over it, so
   * a saved state is never silently replaced by the default.
   * @default 25
   */
  readonly pageSize?: number;
  /** The saved view the table starts from. */
  readonly initialState?: Partial<TableState>;
  /** Skip the client filter/search stage (the caller filtered the data). */
  readonly manualFiltering?: boolean;
  /** Skip the client sort stage (the caller sorted the data). */
  readonly manualSorting?: boolean;
  /** Skip the client page stage (the caller paged the data). */
  readonly manualPagination?: boolean;
  /** Total row count when the data comes from outside. */
  readonly rowCount?: () => number;
  /** Diagnostic sink for span/clamp messages. Defaults to dev-mode console. */
  readonly warn?: (message: string) => void;
}

/**
 * Row selection as the UI sees it.
 *
 * Reads are signals so a header checkbox and every row cell update together;
 * writes are methods because they must normalize the include/exclude mode and
 * respect `mode: 'none' | 'single'`.
 */
export interface RiviniaTableSelection {
  /** True when selection is enabled at all (the UI renders no box otherwise). */
  readonly enabled: boolean;
  /** True for multi-select; false for single-select (checkbox vs radio). */
  readonly multiple: boolean;
  /** Include or exclude set. */
  readonly mode: Signal<TableSelectionMode>;
  /** Selected ids, in row order, limited to the rows the table currently holds. */
  readonly ids: Signal<readonly TableRowId[]>;
  /** `ids().length`. */
  readonly count: Signal<number>;
  select(id: TableRowId): void;
  deselect(id: TableRowId): void;
  toggle(id: TableRowId): void;
  /** Clears the selection (including "select all", in every mode). */
  clear(): void;
  isSelected(id: TableRowId): boolean;
  /** Adds every row of the current page; in exclude mode it re-includes them. */
  selectAllOnPage(): void;
  /**
   * `'page'` selects the page; `'filtered'`/`'all'` switch to exclude mode
   * with nothing excluded, i.e. every matching row (and any future one).
   */
  selectAll(scope?: TableSelectionScope): void;
}

const DEFAULT_PAGE_SIZE = 25;

interface SelectionState {
  readonly mode: TableSelectionMode;
  readonly ids: ReadonlySet<TableRowId>;
}

interface SelectionConfig<T> {
  readonly rows: Signal<readonly TableRow<T>[]>;
  readonly pageRows: Signal<readonly TableRow<T>[]>;
  readonly kind: TableSelectionKind;
  readonly defaultScope: TableSelectionScope;
  readonly initial: { readonly mode: TableSelectionMode; readonly ids: readonly TableRowId[] };
}

const NO_IDS: ReadonlySet<TableRowId> = new Set<TableRowId>();
const EMPTY_SELECTION: SelectionState = { mode: 'include', ids: NO_IDS };

/**
 * Drops ids that no longer exist in `rows`.
 *
 * This is the rule that keeps a filtered-out row from staying "selected" and
 * reappearing as part of a batch action the user cannot see. It returns the
 * SAME object when nothing was dropped, so a sort or a page change (which
 * produce a new rows array with the same ids) does not churn the selection.
 */
function pruneSelection(
  state: SelectionState,
  rows: readonly { readonly id: TableRowId }[],
): SelectionState {
  if (state.ids.size === 0) return state;
  const present = new Set<TableRowId>();
  for (const row of rows) present.add(row.id);
  let dropped = false;
  const next = new Set<TableRowId>();
  for (const id of state.ids) {
    if (present.has(id)) next.add(id);
    else dropped = true;
  }
  return dropped ? { mode: state.mode, ids: next } : state;
}

/** Immutable set helpers: every write produces a new state object. */
function withId(ids: ReadonlySet<TableRowId>, id: TableRowId): ReadonlySet<TableRowId> {
  if (ids.has(id)) return ids;
  const next = new Set(ids);
  next.add(id);
  return next;
}

function withoutId(ids: ReadonlySet<TableRowId>, id: TableRowId): ReadonlySet<TableRowId> {
  if (!ids.has(id)) return ids;
  const next = new Set(ids);
  next.delete(id);
  return next;
}

/**
 * The selection implementation. Deliberately NOT exported: consumers receive
 * it through `table.selection` typed as `RiviniaTableSelection`, so there is
 * one contract and no second way to construct selection state.
 */
class RiviniaSelection<T> implements RiviniaTableSelection {
  readonly enabled: boolean;
  readonly multiple: boolean;
  readonly mode: Signal<TableSelectionMode>;
  readonly ids: Signal<readonly TableRowId[]>;
  readonly count: Signal<number>;

  private readonly rows: Signal<readonly TableRow<T>[]>;
  private readonly pageRows: Signal<readonly TableRow<T>[]>;
  private readonly defaultScope: TableSelectionScope;
  private readonly initial: SelectionState;
  /**
   * A linked signal, not a plain one: when the row set changes the ids are
   * pruned IN THE SAME READ, so no stale id can survive a filter change and
   * no effect (or injection context) is needed to do it.
   */
  private readonly state: WritableSignal<SelectionState>;

  constructor(config: SelectionConfig<T>) {
    this.rows = config.rows;
    this.pageRows = config.pageRows;
    this.defaultScope = config.defaultScope;
    this.initial = { mode: config.initial.mode, ids: new Set(config.initial.ids) };
    this.enabled = config.kind !== 'none';
    this.multiple = config.kind === 'multi';
    this.state = linkedSignal<readonly TableRow<T>[], SelectionState>({
      source: config.rows,
      computation: (rows, previous) => pruneSelection(previous?.value ?? this.initial, rows),
    });
    this.mode = computed(() => this.state().mode);
    this.ids = computed(() => this.selectedIds());
    this.count = computed(() => this.ids().length);
  }

  select(id: TableRowId): void {
    if (!this.enabled) return;
    const state = this.state();
    if (!this.multiple) {
      if (state.mode === 'include' && state.ids.size === 1 && state.ids.has(id)) return;
      this.state.set({ mode: 'include', ids: new Set([id]) });
      return;
    }
    if (state.mode === 'include') {
      const ids = withId(state.ids, id);
      if (ids !== state.ids) this.state.set({ mode: 'include', ids });
      return;
    }
    const ids = withoutId(state.ids, id);
    if (ids !== state.ids) this.state.set({ mode: 'exclude', ids });
  }

  deselect(id: TableRowId): void {
    if (!this.enabled) return;
    const state = this.state();
    if (state.mode === 'include') {
      const ids = withoutId(state.ids, id);
      if (ids !== state.ids) this.state.set({ mode: 'include', ids });
      return;
    }
    const ids = withId(state.ids, id);
    if (ids !== state.ids) this.state.set({ mode: 'exclude', ids });
  }

  toggle(id: TableRowId): void {
    if (this.isSelected(id)) this.deselect(id);
    else this.select(id);
  }

  clear(): void {
    if (!this.enabled) return;
    this.state.set(EMPTY_SELECTION);
  }

  isSelected(id: TableRowId): boolean {
    if (!this.enabled) return false;
    const state = this.state();
    return state.mode === 'include' ? state.ids.has(id) : !state.ids.has(id);
  }

  selectAllOnPage(): void {
    if (!this.enabled || !this.multiple) return;
    const page = this.pageRows();
    if (page.length === 0) return;
    const state = this.state();
    if (state.mode === 'include') {
      let ids = state.ids;
      for (const row of page) ids = withId(ids, row.id);
      if (ids !== state.ids) this.state.set({ mode: 'include', ids });
      return;
    }
    let ids = state.ids;
    for (const row of page) ids = withoutId(ids, row.id);
    if (ids !== state.ids) this.state.set({ mode: 'exclude', ids });
  }

  selectAll(scope?: TableSelectionScope): void {
    if (!this.enabled || !this.multiple) return;
    const resolved = scope ?? this.defaultScope;
    if (resolved === 'page') {
      this.selectAllOnPage();
      return;
    }
    // Nothing matches, so there is nothing to select — entering exclude mode
    // here would select rows that appear later, which is not what was asked.
    if (this.rows().length === 0) return;
    this.state.set({ mode: 'exclude', ids: NO_IDS });
  }

  /** Serializable selection, in the shape `TableState` expects. */
  toState(): {
    readonly selected: readonly TableRowId[];
    readonly excluded: readonly TableRowId[];
  } {
    const state = this.state();
    if (state.mode === 'exclude') {
      return { selected: [], excluded: [...state.ids] };
    }
    return { selected: [...state.ids], excluded: [] };
  }

  /** Restores a saved view. Pruned immediately so a stale id never leaks. */
  restore(selection: {
    readonly mode: TableSelectionMode;
    readonly ids: readonly TableRowId[];
  }): void {
    if (!this.enabled) return;
    this.state.set(
      pruneSelection({ mode: selection.mode, ids: new Set(selection.ids) }, this.rows()),
    );
  }

  private selectedIds(): readonly TableRowId[] {
    const state = this.state();
    const ids: TableRowId[] = [];
    for (const row of this.rows()) {
      const listed = state.ids.has(row.id);
      if (state.mode === 'include' ? listed : !listed) ids.push(row.id);
    }
    return ids;
  }
}

function buildRows<T>(data: readonly T[], getId: (row: T) => TableRowId): readonly TableRow<T>[] {
  const rows = new Array<TableRow<T>>(data.length);
  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    rows[index] = { id: getId(item), data: item, index };
  }
  return rows;
}

/**
 * Re-numbers `index` after filtering and sorting.
 *
 * `TableRow.index` is documented as the position in `rows`, and the UI uses it
 * for `aria-rowindex`; leaving the source position there would make the grid
 * announce a row number that does not exist on screen.
 */
function reindex<T>(rows: readonly TableRow<T>[]): readonly TableRow<T>[] {
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].index !== index) {
      return rows.map((row, position) => ({ id: row.id, data: row.data, index: position }));
    }
  }
  return rows;
}

function normalizePage(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizePageSize(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_PAGE_SIZE;
}

/**
 * The table, as a chain of `computed`s — one per pipeline stage.
 *
 * `data -> rows (filter, search, sort) -> pageRows -> spans` means Angular's
 * own caching gives incremental recomputation for free: a page change does not
 * re-sort, a sort does not re-filter, and selection/scroll never rebuild the
 * span matrix because nothing in that chain reads them.
 *
 * The controller owns no fetching and no DOM. It is constructed outside the
 * injector graph (`createTable` needs no provider), which is what lets a
 * consumer build one inside a component field initializer or inside a test.
 */
export class RiviniaTable<T> {
  /** The declared columns, hidden ones included, in display order. */
  readonly columns: Signal<readonly TableColumn<T>[]>;
  /** The columns that render: `columns` without `hidden: true`. */
  readonly visibleColumns: Signal<readonly TableColumn<T>[]>;
  /** Filtered and sorted rows, numbered from 0. */
  readonly rows: Signal<readonly TableRow<T>[]>;
  /** The current page of `rows`. */
  readonly pageRows: Signal<readonly TableRow<T>[]>;
  /** The resolved span grid over `pageRows` x `visibleColumns`. */
  readonly spans: Signal<SpanModel>;
  /** Client row count, or `rowCount()` when the data comes from outside. */
  readonly total: Signal<number>;
  /** `ceil(total / pageSize)`; `0` for an empty table. */
  readonly pageCount: Signal<number>;

  /** Ordered multi-sort; index 0 is the primary level. */
  readonly sorting: WritableSignal<readonly SortState[]>;
  /** Active column filters, ANDed together. */
  readonly filters: WritableSignal<readonly FilterState[]>;
  /** Global search across every data column. */
  readonly globalSearch: WritableSignal<string>;
  /**
   * 0-based page. A linked signal: it returns to 0 when the filter, sort or
   * search changes (the result set changed under the user), while an explicit
   * `set()` still wins until the next such change.
   */
  readonly page: WritableSignal<number>;
  readonly pageSize: WritableSignal<number>;
  readonly selection: RiviniaTableSelection;

  /** What a server-mode fetch would need; `data`-driven tables ignore it. */
  readonly request: Signal<TableRequest>;
  /** The serializable slice: a saved view, a URL, a test assertion. */
  readonly state: Signal<TableState>;

  private readonly options: () => TableOptions<T>;
  private readonly initialState: Partial<TableState>;
  /** What `resetState()` returns to: the restored size, else the option. */
  private readonly defaultPageSize: number;
  private readonly warn: (message: string) => void;
  private readonly warned = new Set<string>();
  private readonly generatedIds = new WeakMap<object, string>();
  private readonly selectionImpl: {
    toState(): {
      readonly selected: readonly TableRowId[];
      readonly excluded: readonly TableRowId[];
    };
    restore(selection: {
      readonly mode: TableSelectionMode;
      readonly ids: readonly TableRowId[];
    }): void;
  };
  private generatedIdSeq = 0;

  constructor(options: () => TableOptions<T>) {
    this.options = options;
    this.initialState = options().initialState ?? {};

    const warnOption = options().warn;
    this.warn = (message: string): void => {
      // One message per defect per table: a span diagnostic repeats on every
      // page rebuild, and a console flooded 20 times is a console ignored.
      if (this.warned.has(message)) return;
      this.warned.add(message);
      if (warnOption !== undefined) warnOption(message);
      else if (isDevMode()) console.warn(`[rivinia/table] ${message}`);
    };

    if (options().server !== undefined) {
      this.warn(
        'server mode is not implemented yet; nothing will be fetched. ' +
          'Pass `data` and let the app own the request for now',
      );
    }

    assertSpanColumns(options().columns(), { warn: this.warn });

    const initial = this.initialState;
    const selectionOptions = options().selection;

    this.columns = computed(() => this.options().columns());
    this.visibleColumns = computed(() => this.columns().filter((column) => column.hidden !== true));

    this.sorting = signal<readonly SortState[]>(initial.sort ?? []);
    this.filters = signal<readonly FilterState[]>(initial.filters ?? []);
    this.globalSearch = signal(initial.search ?? '');
    this.defaultPageSize = normalizePageSize(
      initial.pageSize ?? options().pageSize ?? DEFAULT_PAGE_SIZE,
    );
    this.pageSize = signal(this.defaultPageSize);
    this.page = linkedSignal<string, number>({
      source: () => JSON.stringify([this.filters(), this.sorting(), this.globalSearch()]),
      computation: (_signature, previous) =>
        previous === undefined ? normalizePage(initial.page ?? 0) : 0,
    });

    this.rows = computed<readonly TableRow<T>[]>(() => {
      const current = this.options();
      const data = current.data?.() ?? [];
      const getId = current.getRowId ?? this.defaultRowId;
      const columns = this.visibleColumns();
      const all = buildRows(data, getId);
      const filtered = current.manualFiltering
        ? all
        : applySearch(applyFilters(all, columns, this.filters()), columns, this.globalSearch());
      const sorted = current.manualSorting
        ? filtered
        : applySort(filtered, columns, this.sorting(), current.locale?.() ?? 'en');
      return reindex(sorted);
    });

    this.total = computed(() => this.options().rowCount?.() ?? this.rows().length);
    this.pageRows = computed<readonly TableRow<T>[]>(() => {
      if (this.options().manualPagination) return this.rows();
      return paginate(this.rows(), this.page(), this.pageSize()).pageRows;
    });
    this.pageCount = computed(() => {
      const total = this.total();
      const size = this.pageSize();
      return size > 0 ? Math.ceil(total / size) : total > 0 ? 1 : 0;
    });

    const selection = new RiviniaSelection<T>({
      rows: this.rows,
      pageRows: this.pageRows,
      kind: selectionOptions?.mode ?? 'none',
      defaultScope: selectionOptions?.selectAllScope ?? 'filtered',
      initial: {
        // `excluded` wins when both are present: it is the only field that can
        // mean "everything except", and it is the narrower statement.
        mode: (initial.excluded?.length ?? 0) > 0 ? 'exclude' : 'include',
        ids:
          (initial.excluded?.length ?? 0) > 0 ? (initial.excluded ?? []) : (initial.selected ?? []),
      },
    });
    this.selection = selection;
    this.selectionImpl = selection;

    this.spans = computed(() =>
      buildSpanModel(this.pageRows(), this.visibleColumns(), {
        warn: this.warn,
        // A runtime column swap must never throw during render; `span` wins.
        strict: false,
      }),
    );

    this.request = computed<TableRequest>(() => ({
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sorting(),
      filters: this.filters(),
      search: this.globalSearch(),
    }));

    this.state = computed<TableState>(() => {
      const columns = this.columns();
      const selected = selection.toState();
      return {
        sort: this.sorting(),
        filters: this.filters(),
        search: this.globalSearch(),
        page: this.page(),
        pageSize: this.pageSize(),
        order: columns.map((column) => column.id),
        hidden: columns.filter((column) => column.hidden === true).map((column) => column.id),
        pinnedStart: columns
          .filter((column) => column.pinned === 'start')
          .map((column) => column.id),
        pinnedEnd: columns.filter((column) => column.pinned === 'end').map((column) => column.id),
        selected: selected.selected,
        excluded: selected.excluded,
      };
    });
  }

  /**
   * Applies a saved view. Unknown fields are ignored on purpose: column order,
   * visibility and pinning are owned by the column list in 0.1.0, so a state
   * that carries them round-trips unchanged without pretending the controller
   * can reorder the consumer's columns.
   */
  setState(patch: Partial<TableState>): void {
    if (patch.sort !== undefined) this.sorting.set(patch.sort);
    if (patch.filters !== undefined) this.filters.set(patch.filters);
    if (patch.search !== undefined) this.globalSearch.set(patch.search);
    if (patch.pageSize !== undefined) this.pageSize.set(normalizePageSize(patch.pageSize));
    // `page.set` flushes the linked computation first, so the explicit page
    // survives the reset that the lines above just triggered.
    if (patch.page !== undefined) this.page.set(normalizePage(patch.page));
    if (patch.selected !== undefined || patch.excluded !== undefined) {
      const excluded = patch.excluded ?? [];
      this.selectionImpl.restore(
        excluded.length > 0
          ? { mode: 'exclude', ids: excluded }
          : { mode: 'include', ids: patch.selected ?? [] },
      );
    }
  }

  /** Returns to `initialState`, including the initial page and selection. */
  resetState(): void {
    const initial = this.initialState;
    this.sorting.set(initial.sort ?? []);
    this.filters.set(initial.filters ?? []);
    this.globalSearch.set(initial.search ?? '');
    this.pageSize.set(this.defaultPageSize);
    this.page.set(normalizePage(initial.page ?? 0));
    const excluded = initial.excluded ?? [];
    this.selectionImpl.restore(
      excluded.length > 0
        ? { mode: 'exclude', ids: excluded }
        : { mode: 'include', ids: initial.selected ?? [] },
    );
  }

  /**
   * `getRowId` -> `row.id` -> a per-object generated id.
   *
   * A primitive row has no identity of its own, so equal primitives collapse
   * into one id; that is documented, and `getRowId` is the answer.
   */
  private readonly defaultRowId = (row: T): TableRowId => {
    if (typeof row === 'object' && row !== null) {
      const candidate = (row as { readonly id?: unknown }).id;
      if (typeof candidate === 'string' || typeof candidate === 'number') return candidate;
      let generated = this.generatedIds.get(row);
      if (generated === undefined) {
        generated = `rv-row-${++this.generatedIdSeq}`;
        this.generatedIds.set(row, generated);
      }
      return generated;
    }
    return String(row);
  };
}

/**
 * Creates a table from a reactive options function.
 *
 * No DI, no injection context, no HTTP: the caller passes `data` as a signal
 * read and gets derived signals back, so the table is usable in a component
 * field initializer, in a test, or in a headless script.
 */
export function createTable<T>(options: () => TableOptions<T>): RiviniaTable<T> {
  return new RiviniaTable<T>(options);
}

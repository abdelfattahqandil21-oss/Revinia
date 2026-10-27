import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { TemplateRef } from '@angular/core';
import type {
  SortDirection,
  SortState,
  SpanModel,
  TableColumn,
  TableRowId,
  TextOverflow,
} from '@rivinia/table';

import type {
  TableUiCellContext,
  TableUiColumn,
  TableUiDensity,
  TableUiLabels,
  TableUiRow,
  TableUiSelectionChange,
} from '../../models/ui.types';
import { tableUiLabels } from '../../models/ui.types';
import { RvTableCell } from './rv-table-cell';

/** Per-instance counter: unique ids for the `aria-describedby` targets. */
let nextTableId = 0;

/**
 * 160px at a 16px root, the design's default column width. A column with no
 * `width` is never zero-wide, which would make its header unreachable.
 */
const DEFAULT_COLUMN_WIDTH = '10rem';

/** One cell as the template sees it — everything resolved, nothing computed there. */
interface RenderCell {
  readonly column: TableUiColumn;
  readonly columnIndex: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly spanned: boolean;
  readonly overflow: TextOverflow;
  /** `null` unless the column is a clamp column; drives `--rv-table-clamp-lines`. */
  readonly lines: number | null;
  readonly text: string;
  /** Id of the visually-hidden full-text node, when the cell can be cut off. */
  readonly describedBy: string | null;
  readonly template: TemplateRef<TableUiCellContext> | null;
  readonly context: TableUiCellContext;
  /** Explicit placement, so covered positions leave no auto-flow hole. */
  readonly gridRow: string;
  readonly gridColumn: string;
}

interface RenderRow {
  /** The effective row id (`[rowKey]` applied): what selection and tracking use. */
  readonly id: TableRowId;
  readonly row: TableUiRow;
  /** Position inside the rendered page. */
  readonly rowIndex: number;
  /** 1-based position in the FULL data set; the header is row 1. */
  readonly ariaRowIndex: number;
  readonly selected: boolean;
  readonly cells: readonly RenderCell[];
}

interface TableUiState {
  readonly kind: 'error' | 'empty';
  readonly message: string;
}

/**
 * `<rv-table>` — a `role="grid"` data grid, built from divs on purpose.
 *
 * ## Why not `<table>`
 * An interactive grid is `role="grid"`, not `role="table"`, so the roles have
 * to be written either way. Once they are, a native table adds layout
 * negotiation (`table-layout`), inconsistent sticky headers and no way to span
 * a cell across ROWS without owning the row structure. Divs + CSS grid keep
 * the geometry explicit and the ARIA exact.
 *
 * ## The consumer decides what a cell contains
 * The column list carries geometry and a header; the CELL is either the
 * column's `accessor` (+ optional `format`) or — for an actions column, a
 * badge, an avatar — a projected template keyed by column id:
 *
 * ```html
 * <rv-table [columns]="columns()" [rows]="rows()" [spans]="spans()" selectable>
 *   <ng-template rvTableCell="actions" let-row let-data="data">
 *     <button type="button" (click)="edit(row.id)">Edit {{ data.number }}</button>
 *   </ng-template>
 * </rv-table>
 * ```
 *
 * The table never knows that "actions" means actions: a column with an id and
 * no `accessor` renders only the projected template. A template also WINS over
 * an accessor when both exist — markup is an override, not a second source of
 * truth for the column list (`[columns]` stays the only one).
 *
 * ## Spans
 * `[spans]` is the core's resolved `SpanModel`: only anchors are rendered,
 * covered positions have no element at all (nothing is hidden with a flag), and
 * each anchor is placed on the shared CSS grid with an explicit
 * `grid-row: <start> / span <n>` and `grid-column: <start> / span <n>`. Because
 * the spans are real grid spans, a merged cell survives wrapping rows and
 * needs no height arithmetic. `aria-rowspan` / `aria-colspan` are written only
 * when greater than 1, and every cell carries `aria-colindex` (WAI-ARIA
 * requires it once the grid is not a simple matrix).
 *
 * ## Keyboard
 * One tab stop (roving `tabindex`), moved with the arrows through
 * `spans.move()` — so moving INTO a merged cell lands on its anchor and moving
 * inside one leaves it. Home/End pick the first/last anchor of the row,
 * PageUp/PageDown move a screen, Enter activates the row, Space toggles
 * selection. Horizontal arrows mirror in RTL; vertical ones never do.
 *
 * ## Theming
 * Every colour and shape is read AT THE USE SITE as
 * `var(--rv-table-<part>, var(--rv-<semantic>, <default>))`, so one
 * `:root { --rv-bg: … }` reaches the grid. Nothing is declared on the host, so
 * a token set anywhere on an ancestor wins (the D42/D46 rule).
 * `[density]` only changes the FALLBACK of the size tokens, so an explicit
 * token still wins over the preset.
 *
 * The override surface is documented and stable:
 * classes `.rv-table-scroller`, `.rv-table-grid`, `.rv-table-head`,
 * `.rv-table-head-cell`, `.rv-table-head-button`, `.rv-table-head-label`,
 * `.rv-table-body`, `.rv-table-row`, `.rv-table-cell`, `.rv-table-text`,
 * `.rv-table-sort`, `.rv-table-sort-rank`, `.rv-table-state`,
 * `.rv-table-skeleton`, `.rv-table-sr-only`;
 * hooks `[data-density]`, `[data-loading]`, `[data-sticky]`, `[data-selectable]`
 * on the host, `[data-sortable]`, `[data-sorted]`, `[data-sort-rank]`,
 * `[data-sort-direction]` on a header cell, and `[data-selected]`,
 * `[data-span]`, `[data-align]`, `[data-overflow]`, `[data-row]`, `[data-col]`
 * on a body cell. Component styles are injected at runtime and carry the
 * component's scope attribute, so a plain `.rv-table-cell { … }` in an app
 * stylesheet can lose at equal specificity: scope it as
 * `rv-table .rv-table-cell { … }`, or use the tokens.
 */
@Component({
  selector: 'rv-table',
  imports: [NgTemplateOutlet],
  templateUrl: './rv-table.html',
  styleUrl: './rv-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-density]': 'density()',
    '[attr.data-loading]': 'loading() ? "true" : null',
    '[attr.data-sticky]': 'stickyHeader() ? "true" : "false"',
    '[attr.data-selectable]': 'selectable() ? "true" : null',
  },
})
export class RiviniaTableComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly projectedCells = contentChildren(RvTableCell);

  /** The columns, in render order. Hidden ones are filtered out, not counted. */
  readonly columns = input.required<readonly TableUiColumn[]>();
  /** The page's rows (already filtered/sorted/paged by the consumer or core). */
  readonly rows = input<readonly TableUiRow[]>([]);
  /** The core's resolved span matrix for `rows` + visible columns. */
  readonly spans = input<SpanModel | null>(null);
  /** While true the grid is `aria-busy`, renders skeletons and no data rows. */
  readonly loading = input(false);
  /**
   * How many skeleton rows to draw. `'auto'` (default) mirrors the rows that
   * are currently rendered, at least one — so the layout does not jump.
   */
  readonly skeletonRows = input<number | 'auto'>('auto');
  /** A failed load. `null`/`undefined` means "no error". */
  readonly error = input<unknown>(null);
  /** Text of the empty state. Unset falls back to the locale's label. */
  readonly emptyMessage = input<string | undefined>(undefined);
  /**
   * Derives the id used by selection, tracking and `(rowActivate)` from the
   * row's data. Unset uses `TableRow.id`, which is already stable.
   */
  readonly rowKey = input<((row: any) => TableRowId) | undefined>(undefined);
  /** Renders row selection: `aria-selected`, Space, and click-to-select. */
  readonly selectable = input(false);
  /**
   * The selected row ids. Two-way: `[(selected)]`. A `Set` (not an array)
   * because every row asks "am I selected?" on every render.
   */
  readonly selected = model<ReadonlySet<TableRowId>>(new Set<TableRowId>());
  /**
   * The active sort, highest priority first. Two-way: `[(sort)]`, and the
   * model's own `(sortChange)` fires whenever this component changes it.
   */
  readonly sort = model<readonly SortState[]>([]);
  readonly density = input<TableUiDensity>('default');
  /** Sticks the header to the top of the scroller. */
  readonly stickyHeader = input(true);
  /**
   * The number of rows in the FULL result set, for `aria-rowcount` when the
   * consumer pages on the server. Unset derives it from the rows' `index`,
   * which is exact when the grid renders the whole set.
   */
  readonly totalRows = input<number | undefined>(undefined);
  /** Accessible name of the grid (`aria-label`). */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Overrides for the built-in English/Arabic text. */
  readonly labels = input<Partial<TableUiLabels> | undefined>(undefined);

  /** Enter on a focused cell, or a double-click on a row. */
  readonly rowActivate = output<TableUiRow>();
  /**
   * A row was selected/deselected by the user. The model already carries the
   * new set (`selectedChange`); this output also names the row that moved.
   */
  readonly selectionChange = output<TableUiSelectionChange>();
  // `(sortChange)` is generated by the `sort` model — no duplicate output here.

  protected readonly instructionsId = `rv-table-help-${++nextTableId}`;
  private readonly uid = nextTableId;

  protected readonly visibleColumns = computed(() =>
    this.columns().filter((column) => column.hidden !== true),
  );

  protected readonly columnCount = computed(() => this.visibleColumns().length);

  /**
   * The ONE column geometry both the header and the body read.
   *
   * A flex column keeps its declared width as the track's FLOOR
   * (`minmax(<width>, Nfr)`, design §5.2): with `minmax(0, Nfr)` a narrow
   * container would collapse the column to zero and its content would vanish
   * instead of scrolling. Fixed columns are their width, untouched.
   */
  protected readonly columnTemplate = computed(() => {
    const tracks = this.visibleColumns().map((column) => {
      const width = column.width ?? DEFAULT_COLUMN_WIDTH;
      const flex = column.flex ?? 0;
      return flex > 0 ? `minmax(${width}, ${flex}fr)` : width;
    });
    return tracks.length > 0 ? tracks.join(' ') : '1fr';
  });

  /**
   * The grid's intrinsic width, so the scroller actually scrolls instead of
   * squeezing every column. It is the sum of the declared widths — which is
   * why a column width should be a length (`px`, `rem`, `ch`), not `max-content`.
   */
  protected readonly minWidth = computed(() => {
    const widths = this.visibleColumns().map(
      (column) => `(${column.width ?? DEFAULT_COLUMN_WIDTH})`,
    );
    return `calc(${widths.length > 0 ? widths.join(' + ') : '0px'})`;
  });

  /**
   * `aria-label` written on the HOST — `<rv-table aria-label="Invoices">` — is
   * the attribute a consumer reaches for first, but the `role="grid"` element
   * lives INSIDE the component, so the attribute would otherwise stop at the
   * host and the grid would keep its fallback name ("Data grid"). Read on every
   * change detection: it is a `getAttribute` call, and a dynamic label belongs
   * on the `[ariaLabel]` input, which is reactive.
   */
  protected get hostLabel(): string | undefined {
    const label = this.host.nativeElement.getAttribute('aria-label')?.trim();
    return label ? label : undefined;
  }

  protected readonly effectiveLabels = computed<TableUiLabels>(() => ({
    ...tableUiLabels(this.locale()),
    ...this.labels(),
  }));

  protected readonly locale = computed(() => {
    const pageLanguage =
      typeof document !== 'undefined' ? document.documentElement.lang : '';
    if (pageLanguage) return pageLanguage;
    const browserLanguage =
      typeof navigator !== 'undefined' ? navigator.language : '';
    return browserLanguage || 'en-US';
  });

  /** Column id → the consumer's template. Rebuilt only when content changes. */
  private readonly cellTemplates = computed(() => {
    const templates = new Map<string, TemplateRef<TableUiCellContext>>();
    for (const directive of this.projectedCells()) {
      templates.set(directive.columnId(), directive.template);
    }
    return templates;
  });

  /**
   * Sort lookup by column id: direction plus 1-based priority. One map instead
   * of a linear search per rendered header cell.
   */
  private readonly sortIndex = computed(() => {
    const index = new Map<string, { direction: SortDirection; rank: number }>();
    this.sort().forEach((entry, position) =>
      index.set(entry.column, { direction: entry.direction, rank: position + 1 }),
    );
    return index;
  });

  /** The fully resolved view model. Nothing in the template computes. */
  protected readonly renderedRows = computed<readonly RenderRow[]>(() => {
    const templates = this.cellTemplates();
    const selected = this.selected();
    return this.rows().map((row, rowIndex) => {
      const id = this.rowId(row);
      return {
        id,
        row,
        rowIndex,
        ariaRowIndex:
          (Number.isFinite(row.index) ? row.index : rowIndex) + 2,
        selected: selected.has(id),
        cells: this.buildCells(row, rowIndex, templates),
      };
    });
  });

  protected readonly skeletonList = computed(() => {
    const requested = this.loading() ? this.skeletonRows() : 0;
    const count =
      requested === 'auto' ? Math.max(1, this.rows().length) : requested;
    return Array.from({ length: Math.max(0, Math.floor(count)) });
  });

  protected readonly state = computed<TableUiState | null>(() => {
    if (this.loading()) return null;
    const error = this.error();
    if (error !== null && error !== undefined) {
      return { kind: 'error', message: this.errorText(error) };
    }
    if (this.rows().length === 0) {
      return {
        kind: 'empty',
        message: this.emptyMessage() ?? this.effectiveLabels().empty,
      };
    }
    return null;
  });

  /**
   * The rows that actually have DOM cells. While loading the skeletons replace
   * them, and an error/empty state replaces them too, so the keyboard must not
   * "move" into a row that has no element to focus.
   */
  protected readonly bodyRows = computed<readonly RenderRow[]>(() =>
    this.loading() || this.state() !== null ? [] : this.renderedRows(),
  );

  /**
   * The header row is row 1 (WAI-ARIA counts the header), so the grid's row
   * count is the data count + 1. `-1` is legal ("unknown"), but a wrong count
   * is worse than an honest one, so `[totalRows]` is the precise answer when
   * the consumer pages on the server.
   */
  protected readonly rowCount = computed(() => {
    const total = this.totalRows();
    if (total !== undefined) return Math.max(0, Math.floor(total)) + 1;
    const rows = this.rows();
    let highest = rows.length;
    for (const row of rows) {
      if (Number.isFinite(row.index) && row.index + 1 > highest) {
        highest = row.index + 1;
      }
    }
    return highest + 1;
  });

  // ── Active cell (roving tabindex) ─────────────────────────────────────────

  /** Row index in the rendered page; `-1` is the header row. */
  private readonly active = signal<{ readonly row: number; readonly column: number }>({
    row: -1,
    column: 0,
  });
  private pendingFocus = false;

  /**
   * The active cell, clamped to what is actually rendered. A stale row index
   * (the data shrank) would otherwise leave the grid with no tab stop at all.
   * While loading there are no data cells, so the header is the tab stop.
   */
  protected readonly effectiveActive = computed(() => {
    const active = this.active();
    const columns = this.columnCount();
    if (columns === 0) return { row: -1, column: 0 };
    const column = Math.min(Math.max(active.column, 0), columns - 1);
    const rowCount = this.bodyRows().length;
    if (active.row < 0 || rowCount === 0) return { row: -1, column };
    return { row: Math.min(active.row, rowCount - 1), column };
  });

  constructor() {
    // Focus is applied AFTER the DOM has the new tabindex; focusing during the
    // keydown would land on an element that is about to be re-rendered.
    afterRenderEffect(() => {
      const active = this.effectiveActive();
      this.columnTemplate();
      if (!this.pendingFocus) return;
      this.pendingFocus = false;
      this.focusCell(active.row, active.column);
    });
  }

  protected isActive(row: number, column: number): boolean {
    const active = this.effectiveActive();
    return active.row === row && active.column === column;
  }

  // ── Header + sorting ──────────────────────────────────────────────────────

  protected isSortable(column: TableUiColumn): boolean {
    // A display/actions column has no value to sort: opt in explicitly to
    // avoid "sorting" a column whose order would look arbitrary.
    return column.sortable ?? column.accessor !== undefined;
  }

  protected sortRank(column: TableUiColumn): number {
    return this.sortIndex().get(column.id)?.rank ?? 0;
  }

  protected sortDirection(column: TableUiColumn): SortDirection | null {
    return this.sortIndex().get(column.id)?.direction ?? null;
  }

  /**
   * `aria-sort` lives on exactly ONE header (the highest-priority sort), as
   * WAI-ARIA requires; secondary sorted columns are shown with a rank badge
   * and announce `none`, because the attribute has no "secondary" value.
   */
  protected ariaSort(
    column: TableUiColumn,
  ): 'ascending' | 'descending' | 'none' | null {
    if (!this.isSortable(column)) return null;
    const entry = this.sortIndex().get(column.id);
    if (!entry || entry.rank !== 1) return 'none';
    return entry.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected onHeaderClick(
    column: TableUiColumn,
    columnIndex: number,
    event: MouseEvent,
  ): void {
    if (!this.isSortable(column)) return;
    this.active.set({ row: -1, column: columnIndex });
    this.pendingFocus = false;
    // The click landed on the inner button, which is `tabindex="-1"`; park
    // focus on the CELL so the grid keeps exactly one tab stop.
    this.focusCell(-1, columnIndex);
    this.cycleSort(column, event.shiftKey);
  }

  // ── Rows + selection ──────────────────────────────────────────────────────

  protected rowId(row: TableUiRow): TableRowId {
    const key = this.rowKey();
    return key ? key(row.data) : row.id;
  }

  protected onRowActivate(item: RenderRow): void {
    this.rowActivate.emit(item.row);
  }

  /**
   * A double-click is a row activation. It is ignored when it lands on an
   * interactive element inside a projected template: the action the user asked
   * for (Edit, Open, a link) must not also fire the row's own activation.
   */
  protected onRowDoubleClick(item: RenderRow, event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, label, [contenteditable="true"]',
      )
    ) {
      return;
    }
    this.onRowActivate(item);
  }

  protected onCellClick(
    item: RenderRow,
    cell: RenderCell,
    event: MouseEvent,
  ): void {
    const target = event.target as HTMLElement | null;
    // A button, link or input in a projected template owns its click: toggling
    // the row would fight the action the user actually asked for.
    if (
      target?.closest(
        'button, a, input, select, textarea, label, [contenteditable="true"]',
      )
    ) {
      return;
    }
    // A double-click is an activation; its second click must not undo the
    // selection the first one made.
    if (event.detail > 1) return;

    this.active.set({ row: item.rowIndex, column: cell.columnIndex });
    this.pendingFocus = false;
    this.focusCell(item.rowIndex, cell.columnIndex);
    if (this.selectable()) this.toggleRow(item.row);
  }

  protected onCellFocus(row: number, column: number): void {
    const active = this.active();
    if (active.row === row && active.column === column) return;
    // The user's own focus (click/tab) is already final: do not re-focus after
    // the render, which would fight `:focus-visible` and re-scroll the page.
    this.pendingFocus = false;
    this.active.set({ row, column });
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    // Only the CELL owns the grid keys. Anything focusable inside a projected
    // template (a button, an input) keeps its native keyboard behaviour.
    if (!target || !target.hasAttribute('data-rv-cell')) return;

    const rows = this.bodyRows();
    const active = this.effectiveActive();
    const rtl = this.isRtl(target);

    if ((event.ctrlKey || event.metaKey) && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      if (rows.length === 0) return;
      const row = event.key === 'Home' ? 0 : rows.length - 1;
      this.moveTo(row, event.key === 'Home' ? this.firstColumn(row) : this.lastColumn(row));
      return;
    }
    // Alt+Arrow is the browser's back/forward on some platforms; not ours yet.
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (active.row < 0) {
      this.onHeaderKey(event, active.column, rows.length);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        this.moveBy(1, 0);
        break;
      case 'ArrowUp':
        // The header is part of the grid, not decoration: up from the first
        // data row reaches the same column's header (and its sort action).
        if (active.row === 0) this.moveTo(-1, active.column);
        else this.moveBy(-1, 0);
        break;
      case 'ArrowLeft':
        this.moveBy(0, rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        this.moveBy(0, rtl ? -1 : 1);
        break;
      case 'Home':
        this.moveTo(active.row, this.firstColumn(active.row));
        break;
      case 'End':
        this.moveTo(active.row, this.lastColumn(active.row));
        break;
      case 'PageDown':
        this.page(1);
        break;
      case 'PageUp':
        this.page(-1);
        break;
      case 'Enter':
        // Enter opens a data row; on a header it sorts (see onHeaderKey).
        this.onRowActivate(rows[active.row]);
        break;
      case ' ':
        if (!this.selectable()) return;
        this.toggleRow(rows[active.row].row);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private onHeaderKey(
    event: KeyboardEvent,
    column: number,
    rowCount: number,
  ): void {
    const rtl = this.isRtl(event.target as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        if (rowCount > 0) this.moveTo(0, column);
        break;
      case 'ArrowLeft':
        this.moveTo(-1, column + (rtl ? 1 : -1));
        break;
      case 'ArrowRight':
        this.moveTo(-1, column + (rtl ? -1 : 1));
        break;
      case 'Home':
        this.moveTo(-1, 0);
        break;
      case 'End':
        this.moveTo(-1, this.columnCount() - 1);
        break;
      case 'Enter':
      case ' ': {
        const definition = this.visibleColumns()[column];
        if (definition) this.cycleSort(definition, event.shiftKey);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  }

  private cycleSort(column: TableUiColumn, additive: boolean): void {
    const current = this.sort();
    const position = current.findIndex((entry) => entry.column === column.id);
    const direction = position >= 0 ? current[position].direction : null;

    if (additive) {
      if (position < 0) {
        this.sort.set([...current, { column: column.id, direction: 'asc' }]);
      } else if (direction === 'asc') {
        this.sort.set(
          current.map((entry, index) =>
            index === position
              ? { column: entry.column, direction: 'desc' }
              : entry,
          ),
        );
      } else {
        this.sort.set(current.filter((_, index) => index !== position));
      }
      return;
    }

    // Clicking the only sorted column cycles asc -> desc -> unsorted.
    if (current.length === 1 && position === 0) {
      this.sort.set(
        direction === 'asc'
          ? [{ column: column.id, direction: 'desc' }]
          : [],
      );
      return;
    }
    // Any other click makes this column the ONLY sort.
    this.sort.set([
      { column: column.id, direction: direction === 'asc' ? 'desc' : 'asc' },
    ]);
  }

  /**
   * A page step stays inside the BODY. The header is reachable with ArrowUp,
   * but PageUp from the first data row must not surprise the user by landing on
   * the sort controls; page keys are a data-reading affordance.
   */
  private page(direction: 1 | -1): void {
    const rowCount = this.bodyRows().length;
    if (rowCount === 0) return;
    const active = this.effectiveActive();
    const room = direction > 0 ? rowCount - 1 - active.row : active.row;
    const step = direction * Math.min(this.pageRows(), Math.max(0, room));
    if (step === 0) return;
    this.moveBy(step, 0);
  }

  private moveBy(deltaRow: number, deltaColumn: number): void {
    const active = this.effectiveActive();
    const spans = this.spans();
    if (spans) {
      const target = spans.move(
        active.row,
        active.column,
        deltaRow,
        deltaColumn,
      );
      this.moveTo(target.row, target.column);
      return;
    }
    this.moveTo(active.row + deltaRow, active.column + deltaColumn);
  }

  /** Clamp to the page, then snap onto the anchor of whatever cell is there. */
  private moveTo(row: number, column: number): void {
    const rows = this.bodyRows().length;
    const columns = this.columnCount();
    column = Math.min(Math.max(column, 0), Math.max(columns - 1, 0));
    row = rows === 0 ? -1 : Math.min(Math.max(row, -1), rows - 1);

    const spans = this.spans();
    if (spans && row >= 0) {
      const anchor = spans.at(row, column) ?? spans.owner(row, column);
      if (anchor) {
        row = anchor.row;
        column = anchor.column;
      }
    }

    const active = this.effectiveActive();
    if (active.row === row && active.column === column) return;
    this.pendingFocus = true;
    this.active.set({ row, column });
  }

  private firstColumn(row: number): number {
    const spans = this.spans();
    if (!spans) return 0;
    for (let column = 0; column < this.columnCount(); column++) {
      if (spans.at(row, column) ?? spans.owner(row, column)) return column;
    }
    return 0;
  }

  private lastColumn(row: number): number {
    const spans = this.spans();
    const last = Math.max(this.columnCount() - 1, 0);
    if (!spans) return last;
    for (let column = last; column >= 0; column--) {
      if (spans.at(row, column) ?? spans.owner(row, column)) return column;
    }
    return last;
  }

  /** One screen minus one row; 10 when there is no layout to measure (SSR, jsdom). */
  private pageRows(): number {
    const viewport = this.scroller()?.nativeElement.clientHeight ?? 0;
    const cell = this.host.nativeElement.querySelector<HTMLElement>(
      '.rv-table-body .rv-table-cell',
    );
    const rowHeight = cell?.getBoundingClientRect().height ?? 0;
    if (!(viewport > 0) || !(rowHeight > 0)) return 10;
    return Math.max(1, Math.floor(viewport / rowHeight) - 1);
  }

  private focusCell(row: number, column: number): void {
    const element = this.host.nativeElement.querySelector<HTMLElement>(
      `[data-rv-cell="${row}:${column}"]`,
    );
    element?.focus({ preventScroll: true });
    element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Direction is read from the nearest `[dir]` FIRST, then from computed
   * style: jsdom does not inherit computed direction, and `dir="auto"` needs
   * the computed answer anyway.
   */
  private isRtl(element: HTMLElement): boolean {
    const declared = element.closest('[dir]')?.getAttribute('dir')?.toLowerCase();
    if (declared === 'rtl') return true;
    if (declared === 'ltr') return false;
    if (typeof getComputedStyle !== 'function') return false;
    return getComputedStyle(element).direction === 'rtl';
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private buildCells(
    row: TableUiRow,
    rowIndex: number,
    templates: ReadonlyMap<string, TemplateRef<TableUiCellContext>>,
  ): readonly RenderCell[] {
    const spans = this.spans();
    const cells: RenderCell[] = [];

    this.visibleColumns().forEach((column, columnIndex) => {
      let rowSpan = 1;
      let colSpan = 1;
      if (spans) {
        const anchor = spans.at(rowIndex, columnIndex);
        if (anchor) {
          rowSpan = Math.max(1, anchor.rowSpan);
          colSpan = Math.max(1, anchor.colSpan);
        } else if (spans.owner(rowIndex, columnIndex)) {
          // Covered by an earlier anchor: no element, no ARIA cell, no tab stop.
          return;
        }
      }

      const value = this.readValue(column, row.data);
      const template = templates.get(column.id) ?? null;
      const text = template
        ? ''
        : column.format
          ? column.format(value, row.data, this.locale())
          : value === null || value === undefined
            ? ''
            : String(value);

      const overflow: TextOverflow = column.textOverflow ?? 'nowrap';
      // `wrap` never cuts the text, so it needs no full-text description; the
      // other two modes may, and a hidden node is the only way to expose the
      // untruncated value without a `title` (the consumer owns the tooltip).
      const describedBy =
        text !== '' && overflow !== 'wrap'
          ? `rv-table-${this.uid}-full-${rowIndex}-${columnIndex}`
          : null;

      cells.push({
        column,
        columnIndex,
        rowSpan,
        colSpan,
        spanned: rowSpan > 1 || colSpan > 1,
        overflow,
        lines: overflow === 'clamp' ? (column.lines ?? 2) : null,
        text,
        describedBy,
        template,
        // CSS grid line numbers are 1-based, and every anchor sits exactly at
        // its matrix position, so placement is deterministic even when a span
        // above or beside it removed cells from the flow.
        gridRow: `${rowIndex + 1} / span ${rowSpan}`,
        gridColumn: `${columnIndex + 1} / span ${colSpan}`,
        context: {
          $implicit: row,
          row,
          data: row.data,
          value,
          column,
          rowIndex,
        },
      });
    });

    return cells;
  }

  private readValue(column: TableUiColumn, data: unknown): unknown {
    const accessor = column.accessor;
    if (accessor === undefined) return undefined;
    if (typeof accessor === 'function') return accessor(data);
    const record = data as Record<string, unknown> | null | undefined;
    return record === null || record === undefined ? undefined : record[accessor];
  }

  private toggleRow(row: TableUiRow): void {
    if (!this.selectable()) return;
    const id = this.rowId(row);
    const selected = new Set(this.selected());
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    this.selected.set(selected);
    this.selectionChange.emit({ selected, row });
  }

  private errorText(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error) return error;
    return this.effectiveLabels().error;
  }
}

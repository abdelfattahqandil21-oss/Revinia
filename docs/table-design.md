# `@rivinia/table` — research and design brief

**Status:** proposal, 2026-10-26. No package, no source, no `DECISIONS.md` entry yet.
Nothing in this document has been built; every number below says where it came
from, and anything unmeasured is labelled as such.

**Baseline:** Angular **22.2.2** (`@angular/core` installed in this workspace),
ng-packagr 22.2.4, pnpm, the packaging rules in `AGENTS.md` (D04, D20, D21).

**Companion:** `docs/table-spans-and-size.md` — the measured design of
`colSpan`/`rowSpan` and the entry-point/size strategy. Its conclusions are
folded into T11/T12, §4.4, §5.3 and §6; the companion holds the full evidence.

**The question:** the datepicker is shipped. The next library is a table, and
"the business of a table is big". This document answers three things before a
line of code exists:

1. what the market already provides, measured rather than assumed;
2. what a business table actually has to do, and in what order;
3. the architecture I recommend, the scope of `0.1.0`, and the decisions that
   are yours, not mine.

---

## 0. The recommendation in one page

Build **`@rivinia/table`**: a headless core plus a themed `role="grid"` UI, zero
new runtime dependencies, signals-native, RTL and Arabic as first-class rules.

| Piece | What it is |
| --- | --- |
| `@rivinia/table` | `createTable<T>(() => options)` → typed columns, staged row model (filter → sort → group → expand → page), **cell spans (`merge` / `colSpan` / `span`)**, selection, editing entry (0.2), formatting, CSV, `request()` for server mode, pure virtual-window math. No DOM. |
| `@rivinia/table/ui` | `rv-table` (div grid, CSS-grid columns, sticky header, pinned columns, virtualization), `rv-table-toolbar`, `rv-table-filters`, `rv-table-pagination`; per-column template overrides by id. |

Why **not** wrap an existing library:

- **TanStack Table v9** is genuinely good at state and row models, but it ships
  **no editing at all**, renders nothing, virtualizes nothing, and its Angular
  adapter (measured **6,311 B gzip**) brings its own atom store next to our
  signals. We would still write the grid, the virtualizer, the ARIA and the RTL
  ourselves — i.e. all the hard parts — while accepting a second state model.
- **AG Grid 36.2** is the most complete product, and it is a **div grid with
  ARIA, exactly like the one proposed here** (their own accessibility page says
  so). The cost is **≈ 377 kB gzip for the whole package** (measured from the
  published tarball, not a tree-shaken app) and a license split where row
  grouping, pivoting, tree data, master-detail, the server-side and viewport row
  models, set filters, Excel/PDF export, cell and range selection, clipboard,
  batch editing and tool panels are **Enterprise**.
- **Angular CDK** gives a dumb row/column renderer and a virtual scroller whose
  default strategy is **fixed-size only**; no sorting, no filtering, no
  selection, no editing.
- **Angular Aria** is stable in v22 and is the right tool for a menu or a
  listbox. Its grid, inspected in **22.2.4**, binds no `PageUp`/`PageDown`, sets
  no `aria-rowcount`/`aria-colcount`, selects **cells only**, and pins
  `@angular/cdk` to an exact version — so depending on it would import a second
  grid state model and a hard CDK version lock.

The proposed package is the only combination on the market that is *all* of:
headless, Angular-signals-native, zero-dependency, virtualized with correct ARIA
indices, editable, RTL/Arabic-built-in, and themeable through CSS tokens.

**`0.1.0` = a read-only data grid a finance or HR screen can ship on.** Sorting,
filtering, pagination, selection, **cell spans**, column resize/pin/hide,
virtualization, keyboard, RTL, theme, CSV, server mode. Editing (0.2), tree +
grouping (0.3), column menu + persisted views (0.4). Nothing else — see §10.

---

## 1. What "table" means here

### 1.1 The screens this has to serve

The workspace already contains one concrete business case: the ENR attendance
workflow (monthly report, one row per employee per day, Arabic labels, RTL
layout, totals per employee). The same shape recurs in every business product:

| Screen | Shape | What it needs |
| --- | --- | --- |
| Attendance report | 5–50k rows, grouped by employee, totals, Arabic RTL | server/client paging, grouping, aggregation, CSV |
| Invoice / payment list | 10–100k rows, many filters, batch actions | server mode, multi-filter, row selection across pages, totals |
| Payroll run | 1–20k rows, **editable**, validated, batch save | cell/row editing, dirty tracking, async validation |
| Inventory | 1–20k rows, inline edit, status chips, images | editing, template cells, filtering |
| Audit log | 1M+ rows, read-only, time-ordered | server-only, cursor/page, no client sort |
| Admin users | 1–5k rows, role filters, bulk enable/disable | selection, filters, confirmation flows |

Four of those six are read-only at heart — attendance, invoice, audit and
admin — and three of them (invoice, audit, admin) need nothing beyond `0.1.0`;
attendance additionally needs grouping, which is `0.3.0`. Two genuinely need
editing (payroll, inventory), which is why editing is `0.2.0` and not a flag on
`0.1.0`.

### 1.2 Capability inventory

Each capability is either in a release or explicitly out of scope.

| Capability | Business value | Release |
| --- | --- | --- |
| Columns, formatting, alignment, width | every table | 0.1.0 |
| Single + multi sort, tri-state, `aria-sort` | every list | 0.1.0 |
| Text / number / date / boolean / select filters, global search | invoice, audit | 0.1.0 |
| Pagination (client + server) | every list | 0.1.0 |
| Row selection, header tri-state, select-all-across-pages | batch actions | 0.1.0 |
| Column resize / pin start-end / hide | dense business grids | 0.1.0 |
| Column reorder (pointer + keyboard) | power users | 0.4.0 |
| Virtualization, sticky header, 100k rows | attendance, audit | 0.1.0 |
| CSV export (Excel-safe, Arabic-safe) | attendance, finance | 0.1.0 |
| Server mode (`request` → `resource`) | invoice, audit | 0.1.0 |
| Keyboard + ARIA + RTL + theming | all | 0.1.0 |
| Cell + row editing, validation, dirty tracking | payroll, inventory | 0.2.0 |
| Variable row heights, row detail expansion | invoices with line items | 0.2.0 |
| Tree rows, grouping + aggregation | attendance, org charts | 0.3.0 |
| Column menu, saved views, state persistence | power users | 0.4.0 |
| Column groups (multi-row header) | finance reports | 0.4.0 |
| Excel/PDF export, pivot, charts, formulas | **not planned** | — |

**Non-goals, stated now:** pivoting, charting, Excel/PDF, formulas, master-detail,
real-time collaboration, an "AI" assistant, a spreadsheet. AG Grid gates several
of these behind Enterprise for good reasons: they are products, not features.

---

## 2. The landscape, measured

Checked 2026-10-26. Versions are the current npm `latest` at that date.

| Product | Model | License reality | Size evidence | Verdict for us |
| --- | --- | --- | --- | --- |
| AG Grid 36.2 | full grid, div + ARIA | Community MIT; grouping, pivot, tree, master-detail, SSRM/viewport, set filter, Excel/PDF, cell/range selection, clipboard, batch edit = **Enterprise** | ≈ 377 kB gzip whole package (measured) | too heavy, wrong license shape, but the best reference for *what* to build |
| MUI X DataGrid 9.16 | full grid, div | Community MIT; multi-sort/multi-filter, column reorder, tree, master-detail = **Pro**; row grouping + Excel = **Premium** | not compared (React) | reference for API and a11y, not adoptable |
| PrimeNG 22.1.4 | full grid | `LICENSE.md` in package (no SPDX in `package.json`) | table FESM **350,930 B raw** (measured) | reference; not Angular-signals-native |
| TanStack Table 9.3.1 | headless, no DOM | MIT | Angular adapter **6,311 B gzip** + core + `tslib` | best headless reference; **no editing**, no virtualization, second state model |
| TanStack Virtual 6.1.9 | headless virtualizer | MIT | adapter **1,379 B gzip** + core **13,493 B gzip** ≈ 14.9 kB | good reference for measurement math; we need less |
| Angular CDK 22.2.4 | table primitives | MIT | — | no sort/filter/selection/edit; virtual scroll fixed-size only |
| Angular Aria 22.2.4 | headless directives | MIT, **exact** `@angular/cdk@22.2.4` pin | grid closure ≈ **63,404 B raw / 11,135 B gzip** | not enough for a data grid (see below) |

### 2.1 AG Grid — the completeness benchmark

- Community has the client-side and infinite row models, sorting, filters,
  pagination, CSV export, cell and full-row editing, validation, undo/redo, row
  selection, column resize/pin/move/span, theming and RTL.
- Enterprise gates: row grouping, pivoting, tree data, master-detail, the
  server-side and viewport row models, set filter, Excel/PDF export, cell and
  range selection, clipboard, batch editing, tool panels.
  ([community vs enterprise](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/))
- **They use divs.** Their accessibility page: "These attributes are particularly
  useful when plain HTML elements such as div and span are used to create complex
  DOM structures, which is the case with AG Grid."
  ([accessibility](https://www.ag-grid.com/javascript-data-grid/accessibility/))
- **And they admit the virtualization/AT problem:** screen readers assume all
  elements are loaded; AG Grid's recommendation is `ensureDomOrder: true`, no
  sticky group rows, and **disable row/column virtualization** (use pagination).
  That is the gap this package can close properly: `aria-rowcount` +
  `aria-rowindex` exist precisely so a windowed grid can stay correct without
  rendering 100k cells.

### 2.2 MUI X — the API benchmark

- Community is MIT; multi-sort, multi-filter, column reorder, tree data and
  master-detail are Pro; row grouping and Excel export are Premium
  ([licensing](https://mui.com/x/introduction/licensing/)).
- Their grid root is a `div` (`styled('div', { name: 'MuiDataGrid', slot: 'Root' })`,
  inspected in 9.16.0), and their row ARIA is computed as
  `index + headerGroupingMaxDepth + 2` — one for the header row, one because
  `aria-rowindex` is 1-based. We will do the same, with the header depth in the
  formula instead of hard-coded.

### 2.3 PrimeNG — the Angular incumbent

- Client-side sort/filter/pagination, lazy mode (`lazy`, `onLazyLoad`,
  `totalRecords`), virtual scroll (fixed item size), selection, cell/row editing,
  row expansion, grouping, column resize/reorder/toggle, frozen columns, export,
  state persistence.
- Package-level reality: table FESM **350,930 B raw**, styles shipped separately,
  and the components are not signal-first.
- Useful as a feature checklist; not as a dependency.

### 2.4 TanStack Table v9 — the headless reference

- `tableFeatures({...})` is a **required** static registry; omitted features
  remove their APIs from the type surface. 6 core features, 17 optional, 8 row
  models; `stockFeatures` adds all features but no row models.
- **No editing.** The docs are explicit that editing is not part of the library;
  you own the editors, the draft state and the commit.
- Server mode = keep the feature, omit the client row model, set `manual*`
  (`manualSorting`, `manualFiltering`, `manualPagination`, `pageCount`).
- Angular adapter: `injectTable(() => options)`, `table.atoms.*`, peer
  `@angular/core >= 19`, depends on `tslib`.
- **What we should copy:** typed column defs, the feature/row-model separation,
  and `manual*` semantics. **What we should not copy:** a second reactive store,
  and a feature registry that makes the simple case verbose.

### 2.5 Angular CDK — primitives, not a grid

- `cdk-table` renders rows and columns (and sticky headers); it has **no**
  sorting, filtering, pagination, selection or editing.
- `cdk-virtual-scroll-viewport` ships a fixed-size strategy (and an auto-size
  strategy with its own caveats); no horizontal virtualization; sticky headers
  and index-based ARIA are left to the consumer.
- `cdk/drag-drop` has no keyboard or ARIA model, so column reordering would need
  a parallel keyboard implementation anyway.

### 2.6 Angular Aria — right primitives, wrong shape

Verified in `@angular/aria@22.2.4` (downloaded from the registry, not installed
in this workspace):

- Stable in v22; `sideEffects: false`; peers are `@angular/cdk: 22.2.4`
  (**exact**) and `@angular/core: ^22 || ^23`.
- `Grid`, `GridRow`, `GridCell` handle arrow navigation, Home/End and cell
  widgets; **no `PageUp`/`PageDown` binding exists in the 22.2.4 source**, no
  `aria-rowcount`/`aria-colcount` is emitted, and selection is per **cell**
  (`selected` model on the cell), not a row-selection model with an
  include/exclude set.
- Grid closure ≈ **63.4 kB raw / 11.1 kB gzip** plus the CDK chunks it imports
  (`cdk/bidi`, `cdk/a11y`, `cdk/platform`).
- Using it would mean: a hard CDK pin, a second selection model layered on top,
  and still writing row virtualization, row indices and the editing machine.

### 2.7 What the design systems say

- **Carbon**: row sizes 24/32/40/48/64 px (1.5/2/2.5/3/4 rem), header, toolbar
  and pagination heights matched to the row size; three sort states; skeleton
  loading; batch action bar; expansion icon before the selection icon.
- **Ant Design** documents its own traps, which are requirements for us:
  virtual scroll needs a fixed `scroll.x`/`scroll.y` and item height; fixed
  columns need `scroll.x`; filters reset to the first page; width alignment
  issues between header and body.

These two sources decide two things in this design: **density is a token set**
(not a boolean), and **header and body must share exactly one column geometry**
(the Ant "misalignment" class of bug is designed out, not patched).

### 2.8 The gap, stated precisely

Nobody on the market ships a table that is simultaneously:

1. **headless** (no DOM in the core, so a consumer can render anything),
2. **signals-native** in Angular 22 (state, derived rows and requests are
   signals; no zone requirement, no external store),
3. **zero-dependency** (no CDK, no TanStack, no `tslib` import in the FESM),
4. **virtualized with correct ARIA** (`aria-rowcount`, `aria-rowindex`,
   `aria-colcount`), instead of telling the user to turn virtualization off,
5. **editable** with validation and an explicit commit,
6. **RTL/Arabic-first** (logical geometry, Arabic labels, locale formatting,
   Arabic-Indic digits),
7. **themeable through one token layer** shared with the rest of the ecosystem.

That is the product.

---

## 3. Proposed decisions

These become `DECISIONS.md` entries only after approval.

**T1 — Build our own core; wrap nothing.** A wrapper cannot provide editing,
virtualization or ARIA indices without reimplementing them; the wrapper's state
model would then compete with signals. Evidence: §2.4.

**T2 — The UI is a `div` grid with explicit ARIA, not a native `<table>`.**
An interactive grid is `role="grid"`, not `role="table"`, so once we opt into
grid semantics we own rows, columns and indices either way. Native tables fight
exact column geometry (`table-layout` negotiation), sticky headers
(`thead`/`tr` sticky is inconsistent), transforms inside cells, and
row-windowing. AG Grid and MUI X both use divs for the same reasons. The
counter-argument — free semantics — is real, and it is why a **read-only
presentational mode** using a real `<table role="table">` stays on the roadmap
for print/SEO, as a separate mode, not as the engine.

**T3 — Zero runtime dependencies.** Core peers: `@angular/core`. UI peers:
`@angular/core`, `@angular/common`, `@rivinia/table`. No CDK, no TanStack, no
`tslib` import (the D20 gate applies).

**T4 — Row model as a chain of `computed`s, one stage each.** Filter, sort,
group, expand, page and window are separate signals. Angular's computed caching
then gives incremental recomputation for free: changing page does not re-sort,
changing sort does not re-filter. This is the signals-native replacement for
TanStack's memoized row models, with less machinery.

**T5 — Selection is an id set plus a mode (`include` / `exclude`).** Row ids,
never indices. "Select all 12,345 matching rows" is representable without
materializing 12,345 ids, and unchecking one row is one id in the exclude set.

**T6 — Server mode is an Angular `resource` the table owns, driven by
`request()`.** The table exposes a `request` computed of exactly the state the
server needs and, in server mode, creates
`resource({ params: () => request(), loader })` internally (verified API in
22.2.2: `params`, not `request`), so loading, error, cancellation and reload are
signals on the table. Apps that already own their fetching can ignore `server`
and read `request()` themselves — same type, no second contract.

**T7 — Virtualization math lives in the core, measurement lives in the UI.**
`computeVirtualWindow()` is a pure function over offsets and heights, unit-tested
with fake geometry. The UI measures rows (ResizeObserver) and the scroller.
Headless consumers get the same math.

**T8 — Roving tabindex on cells, plus a pinned active row.** Not
`aria-activedescendant`: APG's grid pattern is written around cell focus, and AT
support for activedescendant on grids is uneven. The virtualization hazard
(focused cell unmounted by scrolling) is solved by always including the active
row in the rendered window — one extra row, no focus loss.

**T9 — Editing is a draft with an explicit commit**, the same shape as the
datetime picker (D55): edits write a draft, `commit()` validates and asks the app,
`cancel()` restores. Nothing is written to the consumer's data by the table.

**T10 — Theme by tokens; no forced scheme; rem for type and spacing; px for
measured geometry.** The D42/D44/D46 rules extend unchanged. Column widths are
px because they are persisted, user-resized geometry; density and type are rem.

**T11 — Spans are anchored conditions in the core, never coordinates.**
`merge: 'equal' | ((row, anchor) => boolean)`, `colSpan: number | ((context) => number)`
(`Infinity` = the rest of the pinned region), and one escape hatch
`span: (context) => { rowSpan?, colSpan? }`. The core builds the matrix, clamps
to the page / visible columns / pinned region, resolves overlaps
first-claim-wins, and exposes `spans.move()` for keyboard navigation. The
consumer never returns `0` to hide a cell and never computes a row or column
index. Evidence: companion doc §1–§7; measured **1,199 B gzip** inside the core.

**T12 — Entry points follow measured cost and contract, not fashion.**
`@rivinia/table` (core, spans included), `@rivinia/table/ui` (the grid, the
single biggest piece at +8.75 kB gzip), `@rivinia/table/editing` (when editing
lands in 0.2.0; +0.56 kB static, and its own contract). Spans do **not** get a
`@rivinia/table/spans` entry — 1.2 kB is not worth a second contract, and an
entry that a consumer never imports costs the core bundle nothing (measured:
3,619 B gzip for the core whether or not the package also ships `ui` and
`editing`). `injectAsync` is reserved for provided singletons because it
resolves a DI token, not a per-instance factory like `createEditing(table)`.
Editing is imported statically; lazy loading it measured **+619 B gzip initial**
versus a static import.

---

## 4. Core design

### 4.1 Package layout

```
projects/table/
  src/                      → @rivinia/table          (headless)
    lib/models/             types: column, state, request, row, span, edit
    lib/services/           RiviniaTable (the controller), label set
    lib/utils/              row model, sorting, filtering, csv, spans, virtual window
    lib/providers/          provideRiviniaTable / injectRiviniaTable
    public-api.ts
  ui/src/                   → @rivinia/table/ui       (rendered grid)
    lib/components/table/         .ts .html .css
    lib/components/toolbar/
    lib/components/filters/
    lib/components/pagination/
    lib/directives/               cell/header/filter/detail templates
    lib/utils/                    measurement, focus, geometry
    public-api.ts
  editing/src/              → @rivinia/table/editing  (0.2.0; +0.56 kB static)
    lib/editing.ts          draft, validate, commit
    public-api.ts
  tests/                    → every spec (D50 rule: outside `src/`)
  ng-package.json           → primary + `ui` (+ `editing` when 0.2.0 lands)
```

The UI reads the core through the **package specifier** `@rivinia/table`, the
D06 exception already proven by the datepicker: the UI genuinely needs the
controller and the pure helpers, and ng-packagr accepts package-specifier
cross-entry imports (the TS6059 failure was relative imports).

### 4.2 Public API sketch

```ts
// core
export interface TableColumn<T, V = unknown> {
  readonly id: string;
  readonly header: string;
  readonly accessor?: (row: T) => V;              // absent for display/action columns
  readonly type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  readonly sortable?: boolean;                     // default: true when accessor exists
  readonly filter?: FilterKind | false;            // 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom'
  readonly width?: number;                         // px, default 160
  readonly minWidth?: number;                      // px
  readonly maxWidth?: number;                      // px
  readonly flex?: number;                          // 0 = fixed; >0 = absorbs free space
  readonly pinned?: 'start' | 'end';               // absent = scrolls
  readonly align?: 'start' | 'center' | 'end';
  readonly format?: (value: V, row: T, locale: string) => string;
  readonly comparator?: (a: V, b: V) => number;
  readonly aggregation?: AggregationKind | ((rows: readonly T[]) => unknown);
  readonly hidden?: boolean;

  // spans — see docs/table-spans-and-size.md
  readonly merge?: 'equal' | ((row: T, anchor: T) => boolean);          // row-span sugar
  readonly colSpan?: number | ((context: SpanContext<T>) => number);    // Infinity = rest of region
  readonly span?: (context: SpanContext<T>) => CellSpan | null | undefined; // escape hatch, both axes
}

export interface CellSpan { readonly rowSpan?: number; readonly colSpan?: number }
export interface SpanContext<T> {
  readonly row: TableRow<T>;
  readonly column: TableColumn<T>;
  readonly value: unknown;
  readonly rowIndex: number;
  readonly columnIndex: number;
}
export interface SpanCell {
  readonly row: number;
  readonly column: number;
  readonly rowSpan: number;
  readonly colSpan: number;
}
export interface SpanModel {
  readonly cells: readonly SpanCell[];                                  // anchors only
  at(row: number, column: number): SpanCell | null;                     // starts here?
  owner(row: number, column: number): SpanCell | null;                  // covers this position?
  move(row: number, column: number, dRow: number, dColumn: number): { row: number; column: number };
}

// `span` wins over `merge` and `colSpan`; declaring both throws at createTable().
// `merge` requires an accessor; on a display column it warns and does not merge.

// ColumnDef<T, V> = Omit<TableColumn<T, V>, 'id' | 'accessor'>
export function tableColumn<T>(): {
  accessor<K extends keyof T & string>(key: K, def?: ColumnDef<T, T[K]>): TableColumn<T, T[K]>;
  display(id: string, def?: ColumnDef<T, unknown>): TableColumn<T>;
};
```

```ts
// core — the controller
export function createTable<T>(options: () => TableOptions<T>): RiviniaTable<T>;

class RiviniaTable<T> {
  readonly columns: Signal<readonly TableColumn<T>[]>;
  readonly rows: Signal<readonly TableRow<T>[]>;        // after filter/sort/group/expand
  readonly pageRows: Signal<readonly TableRow<T>[]>;    // after pagination
  readonly spans: Signal<SpanModel>;                    // over pageRows + visible columns
  readonly total: Signal<number>;                       // client count or server rowCount

  readonly sorting: WritableSignal<readonly SortState[]>;
  readonly filters: WritableSignal<readonly FilterState[]>;
  readonly globalSearch: WritableSignal<string>;
  readonly page: WritableSignal<number>;
  readonly pageSize: WritableSignal<number>;

  readonly selection: RiviniaTableSelection;            // id-set + include/exclude

  // editing is not on the controller: `createEditing(table)` lives in
  // `@rivinia/table/editing` (0.2.0), so an app that never edits never imports it.

  readonly request: Signal<TableRequest>;               // for resource()
  readonly loading: Signal<boolean>;                    // server mode
  readonly error: Signal<unknown | null>;               // server mode
  reload(): void;                                       // server mode
  readonly state: Signal<TableState>;                   // serializable
  setState(patch: Partial<TableState>): void;
  resetState(): void;
}

// pure, exported for headless consumers and for the UI
export function computeVirtualWindow(input: WindowInput): WindowResult;
export function buildSpanModel<T>(
  rows: readonly TableRow<T>[],
  columns: readonly TableColumn<T>[],
  options?: { warn?: (message: string) => void },
): SpanModel;
```

```ts
interface TableOptions<T> {
  columns: () => readonly TableColumn<T>[];
  data?: () => readonly T[];                     // client mode
  server?: {                                     // server mode (owns a resource)
    load: (request: TableRequest, ctx: { abortSignal: AbortSignal })
      => Promise<{ items: readonly T[]; total: number }>;
  };
  getRowId?: (row: T) => string;                 // default: row.id
  locale?: () => string;
  selection?: { mode: 'none' | 'single' | 'multi'; selectAllScope?: 'page' | 'filtered' | 'all' };
  initialState?: Partial<TableState>;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  manualPagination?: boolean;
  rowCount?: () => number;                       // when data comes from outside
  onCommit?: (change: CellChange<T>) => boolean | void | Promise<boolean>;  // 0.2.0
  labels?: Partial<TableLabels>;
}
```

```ts
// UI
<rv-table [table]="table" density="compact" [virtual]="true" [stickyHeader]="true">
  <ng-template rvTableCell="salary" let-row let-value="value"> … </ng-template>
  <ng-template rvTableHeader="salary"> … </ng-template>
  <ng-template rvTableDetail let-row> … </ng-template>
</rv-table>
```

`[table]` is the primary input. `[data]` + `[columns]` without a controller is a
convenience for the trivial case: the component creates an internal
`RiviniaTable` through the same `createTable()`, so there is still exactly one
implementation and one state model.

Two levels of usage exist elsewhere in the ecosystem (D38, `rv-menu`), and here
I explicitly **reject** the markup-declared column list: columns are typed data,
and two sources of truth for the same list would recreate the "silently dropped
list" class of bug. A column is a TS object; markup only overrides *rendering*,
by column id.

### 4.3 State

```ts
interface TableState {
  sorting: SortState[];        // [{ id, desc }] in priority order
  filters: FilterState[];      // [{ id, kind, value }]
  globalSearch: string;
  page: number;                // 0-based
  pageSize: number;
  selection: { mode: 'include' | 'exclude'; ids: string[] };
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  columnSizing: Record<string, number>;
  columnPinning: Record<string, 'start' | 'end'>;
  expanded: string[];
}
```

`state()` is serializable JSON. `setState()` accepts a partial patch;
`resetState()` returns to the initial state. This is the whole "saved views"
feature, without a service or persistence assumption — the consumer stores it.

**Page reset uses `linkedSignal`** (verified stable, `@publicApi 20.0` in the
installed `core.d.ts`): `page` is linked to the filter/sort signature, so it
returns to 0 when the result set changes, while the user can still set it.

### 4.4 Row model

Stages, each its own `computed`:

```
data → filtered → sorted → grouped (0.3) → expanded → pageRows → spans → window
```

- `filtered` is skipped when `manualFiltering`.
- `sorted` is skipped when `manualSorting`.
- `pageRows` is skipped when `manualPagination`; `total` then comes from
  `rowCount()`.
- `window` is UI-driven: the UI pushes `{ scrollTop, viewportHeight }` and reads
  `computeVirtualWindow`, which binary-searches a prefix-sum of offsets.
- `spans` is computed over `pageRows` and the **visible** columns (after
  hide/reorder/pin), never over the full data set: a merge follows rendered
  adjacency, so sorting by another column legitimately starts a new run. Row
  spans clamp to the page; column spans clamp to the visible range and never
  cross a pinned-region boundary; `Infinity` means "to the end of my region".
  Overlaps are first-claim-wins with a dev warning. No span declaration → a
  shared `EMPTY` model and no allocation. Measured **2.7–4.1 ms** per rebuild
  (median 3.1, 16 runs × 20) for 10k rows × 4 columns with two merge columns and
  one column span (20,219 anchors) in the prototype — a page change, not a
  scroll frame.
- **Row identity is `getRowId` → `row.id` → a `WeakMap`-generated id per object,
  never the array index.** An index changes under sorting and filtering, and
  would silently break selection, focus and edit drafts — the class of bug that
  only appears once real data moves.

Measured engine cost on this machine (Node 24.21, Linux 6.14, 100k rows, script
in `/tmp/opencode/table-bench.mjs`):

| Operation | 100k rows |
| --- | --- |
| build row wrappers | 10.2 ms |
| filter (substring) | 3.3 ms |
| sort, numeric | 14.6 ms |
| sort, `Intl.Collator('en')` | 109.9 ms |
| sort, `Intl.Collator('ar-EG')` | 126.5 ms |
| map 100k ids | 34.2 ms |

Conclusion: **client-side is comfortable to ~10k rows** (one frame), **100k is a
visible ~110 ms pause when sorting text** (filtering and wrapping are fine), and
**1M belongs to the server**. So the recommended targets are 10k smooth client,
100k client-with-server-recommended, 1M server-only. Collators are cached per
locale; sort keys are precomputed once per row when the column is a string.

### 4.5 Selection

```ts
selection.mode;          // 'include' | 'exclude'
selection.isSelected(id);
selection.toggle(id);
selection.selectAll(scope: 'page' | 'filtered' | 'all');
selection.clear();
```

`aria-selected` is written per row. The header checkbox is `indeterminate` when
the page is partially selected. "Select all" in server mode means "all rows
matching the current server request" — the state carries the mode and the
excluded ids, so the app can send `{ all: true, except: [...] }` to its API
instead of 12,345 ids.

### 4.6 Editing (0.2.0)

Draft-based, mirroring D55. It lives in `@rivinia/table/editing`, constructed
from the table — not on the controller — so the core never references it:

```ts
import { createEditing } from '@rivinia/table/editing';
const editing = createEditing(table, { validate, onCommit });

editing.start(rowId, columnId);        // or startRow(rowId)
editing.setValue(rowId, columnId, v);
editing.errors();                      // Map<cellKey, string>
await editing.commit();                // validate → ask the app → clear or keep
editing.cancel();                      // restore
editing.isDirty(rowId);
```

The app supplies `onCommit: (change) => Promise<boolean> | boolean | void`; a
`false` or a rejection keeps the editor open with the error attached. Validation
is sync + async, per column (`validate?: (value, row) => string | null | Promise<string | null>`).
Batch mode collects changes per row and commits once. The table never mutates
`data`.

### 4.7 Server mode

Two modes, one request object.

**Client mode** — `data` is a signal of the whole array; the row model runs
locally.

**Server mode** — the table owns the resource, because the request depends on the
table's state and the response flows straight back into it:

```ts
const table = createTable<Invoice>(() => ({
  columns,
  server: {
    // { page, pageSize, sorting, filters, search } → { items, total }
    load: (request, { abortSignal }) => api.list(request, abortSignal),
  },
}));
```

- `request` is a computed of the state only — **never of `data`** — so there is
  no cycle by construction (the naive `resource` + `data` wiring has a temporal
  dead zone; owning the resource removes it).
- The table calls `resource({ params: () => request(), loader })` internally, so
  `loading`, `error`, `reload()` and the `AbortSignal` are wired once, not in
  every consumer.
- The client filter/sort/page stages are skipped, but grouping, formatting,
  selection and export still apply to the loaded page.
- `createTable` therefore runs in an injection context in server mode (an
  explicit `injector` option is accepted for the rare case it does not).
- An app that already owns its fetching (NgRx, a custom cache) skips `server`,
  reads `request()` and feeds `data` + `rowCount` back. Both paths share the same
  `TableRequest` type.

### 4.8 Formatting and labels

- `format` per column; built-ins for number, currency, percent and date through
  `Intl`, using the table's `locale`.
- Arabic-Indic digits come from the locale, not from a transform.
- Labels follow the datepicker convention: `TABLE_LABELS_EN`,
  `TABLE_LABELS_AR`, `tableLabelsFor(locale)`, and a `[labels]` input for
  partial overrides. This covers sort announcements, pagination text, empty and
  error states, filter placeholders and the screen-reader instructions.
- CSV: pure `toCsv(rows, columns, { bom: true, delimiter: ',' })`, UTF-8 BOM and
  CRLF so Excel opens Arabic correctly.

### 4.9 Quick start, as the consumer writes it

> **Shipped in 0.1.0, differs from the sketch below.** The controller is
> `createTable(() => options)`, `columns` is a FACTORY (`columns: () => [...]`),
> and the grid takes `[columns]`, `[rows]`, `[spans]` rather than a `[table]`
> object. Filters live in `table.filters` (there is no `filter: 'text'` column
> field, no `type`, no `aggregation`), and the filter row is the consumer's
> markup. Everything else here — the two-level cell templates, the density
> presets, the labels — shipped as designed.

```ts
@Component({
  imports: [RvTable, RvTableCell],
  template: `
    <rv-table [table]="table" density="compact" [filterRow]="true">
      <ng-template rvTableCell="name" let-row>{{ row.name }}</ng-template>
      <ng-template rvTableCell="status" let-row>{{ row.status }}</ng-template>
    </rv-table>
  `,
})
export class EmployeesPage {
  private readonly api = inject(Api);
  private readonly col = tableColumn<Employee>();

  readonly table = createTable<Employee>(() => ({
    columns: [
      this.col.accessor('name', { header: 'Employee', width: 240, filter: 'text' }),
      this.col.accessor('salary', { header: 'Salary', type: 'number', align: 'end', aggregation: 'sum' }),
      this.col.display('status', { header: 'Status', width: 120 }),
    ],
    data: this.api.employees,                 // a Signal<Employee[]>
    selection: { mode: 'multi' },
    initialState: { pageSize: 25 },
  }));
}
```

That is the whole client-mode setup: no providers, no module, no `provideX()`
call required (a `provideRiviniaTable()` exists for app-wide defaults, like the
other packages). The server-mode equivalent replaces `data` with `server.load`
and adds nothing else.

---

## 5. UI design

### 5.1 DOM

```
rv-table
└── .rv-table-scroller             overflow: auto; the only scroll container
    └── .rv-table-grid[role=grid]  min-inline-size = computed total width
        ├── .rv-table-head[role=rowgroup]        sticky top: 0
        │   └── .rv-table-row[role=row]
        │       └── .rv-table-th[role=columnheader][aria-sort]
        ├── .rv-table-filters[role=rowgroup]     optional, sticky under the header
        │   └── .rv-table-row[role=row]
        │       └── .rv-table-td[role=gridcell] > input
        ├── .rv-table-body[role=rowgroup]        padding-block = the two spacers
        │   └── .rv-table-row[role=row][aria-rowindex][aria-selected]
        │       └── .rv-table-td[role=gridcell][aria-rowspan][aria-colspan]
        └── .rv-table-detail[role=row]           (0.2.0)
```

Three choices in that tree are deliberate:

- **The body's top/bottom "spacers" are padding on the rowgroup, not empty
  elements.** A `div` between rows inside a `rowgroup` is not a row, and AT
  behavior for it is undefined. Padding keeps the DOM a clean
  `rowgroup > row*` while still giving the scroller the full virtual height.
- **The filter row is a real `role="row"` of `gridcell`s**, not a sibling block.
  It scrolls horizontally with the grid for free, sticks under the header, and
  its cells carry the same `aria-colindex` as the column they filter. The
  trade-off is explicit: `[filterRow]` is opt-in, and enabling it adds one tab
  stop per filter input (documented), because a filter a keyboard user cannot
  reach is worse than an extra tab stop.
- **One scroll container.** Pinned columns and the sticky header both resolve
  against the same scroller, and the horizontal scrollbar is the table's, not
  the page's.
- **A merged cell is owned by its anchor row.** It is a child of that row with
  an explicit `grid-column: c / span n` and `block-size: rowSpan × rowHeight`;
  the covered rows simply omit that column. Rows stay `position: relative` with
  no `z-index` (no stacking context); the merged cell is `z-index: 5`, pinned
  cells 10, the sticky header 20. Measured in Chromium: the merged cell wins hit
  testing over the rows it covers, the header and pinned cells win over it, a
  pinned merged cell stays pinned, and a span past the last row extends
  `scrollHeight` (no spacer needed).

### 5.2 Column geometry

- One source of truth: a CSS custom property `--rv-table-columns` written on the
  grid root, e.g. `96px 240px minmax(160px, 1fr) 120px`.
- Every row uses `display: grid; grid-template-columns: var(--rv-table-columns)`.
  Header and body cannot drift, by construction. The Ant "fixed column
  misalignment" class of bug is designed out.
- Pinned columns must be **px** (sticky offsets are exact). `flex` columns are
  `minmax(width, 1fr)`; the first resize converts a flex column to px.
- Pinning uses `position: sticky` with `inset-inline-start` / `inset-inline-end`,
  so "pin start" means start in both directions. A shadow appears only at the
  boundary that has scrolled content behind it (`data-scrolled`).
- Column resize is two paths over one clamp:
  - **pointer** — the handle at the column's inline-end edge (a real element,
    `aria-hidden="true"`, `cursor: col-resize`), dragged with the pointer and
    clamped to `minWidth`/`maxWidth`;
  - **keyboard** — on the focused header cell, `Alt+ArrowLeft/Right` resizes by
    8 px (`Alt+Shift` 32 px), `Alt+Enter` resets to the default. No extra tab
    stops, no focusable separator per column.
  The exact modifier is confirmed in the Phase 0 browser probe: `Alt+Arrow` is
  the natural choice, but it is also the browser's back/forward shortcut on some
  platforms, so it must be proven preventable rather than assumed. RTL flips the
  delta sign.
- Widths are px; density and type are rem tokens. This keeps the D44 rule where
  it belongs and keeps persisted widths stable across root-font-size changes.
- Merged cells do not change `--rv-table-columns`: they set their own
  `grid-column` and block size, so one shared template still aligns every row.

### 5.3 Virtualization (0.1.0: fixed row height)

- Row height comes from a token (`--rv-table-row-height`, density-driven), but
  the virtualizer uses the **measured** px height of a rendered row
  (ResizeObserver), so a consumer changing the root font size still gets exact
  geometry.
- Window = `ceil(viewport / rowHeight) + 2 × overscan`; scroll updates are
  coalesced in one `requestAnimationFrame`.
- The active (focused) row is always inside the window (T8).
- **Spans extend the window upward**: when a span starts above the window and
  still covers its first row, the window start moves to the span's anchor row.
  At most the longest span's rows are added; `maxSpanRows` (proposed 200) clamps
  pathological spans with a dev warning. The probe measured the hazard this
  rule prevents: remove the anchor row while its covered rows are visible and
  the merged cell disappears.
- Variable heights are **0.2.0**, with per-row measurement and a prefix-sum
  binary search. `0.1.0` keeps the contract honest rather than shipping a
  half-working auto-size.
- Hard limit: 1M rows × 40 px exceeds the browser's maximum scroll-container
  height (roughly 17–33 million px depending on engine; to be re-measured in the
  prototype). Server paging is the answer for 1M, not a taller spacer.

### 5.4 Header, sorting, filters

- Sort: click cycles ascending → descending → none; Shift+click appends to a
  multi-sort. `aria-sort` is applied to **exactly one** header at a time (the
  primary sort), as WAI-ARIA requires; the secondary columns carry a visible
  order badge instead.
- The header label is a real `<button>` so a pointer click and an AT "click"
  both work, but it carries `tabindex="-1"`: the **cell** is the tab stop.
  Keyboard users sort from the focused header cell with Enter/Space
  (Shift+Enter adds), so the grid keeps exactly one tab stop.
- Filter row: text (accent- and Arabic-normalized, the same rules as the select
  search: NFD, tashkeel, tatweel, alef forms), number range, date range, boolean,
  select. Built-in controls are native inputs (zero dependency);
  `[filterTemplate]="'columnId'"` is the documented path to `@rivinia/select`
  and `@rivinia/datepicker`, with **no package dependency**.
- Filter changes reset to page 0 (Ant's documented pitfall).

### 5.5 Toolbar, pagination, states

- `rv-table-toolbar`: title slot, search input (200 ms debounce), actions slot.
- `rv-table-pagination`: range text ("1–25 of 12,345"), page size select, first /
  prev / next / last, and a compact mode.
- Empty vs no-results are distinct states with distinct text and a "clear
  filters" action.
- `loading` and `error` come from the table in server mode, from `[loading]` /
  `[error]` inputs otherwise; the UI has no fetching logic of its own.
- Loading: skeleton rows at the current density, `aria-busy="true"` on the grid,
  one polite announcement — never a spinner that replaces the layout.
- Error: a message row with a retry slot that calls `table.reload()`; the table
  never swallows the error.

### 5.6 Density and theming

Density presets set `--rv-table-row-height` and the cell padding:
`compact` 2rem, `default` 2.5rem, `comfortable` 3rem (Carbon's 32/40/48 px at a
16 px root).

Tokens follow the three-level chain (D42/D46):

```
--rv-table-bg        → --rv-bg      → default
--rv-table-border    → --rv-border  → default
--rv-table-radius    → --rv-radius  → default
--rv-table-row-height              → default
--rv-table-cell-padding            → default
--rv-table-header-bg               → default
--rv-table-pin-shadow              → default
```

No `@layer`, no forced dark mode, documented class names and `data-*` hooks
(`data-pinned`, `data-density`, `data-selected`, `data-sorted`) as a stable
override surface. Public selectors are the same contract as the other packages.

### 5.7 SSR

- The server renders the header and the **first page**, unvirtualized.
- Virtualization turns on after hydration (`afterNextRender`), so the first
  client render matches the server markup.
- `aria-rowcount` is correct on the server (it comes from `total`, not from the
  rendered window).
- No `window`/`document` access at construction; measurement is browser-only.

---

## 6. Accessibility contract

Roles: `grid` (or `treegrid` in tree mode, 0.3), `rowgroup`, `row`,
`columnheader`, `gridcell`. The pointer resize handle is decorative
(`aria-hidden`); resizing is a keyboard command on the header cell.

Attributes, written by the component, tested by assertion:

| Attribute | Where | Value |
| --- | --- | --- |
| `aria-rowcount` | grid | total rows in the full data set: header rows + filter row (if enabled) + data rows; `-1` when unknown |
| `aria-colcount` | grid | total **rendered** columns after hide (pinned included); hidden columns are not in the index space |
| `aria-rowindex` | row | 1-based index in the **full** set (header is row 1, the filter row is row 2 when enabled) |
| `aria-colindex` | cell | 1-based index in the rendered column set; the filter cell carries its column's index |
| `aria-rowspan` | cell | explicit row count, only when > 1; never `0` |
| `aria-colspan` | cell | explicit column count, only when > 1 |
| `aria-sort` | columnheader | `ascending` / `descending` / `none`, on one header only |
| `aria-selected` | row | selection state, when selectable |
| `aria-multiselectable` | grid | `true` in multi mode |
| `aria-expanded` | row / cell | tree and detail rows (0.2/0.3) |
| `aria-busy` | grid | while loading |
| `aria-describedby` | grid | the keyboard instructions string, localized |

When any cell spans, every cell carries `aria-colindex` (WAI-ARIA requires it
once the grid is not a simple matrix), and a spanning cell's indices refer to
its **start**. The matrix guarantees no overlap and no span across a page or
pinned-region boundary — the two conditions `aria-rowspan`/`aria-colspan`
require. A page-clamped span always emits an explicit count; `aria-rowspan="0"`
("the rest of the row group") is never written. Hidden columns are not rendered
and are not counted, which keeps `aria-colindex` and `colSpan` in the same
coordinate space.

Arrow movement follows `spans.move()`: moving inside a merged cell leaves it,
moving into one lands on its anchor; Home/End pick the first/last **anchor** on
the row; PageUp/PageDown repeat the vertical move and clamp.

Keyboard (APG grid, plus the business additions):

| Key | Action |
| --- | --- |
| Arrows | move one cell; `spans.move()` decides whether the target is an anchor or a covered position; RTL mirrors left/right only |
| Home / End | first / last **anchor** in the row (a merged cell counts once, at its anchor) |
| Ctrl+Home / Ctrl+End | first cell of first row / last cell of last row |
| PageUp / PageDown | one viewport minus one row |
| Space | toggle row selection |
| Shift+Arrow | extend a range (0.2.0) |
| Ctrl+Space / Shift+Space | select column / row (0.2.0) |
| Ctrl+A | select all (0.2.0) |
| Enter / F2 | on a header, toggle sort; in a cell, enter edit (0.2.0) |
| Escape | leave edit and restore the value; close a popup |
| Alt+ArrowLeft / Right | resize the focused column by 8 px (`+Shift` 32 px) |
| Alt+Enter | reset the focused column to its default width |
| Alt+ArrowDown | open the column menu / filter (0.4.0) |
| Tab | leaves the grid (one tab stop; the opt-in filter row adds one per filter) |

Announcements: sorting, filtering, page changes and row-count changes go through
one polite live region ("Sorted by amount, descending. 42 rows."). Destructive
batch actions use an assertive announcement only when the app asks for it.

Verification plan: unit assertions on every attribute above, axe-core on the
consumer fixture (the datepicker gate: **0 violations**), and a manual screen
reader pass that I will run only if the user asks — or explicitly report as
unverified, as we did for Firefox/WebKit on the datepicker.

---

## 7. RTL and Arabic

- All geometry is logical (`inset-inline-*`, `margin-inline-*`,
  `padding-inline-*`, `text-align: start/end`).
- `dir` comes from an input, else the nearest `[dir]`, else computed style.
- Horizontal arrows mirror (ArrowLeft moves forward in RTL), vertical arrows
  never do — the same rule as the datepicker grid.
- Pinned start/end flip visually; the resize handle moves to the inline-end edge
  and the drag delta is negated in RTL.
- Cell content is `unicode-bidi: isolate` so a phone number, an IBAN or a Latin
  product code cannot reorder the Arabic around it. This is a real Arabic table
  bug, and it costs one declaration.
- Numbers, currency and dates are formatted through `Intl` with the table locale;
  pagination shows Arabic-Indic digits in `ar-EG`.
- Labels ship in English and Arabic (`TABLE_LABELS_EN` / `TABLE_LABELS_AR`),
  chosen by `tableLabelsFor(locale)`, overridable per instance.

---

## 8. Performance budget

Targets for `0.1.0`, to be verified in a production build (not claimed yet):

| Metric | Target |
| --- | --- |
| Core FESM, gzip | ≤ 10 kB |
| UI FESM, gzip | ≤ 18 kB |
| Initial render, 50 rows × 8 columns, production | ≤ 100 ms on this machine |
| Scroll frame, 100k rows virtualized | ≤ 16 ms per frame, no long task |
| Sort 10k rows, text | ≤ 20 ms |
| Span model rebuild, 10k rows × 4 columns | ≤ 5 ms (prototype 2.7–4.1 ms, median 3.1, 20,219 anchors) |
| Memory, 100k rows | one wrapper object per row, no per-cell objects (build measured at 10.2 ms; heap to be measured in the prototype) |

Measured prototype sizes (not yet the implementation): core FESM **4.88 kB**
gzip with spans, UI **5.29 kB**, editing **1.03 kB**; real-app deltas **+8.48
kB** (core), **+8.75 kB** (UI), **+0.56 kB** (editing, static import). The span
engine itself is **1,199 B gzip**. Full method and numbers:
`docs/table-spans-and-size.md`.

Techniques: staged computeds (T4), precomputed sort keys, cached `Intl.Collator`
per locale, one rAF-coalesced scroll handler, `OnPush` + signals, `@for` tracked
by row id, no per-row closures in templates, no layout reads during scroll
(measure on resize only).

---

## 9. Packaging and release gates

Same gates as every package (`AGENTS.md`), no exceptions:

1. `pnpm build table` (every entry point: `ui` in 0.1.0, plus `editing` when
   0.2.0 lands) succeeds.
2. Unit tests (vitest via `@angular/build:unit-test`), specs in `tests/`.
3. `npm pack` inspected: `exports`, `types`, `peerDependencies`,
   `sideEffects: false`, file list; grep the dist FESM for imports beyond
   `@angular/core` (core), `@angular/core` + `@angular/common` +
   `@rivinia/table` (UI), and `@angular/core` + `@rivinia/table` (editing); no
   `tslib` import.
4. Tarball installed into the clean consumer (`tmp/consumer`), production build.
5. Public imports exercised exactly as a consumer uses them.
6. Bundle sizes recorded **per entry** (the budget in §8); a regression beyond
   10 % needs a written reason in `DECISIONS.md` — a size budget nobody records
   is a wish.
7. No publish without explicit confirmation of name, version, access and files.
8. Angular peer range `^22.0.0`, like every other package.

Proposed version: **0.1.0** (new name). First publish goes through staged review
(D22), budget for it.

---

## 10. Phased roadmap

**Phase 0 — prototype, no package (1–2 days).** One throwaway page proving the
three risky mechanics: CSS-grid rows with one shared column template + sticky
pinned columns; the virtual window with a pinned active row; header/body
alignment under resize and RTL. If a mechanic fails, the design changes here,
not after 2,000 lines.

**Phase 1 — `0.1.0`, read-only grid.**
Columns + formatting, sort (single/multi/tri-state), filters (built-in + slot),
global search, pagination, selection (include/exclude), **cell spans
(`merge`/`colSpan`/`span`, page-clamped, `spans.move()` navigation)**,
resize/pin/hide, fixed-height virtualization, sticky header, keyboard + ARIA,
RTL, theming, density, CSV, server mode, SSR first paint. Acceptance: all §9
gates, plus the axe gate on the consumer fixture and a Chromium probe at 100k
rows.

**Phase 2 — `0.2.0`, editing.**
Cell and row editing, draft + commit contract, sync/async validation, dirty
tracking, batch save, `@rivinia/table/editing` secondary entry (static import;
measured +0.56 kB gzip), variable row heights, row detail expansion, range
selection and clipboard. Acceptance: a consumer payroll screen that edits,
validates and saves 500 rows.

**Phase 3 — `0.3.0`, tree + grouping.**
Tree rows (`role="treegrid"`, `aria-level`), grouping with aggregation rows,
expand/collapse all, sticky group headers (with the AT caveat AG Grid documents,
handled by DOM order).

**Phase 4 — `0.4.0`, the power-user layer.**
Column reorder (pointer + keyboard), column menu (optional `@rivinia/menu`
recipe), column groups, saved views / state persistence helpers, "columns"
chooser, print mode.

**1.0.0** only after the public API has survived one consumer app without
breaking changes.

---

## 11. Risks, and how each is retired

| Risk | Why it is real | Mitigation |
| --- | --- | --- |
| Scope explosion | a table is a product line, not a component | the phase table above; explicit non-goals; no enterprise tier |
| Div-grid ARIA mistakes | we hand-write what `<table>` would give | attribute assertions per cell/row, axe gate, manual SR pass (or reported unverified) |
| Focus lost while virtualizing | the focused cell can be unmounted | active row pinned in the window (T8), regression test with fake geometry |
| Column geometry drift | Ant documents exactly this | one `--rv-table-columns` value on the root, used by every row |
| Variable row heights | measurement + anchoring is genuinely hard | not in 0.1.0; fixed height measured, variable in 0.2.0 |
| Editing complexity | validation, dirty state, async commit, undo | phase 2, draft/commit contract, app owns persistence |
| Sorting pauses at 100k | measured 110–126 ms | documented thresholds, server mode, precomputed keys, future worker |
| RTL geometry | datepicker already found a real RTL bug (D54) | logical properties, browser probe in both directions |
| Span geometry + focus | overlaps, page/pinned boundaries, virtualization, arrow navigation | first-claim-wins + clamps with dev warnings; `spans.move` (35/35 semantic checks); anchor rows kept in the window; Chromium probe in LTR/RTL over sticky header, pinned column and tail overflow |
| Bundle creep | every "small" feature adds up | size budget per release, dist grep gate |
| CDK/TanStack temptation later | "just use X for this one thing" | T3; a dependency needs a measured need and a decision entry |
| Browser support | `position: sticky` now; popover/anchor positioning when the column menu lands | Chromium gate; Firefox/WebKit explicitly reported as unverified |

---

## 12. Open questions

Grouped by whether they block Phase 0. My recommendation is in each line, so
"yes to all" is a valid answer.

**Blocking — I need these before writing code**

1. **Is `0.1.0` read-only?** Recommended: yes; editing in 0.2.0. If the first
   consumer is the payroll screen, the order flips and I would rather know now.
2. **Scale target.** Recommended: 10k smooth client, 100k client with server
   recommended, 1M server-only. If 1M client-side is a hard requirement, the
   virtualizer needs a scaled-scrollbar design from day one.
3. **Server-mode must-haves.** Recommended: sort, filter, page, total,
   select-all-across-pages. Grouping on the server is 0.3.0.
4. **Integrations.** Recommended: zero hard dependencies; built-in filter
   controls are native; `@rivinia/select` / `@rivinia/datepicker` / `@rivinia/menu`
   are documented recipes through template slots. The alternative — peer-depending
   on them — couples their release cycles to the table's.
5. **Column width unit.** Recommended: px for column geometry (persisted,
   resized), rem for density/type tokens.
6. **Name.** Recommended: `@rivinia/table` with `rv-table`; alternative
   `@rivinia/data-grid` if you want the "grid" positioning in the name.

**Deferrable — I will take the default unless you object**

7. **Browser matrix.** Recommended: Chromium is the gate; Firefox/WebKit are
   best-effort and reported honestly, as with the datepicker.
8. **Grouping/pivot.** Recommended: grouping in 0.3.0; **pivot not planned**.
9. **Native `<table>` read-only/print mode.** Recommended: later, as a mode, not
   as the engine.
10. **Row height default.** Recommended: 2.5 rem (`default` density), Carbon's
    40 px at a 16 px root.
11. **Do we ship a toolbar and pagination in the UI, or only the grid?**
    Recommended: ship both; they are the two places where every consumer
    otherwise rewrites the same 80 lines.
12. **Do you want the table demoed in the existing `tmp/consumer` playground**
    (tarball install + production build + Chromium probe), like the datepicker?
    Recommended: yes, once Phase 1 lands.
13. **Maximum span length.** Recommended: clamp at `maxSpanRows = 200` in
    0.1.0 with a dev warning; a real payroll export with a 3,000-row department
    merge is the case that would change it.
14. **Merged-cell selection tint.** Recommended: inherit the anchor row's tint
    (no extra token, no surprise); a distinct `data-merged` style only if a
    consumer asks.

---

## Appendix A — measurement log (2026-10-26)

| Measurement | Value | How |
| --- | --- | --- |
| `@tanstack/angular-table@9.3.1` adapter | 32,046 B raw / 6,311 B gzip | packed from the registry, `gzip -9` |
| `@tanstack/angular-virtual@6.1.9` adapter + core | 1,379 + 13,493 B gzip ≈ 14.9 kB | same |
| `@angular/aria@22.2.4` grid closure | ≈ 63,404 B raw / 11,135 B gzip | FESM + imported chunks |
| `@angular/aria` peers | `@angular/cdk: 22.2.4` exact, `@angular/core` 22 or 23 | `package.json` |
| PrimeNG 22.1.4 table FESM | 350,930 B raw | packed from the registry |
| AG Grid 36.2 whole package | ≈ 377 kB gzip | sum of shipped FESM, gzipped |
| 100k rows: build wrappers | 10.2 ms | Node 24.21, `/tmp/opencode/table-bench.mjs` |
| 100k rows: filter substring | 3.3 ms | same |
| 100k rows: sort numeric | 14.6 ms | same |
| 100k rows: sort `Intl.Collator('en')` | 109.9 ms | same |
| 100k rows: sort `Intl.Collator('ar-EG')` | 126.5 ms | same |
| 100k ids: Map lookups | 34.2 ms | same |
| prototype core FESM (with spans) | 16,804 B raw / 4,877 B gzip | ng-packagr 22.2.4 |
| prototype UI FESM | 30,097 B raw / 5,287 B gzip | same |
| prototype editing FESM | 3,077 B raw / 1,033 B gzip | same |
| span engine in a minified consumer | 1,199 B gzip | esbuild 0.28.2, with/without the engine |
| real app: core / UI / editing deltas | +8,481 / +8,752 / +559 B gzip | Angular 22.2.2 production build |
| span rebuild, 10k × 4 | 2.7–4.1 ms, median 3.1 (16 runs × 20) | `/tmp/opencode/size-lab/bench-spans.mjs` |
| span semantics + contract | 35/35 checks | `/tmp/opencode/size-lab/check-spans.mjs` |
| span rendering probe | header/pinned win over merged; pinned merged stays; tail `scrollHeight` 1281 vs 1240 | Chromium 1248, `/tmp/opencode/span-probe` |
| `resource()` API shape | `params` + `loader({ params, abortSignal })`, `@publicApi 22.0` | installed `@angular/core` `_api-chunk.d.ts` |
| `linkedSignal` | `@publicApi 20.0`, stable | installed `@angular/core` `core.d.ts` |

## Appendix B — sources

- AG Grid, community vs enterprise: https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/
- AG Grid, accessibility (divs, virtualization caveat, `ensureDomOrder`): https://www.ag-grid.com/javascript-data-grid/accessibility/
- AG Grid, row models: https://www.ag-grid.com/javascript-data-grid/row-models/
- AG Grid, column spanning: https://www.ag-grid.com/angular-data-grid/column-spanning/
- AG Grid, row spanning (`spanRows`, `CellSpanModule`, `enableCellSpan`): https://www.ag-grid.com/angular-data-grid/row-spanning/
- MUI X, licensing: https://mui.com/x/introduction/licensing/
- MUI X, pagination: https://mui.com/x/react-data-grid/pagination/
- MUI X, row ARIA (source): `@mui/x-data-grid@9.16.0/hooks/features/rows/useGridRowAriaAttributes.js`
- TanStack Table v9, features: https://tanstack.com/table/latest/docs/guide/features
- TanStack Table v9, row models: https://tanstack.com/table/latest/docs/guide/row-models
- TanStack Table v9.3.1, `cell-spanning` feature (`spanRows`, `spanColumns`, anchor index): installed `@tanstack/table-core@9.3.1`, `dist/features/cell-spanning/*`
- MUI X Data Grid 9.16.0, `colSpan` on the column definition: installed tarball, `models/colDef/gridColDef.d.ts`, `models/gridColumnSpanning.d.ts`
- Ant Design Table, `colSpan` / `onCell` (`0` = not rendered) and virtual/fixed pitfalls: https://ant.design/components/table
- WAI-ARIA 1.2, `aria-colspan`: https://www.w3.org/TR/wai-aria-1.2/#aria-colspan
- WAI-ARIA 1.2, `aria-rowspan` (`0` = rest of the row group): https://www.w3.org/TR/wai-aria-1.2/#aria-rowspan
- WAI-ARIA 1.2, `aria-colindex` (required when any cell spans): https://www.w3.org/TR/wai-aria-1.2/#aria-colindex
- Span and size companion: `docs/table-spans-and-size.md`
- TanStack Virtual: https://tanstack.com/virtual/latest/docs/api/virtualizer
- PrimeNG Table: https://primeng.org/table
- Angular CDK table: https://material.angular.dev/cdk/table/overview
- Angular CDK virtual scroll: https://material.angular.dev/cdk/scrolling/overview
- Angular Aria overview (stable in v22): https://angular.dev/guide/aria/overview
- Angular Aria roadmap: https://angular.dev/roadmap
- `@angular/aria@22.2.4` package source (inspected): `types/grid.d.ts`, `fesm2022/grid.mjs`
- APG grid pattern (keys, rowcount, virtualization caveat): https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- WAI-ARIA 1.2 `aria-rowindex`: https://www.w3.org/TR/wai-aria-1.2/#aria-rowindex
- WAI-ARIA 1.2 `aria-sort` (one header at a time): https://www.w3.org/TR/wai-aria-1.2/#aria-sort
- Carbon data table: https://carbondesignsystem.com/components/data-table/usage/
- Angular `resource` and `linkedSignal`: installed `@angular/core@22.2.2` type definitions

# Spans and size — how `colSpan` / `rowSpan` work, and what they cost

Companion to `docs/table-design.md`. This document answers two questions that
had to be settled before any code:

1. **What can a consumer express with spans, and in what shape?**
2. **What does each part cost, and which parts deserve their own entry point?**

Everything below is either a measured number or a cited source. The prototype
that produced the numbers is in `/tmp/opencode/size-lab` (not part of the
workspace); the browser probe is in `/tmp/opencode/span-probe`. Nothing here is
implemented in `projects/table/` yet.

---

## 0. The verdict

**The API — three knobs, none of which is a coordinate.**

```ts
// the common case: merge repeated values downward
{ id: 'department', header: 'Department', merge: 'equal' }

// a custom run: every candidate is compared with the run's first row
{ id: 'team', header: 'Team', merge: (row, anchor) => row.siteId === anchor.siteId }

// horizontal span: a number, Infinity for "the rest of my pinned region", or a resolver
{ id: 'notes', header: 'Notes', colSpan: 3 }
{ id: 'total', header: 'Total', colSpan: ({ row }) => (row.kind === 'summary' ? Infinity : 1) }

// the escape hatch: both axes on one cell
{ id: 'summary', header: 'Summary', span: ({ row }) => (row.kind === 'summary' ? { rowSpan: 2, colSpan: 4 } : null) }
```

The consumer never writes `0` to hide a covered cell (Ant Design requires
exactly that), never computes a row or column index, never resolves an overlap,
and never adjusts keyboard navigation. Those are the library's job, and they
are the reason spans belong in the **core**, not in the renderer.

**The rendering — one cell, owned by its first row, painted above the rest.**

Measured in Chromium (probe in Appendix B): a merged cell is a child of its
anchor row, `block-size: rowSpan × rowHeight`, `position: relative; z-index: 5`;
rows stay `position: relative; z-index: auto` so they do **not** create
stacking contexts; the sticky header (`z-index: 20`) and pinned cells
(`z-index: 10`) paint above it. Hit-testing lands on the merged cell across the
rows it covers, in LTR and RTL, and the span contributes to `scrollHeight` past
the last row.

**The size — the UI is the expensive part, not the spans.**

| Piece | Cost (gzip) | Method |
| --- | --- | --- |
| headless core, representative usage (sort + page + render) | **+8.48 kB** over an empty app | Angular 22.2.2 production build |
| `ui` grid component | **+8.75 kB** | same |
| span engine inside the core | **1.20 kB** | esbuild 0.28.2, with/without the engine |
| `editing` entry, static import | **+0.56 kB** | Angular 22.2.2 production build |
| `editing` entry, lazy chunk | 0.74 kB on demand, **+0.62 kB initial vs a static import** | same |

**The entry points — three, and `injectAsync` is not for editing.**

```
@rivinia/table            core: row model, spans, selection, navigation, CSV
@rivinia/table/ui         the rendered grid, toolbar, filters, pagination
@rivinia/table/editing    draft + commit editing (opt-in)
```

`injectAsync` resolves **a DI token** from a lazily imported module
(`injector.get(maybeUnwrapDefaultExport(module))`, verified in the installed
core FESM), so it fits a provided singleton — not a per-instance factory like
`createEditing(table)`. And for a feature this small, a dynamic import costs
more initial bytes than it saves. Details in §9.

---

## 1. What the consumer can express

Four levels, in ascending order of control. Each level is opt-in; a column that
declares none behaves exactly as today.

### 1.1 `merge: 'equal'` — repeated values become one cell

```ts
{ id: 'department', accessor: (row) => row.department, merge: 'equal' }
```

Rows are merged **downward** while the value is equal to the run's **first**
row. Nullish values never merge (an empty cell should not swallow the rows
below it). Comparison is `Object.is`.

This is the payroll/organisation chart case: one department name covering its
employees, one invoice number covering its lines.

A column that declares `merge` must have an accessor. A display column has no
value to compare, so `merge` there is a configuration error — a dev warning and
no merge, never "merge everything by accident".

### 1.2 `merge: (row, anchor) => boolean` — a custom run

```ts
{ id: 'period', merge: (row, anchor) => row.periodId === anchor.periodId && row.kind === anchor.kind }
```

The predicate is **anchored**: every candidate is compared with the run's first
row, not with the row above it. That makes runs transitive by construction —
`A = B` and `B = C` cannot produce a run that excludes `A`.

Deliberate difference from AG Grid, whose `spanRows` predicate receives the two
**adjacent** values (`{ valueA, valueB }`): adjacent-pair predicates allow
non-transitive runs, and a run whose middle row fails the predicate is not
expressible as a single DOM cell anyway.

### 1.3 `colSpan` — horizontal, per column

```ts
{ id: 'notes', colSpan: 3 }                                   // always three columns wide
{ id: 'total', colSpan: ({ row }) => row.kind === 'summary' ? Infinity : 1 }
```

- Counted in **visible render order**: hidden columns are not counted, and
  reordering columns changes what "the next three" means.
- `Infinity` means "to the end of my pinned region" — the same value TanStack
  v9 uses for the same concept.
- A span never crosses the start-pinned / scrolling / end-pinned boundary, and
  never leaves the visible column range.

### 1.4 `span` — the escape hatch, both axes

```ts
{ id: 'summary', span: ({ row }) => row.kind === 'summary' ? { rowSpan: 2, colSpan: 4 } : null }
```

`span` and (`merge` | `colSpan`) cannot coexist: `createTable()` **throws** —
in production too, because it is a bug in the column list, not in the data. If
an app replaces its columns at runtime with a conflicting declaration, `span`
wins and the matrix keeps building (no render can afford to throw).

`merge` and `colSpan` **compose**: a column with both produces one rectangle —
the row run from `merge`, the width from `colSpan`. That is the department cell
that covers its employees *and* its neighbour.

The return value is a **request**, not a command: the core clamps it (§3) and
warns in development when the clamp came from an **overlap** (a configuration
hazard). Page and pinned-region clamps are the documented meaning of a request
and stay silent — `Infinity` is *supposed* to stop at the boundary.

### 1.5 What is deliberately *not* in the API

| Not in the API | Why |
| --- | --- |
| returning `0` to hide a covered cell (Ant Design's `onCell`) | the consumer would have to compute coordinates, and a wrong `0` silently deletes data |
| `rowSpan: 0` = "rest of the group" (ARIA's meaning) | ambiguous under virtualization and pagination — what is "the group"? Use `Infinity` for columns; rows are clamped to the page |
| spans computed over the full data set | they must follow the **rendered** order, otherwise sorting breaks them |
| a `span` callback that receives the raw grid and mutates it | the library owns the matrix; the consumer declares intent |

---

## 2. The landscape, measured

| Library | Column span | Row span | Shape |
| --- | --- | --- | --- |
| **AG Grid 36.2** | ✅ `colDef.colSpan = (params) => number` | ✅ `colDef.spanRows: true \| ({ valueA, valueB }) => boolean`, requires `CellSpanModule` + `enableCellSpan` | column-level callback |
| **TanStack Table v9.3** | ✅ `spanColumns: number \| (ctx) => number`, `Infinity` = rest of region | ✅ `spanRows: true \| (ctx) => boolean` | column-level, anchored runs, index of anchor + `0` |
| **MUI X 9.16** | ✅ `colSpan?: number \| GridColSpanFn` | ❌ no row-span API | column-level |
| **Ant Design 6** | ✅ `colSpan` on the column | ✅ per cell via `onCell` returning `{ colSpan, rowSpan }`; `0` means "do not render" | per-cell callback |
| **PrimeNG 22** | ✅ only for header column groups | ⚠️ only `rowGroupMode="rowspan"` — derived from grouping, not a cell API | derived |

Sources in Appendix C.

What this tells us:

- **Nobody exposes a coordinate API.** Every library that has spans asks for a
  *condition* and resolves the geometry itself. Ant's `onCell` is the closest to
  raw coordinates, and its `0` convention is exactly the trap we refuse.
- **Row spans in the Angular incumbents are grouping-derived.** PrimeNG cannot
  merge two arbitrary cells; it can only render a grouping column that way. So a
  real row-span API is a differentiator, not table stakes.
- **TanStack v9 independently landed on the same two knobs** (`spanRows`,
  `spanColumns`) plus an index of anchors. That is strong evidence that
  column-level conditions are the right level of abstraction — and it lets us
  check our semantics against a serious implementation:
  - runs are recomputed from the rows that actually render (never from the full
    data set);
  - runs never cross a page boundary, a pinned-region boundary, a tree-level
    change or a grouped row;
  - spans clamp to the end of the pinned region;
  - the index stores the anchor's span and `0` for covered cells.

Our additions over that shape: `merge: 'equal'` as a one-word default (TanStack
needs `spanRows: true`), the anchored-predicate contract written down, dev
warnings on every clamp, and a navigation function (`move`) that is part of the
headless API rather than a renderer detail.

---

## 3. The model: one matrix, anchors, and clamps

The core builds a **span model** over the *page rows* (after filter → sort →
page) and the *visible columns* (after hide/reorder/pin):

```ts
interface SpanCell { readonly row: number; readonly column: number; readonly rowSpan: number; readonly colSpan: number }

interface SpanModel {
  readonly cells: readonly SpanCell[];              // anchors only
  at(row: number, column: number): SpanCell | null; // the anchor that starts here
  owner(row: number, column: number): SpanCell | null; // the anchor covering this position
  move(row: number, column: number, dRow: number, dColumn: number): { row: number; column: number };
}
```

Rules, in the order they are applied:

1. **Only anchors exist.** A covered position has no `SpanCell` and, in the UI,
   no DOM element. Nothing has to be hidden with `0`.
2. **First claim wins.** The matrix is filled row-major; a cell already claimed
   by an earlier span is skipped. A later span that would overlap is shrunk
   (width first, then height) and a dev warning names both coordinates.
3. **Row spans stop at the page.** `rowSpan = min(requested, rowsOnPage − row)`.
   A page boundary is a real DOM boundary; a span across it cannot be expressed
   and would be wrong ARIA.
4. **Column spans stop at the visible range and at the pinned region.**
   `colSpan = min(requested, visibleColumns − column, distanceToRegionEnd)`.
5. **`Infinity` is resolved before the integer checks**, so "the rest of the
   region" is not a special case downstream.
6. **Invalid values are clamped, not trusted**: `0`, negative, `NaN`, `1.7` →
   `1` plus a dev warning. `span: 0` never deletes a cell.
7. **A column cannot carry both** `span` and (`merge` or `colSpan`) — a
   configuration error thrown at construction.

Why page-clamped rather than "the span continues on the next page": a merged
cell is one DOM element inside one row; carrying a span across a page boundary
would require a synthetic element with no owner row, and the ARIA row indices
would lie about which rows exist. TanStack clamps identically.

Why **post-sort**: a merge is about *adjacency*. Sorting by salary and merging
by department would produce a new run every time the department changes —
correct behavior, and the reason the model is rebuilt whenever the row model
changes (a `computed`, so only when it actually changes).

---

## 4. The algorithm, and what it costs

```
buildSpanModel(rows, columns):
  if no column declares merge/colSpan/span → EMPTY (no allocation at all)
  claimed  = Uint8Array(rows × columns)
  owners   = Int32Array(rows × columns) filled with -1
  for row in 0..rows-1:
    for column in 0..columns-1:
      if claimed[row, column] → continue
      requested = resolve(column, row, column)      // span > colSpan > merge > 1×1
      clamp rowSpan to rows remaining, colSpan to columns remaining
      clamp colSpan to the pinned-region boundary
      while the rectangle is not free → shrink width, then height
      record the anchor, claim the rectangle, fill owners
```

- **Complexity**: O(rows × columns) to visit, plus the claimed rectangle writes,
  which is O(area) — for realistic spans (a handful of rows) that is still
  O(rows × columns).
- **Fast path**: a table with no span declarations returns a shared `EMPTY`
  model without allocating the arrays. A consumer who never spans pays one
  `some()` over the column list.
- **Measured** (`/tmp/opencode/size-lab/bench-spans.mjs`, Node 24.21, this
  machine): **2.7–4.1 ms per rebuild across 16 runs (20 rebuilds each, median
  3.1 ms)** for 10,000 rows × 4 columns with two merge columns and one column
  span, producing 20,219 anchors. An alternating A/B against the prototype from
  before the composition/validation pass measured the same range (old 2.7–3.0,
  new 2.6–4.1), so composition is within measurement noise. That is a
  page-change cost, not a scroll-frame cost: the model is a `computed` over the
  page rows, so scrolling and hover never rebuild it.
- The number will be re-measured after the implementation replaces the
  prototype's per-cell object allocation with two locals (the current version
  allocates one `{ rowSpan, colSpan }` per visited cell).

**Where it runs**: `table.spans` is a computed over `pageRows` and `columns`.
Changing sort/filter/page rebuilds it once; changing selection, hover or scroll
does not touch it.

---

## 5. Navigation: enter a span, leave a span

The roving tabindex lives on **anchors only**, so focus can never sit on a
covered position. Arrow keys therefore need a rule for two different situations:

> **Moving inside a merged cell leaves it. Moving into one lands on its anchor.**

That is the spreadsheet rule, and it is what `SpanModel.move()` implements:

| From | Key | Result |
| --- | --- | --- |
| anchor of a 3-row merge (row 0) | ↓ | the cell in row 3 (the first row after the merge) |
| the row just below a merge | ↑ | the merge's anchor (row 0), not the row above it |
| the cell left of a 2-column span | → | the span's anchor |
| the span's anchor | → | the first cell after the span |
| inside the last merge on the page | ↓ | stays (there is nowhere to go) |

All of these are unit-testable over the matrix with no DOM:

```
35/35 semantic checks pass against the prototype build
(/tmp/opencode/size-lab/check-spans.mjs: 17 navigation, 18 contract/composition)
```

The UI calls `spans.move(...)` for ArrowUp/Down/Left/Right, Home/End
(first/last anchor on the row), and PageUp/PageDown (vertical movement repeated,
then clamped). RTL mirrors only the horizontal keys, unchanged.

---

## 6. Mapping to the DOM and ARIA

One merged cell, three consequences.

### 6.1 DOM

```html
<div role="row" aria-rowindex="12">
  <div role="gridcell" aria-rowspan="3" aria-colindex="2"
       style="grid-column: 2 / span 1; block-size: 120px">Finance</div>
  <div role="gridcell" aria-colindex="3">…</div>
</div>
<div role="row" aria-rowindex="13">
  <!-- column 2 has no cell: it is covered by row 12's cell -->
  <div role="gridcell" aria-colindex="3">…</div>
</div>
```

- The merged cell is a child of its **anchor row**, with an explicit block size
  of `rowSpan × rowHeight`. It is not a second grid; it does not span rows in
  the CSS grid.
- The covered rows simply omit that column. Their cells carry explicit
  `grid-column`, so the grid template does not shift.
- Every cell carries `aria-colindex` **whenever any cell spans**, which
  WAI-ARIA requires in that case; every row already carries `aria-rowindex`
  because of virtualization.
- `aria-rowcount` / `aria-colcount` keep describing the **whole** data set, not
  the rendered page or window — the same rule virtualization already needs.

### 6.2 ARIA rules that decide the implementation (verified in WAI-ARIA 1.2)

- `aria-colspan` must be ≥ 1 and must not cause the cell to overlap the next
  cell; `aria-rowspan` must be ≥ 0 and must not overlap the next cell in the
  same column. Our clamped matrix guarantees both by construction.
- `aria-rowspan="0"` means "rest of the row group" — we never emit it, because
  a page-clamped span is always an explicit count.
- A spanning cell's `aria-rowindex` / `aria-colindex` refer to the **start** of
  the span.
- These attributes are intended for non-native tables; a native `<table>`
  uses `rowspan`/`colspan` instead. That is one more argument for the future
  read-only `<table role="table">` print mode: it can reuse the same matrix and
  emit host-language attributes.

### 6.3 Focus and selection

- Anchors are the only focusable cells, so `aria-activedescendant`-free roving
  tabindex stays consistent.
- Clicking anywhere on a merged cell selects/edits the **anchor row** — the
  content belongs to that row.
- `aria-selected` stays on the row; a merged cell inherits the anchor row's
  selected/hover tint (its own background would otherwise sit above the covered
  rows' backgrounds).
- Editing a merge-key cell can split the run; the app's commit decides whether
  the data changes, and the model recomputes from the new data. A merged cell is
  edited once, at its anchor.

### 6.4 Not verified

Screen-reader announcement of merged cells in a virtualized div grid is **not
verified** in this pass. The ARIA is written to spec and axe can check the
attributes, but "VoiceOver says something sensible about a 3-row merge inside a
100k-row virtualized grid" needs a manual pass — reported as unverified, exactly
as Firefox/WebKit were for the datepicker.

---

## 7. Rendering mechanics, measured in Chromium

A static probe (`/tmp/opencode/span-probe`) reproduces the exact geometry the
design needs: 30 rows × 8 columns, one 3-row merge, one 2-row tail span, a
pinned first column, a sticky header, LTR and RTL, 700 × 400 scroller.

The CSS under test:

```css
.row            { display: grid; grid-template-columns: repeat(8, 150px);
                  block-size: 40px; position: relative; }        /* no z-index! */
.cell.merged    { grid-row: 1; align-self: start;
                  block-size: calc(3 * 40px);
                  position: relative; z-index: 5; }
.pinned         { position: sticky; inset-inline-start: 0; z-index: 10; }
.head           { position: sticky; inset-block-start: 0; z-index: 20; }
.merged.pinned  { z-index: 12; }
```

| Question | Measured answer |
| --- | --- |
| Does the merged cell reach across the rows it covers? | yes — `getBoundingClientRect().height` = **120px** (3 × 40), and the rows stay 40px apart |
| Does it paint above the following rows? | yes — `elementFromPoint` inside rows 2 and 3 of the span returns the merged cell |
| Does it paint above the sticky header? | **no** — the header (z 20) wins, measured at the overlap |
| Does a pinned column paint above it? | yes — the pinned cell (z 10) wins, measured |
| Does a **pinned** merged cell stay pinned while scrolling? | yes — after `scrollLeft = 320`, `x` stays 11 (the scroller's inline start) |
| RTL | `inset-inline-start: 0` pins to the **right** edge (right = 711 = scroller right), and the pinned merged cell follows |
| Does a span past the last row extend the scroll area? | yes — `scrollHeight` 1281 vs 1240 for the rows alone, so **no spacer is needed** |
| What happens if the anchor row leaves the DOM? | the merged cell is gone while the covered rows are still visible — the measured reason for the window rule in §8 |

That last row is the only real hazard the probe found, and it is a
virtualization rule, not a CSS trick.

---

## 8. Virtualization with spans

The window is computed from the scroll position, then **extended upward** to the
anchor row of any span that overlaps the window:

```
window = [first, last]                    // from computeVirtualWindow()
anchor = min(span.row for each span whose row < first and row + rowSpan > first)
window.start = min(window.start, anchor)  // one extra row, usually
```

- Cost: at most the length of the longest span in extra rows. A 3-row merge
  costs one or two extra rows; that is the normal case (groups of 2–20).
- A **guard**: a span longer than `maxSpanRows` (proposed default **200**) is
  clamped by the core with a dev warning. Otherwise a pathological span over
  10,000 rows would defeat virtualization by keeping 10,000 rows mounted.
- The body's top spacer (padding on the rowgroup) is unaffected: the merged cell
  starts at its anchor row's offset, which is inside the padding.
- The tail case needs no spacer: the merged cell's overflow is included in
  `scrollHeight` (measured).
- `aria-rowindex` still refers to the page row, not the window index.

Variable row heights (0.2.0) make `block-size: rowSpan × rowHeight` invalid;
AG Grid's documented rule — the extra height goes to the last row in the span —
is the fallback we will evaluate then. Spans in 0.1.0 ship with fixed heights
only, and the docs say so.

---

## 9. Size: what we measured, and what it decides

### 9.1 Method

- **Prototype package** `@rivinia/table@0.0.0-lab` in `/tmp/opencode/size-lab`,
  built with **ng-packagr 22.2.4** (partial compilation) into three entry
  points: `.` (core), `./editing`, `./ui`.
- **Two core builds**: one with the span engine wired into the controller, one
  with the single call site removed (`NO_SPANS`), everything else identical.
  The delta is the span engine's byte cost.
- **Consumer bundles**: **esbuild 0.28.2**, `--bundle --minify --format=esm`,
  Angular peers external, `gzip -9`. This is the same bundler the Angular 22
  application builder uses.
- **Real application**: an Angular **22.2.2** app built with
  `@angular/build:application` in production mode (optimization on, output
  hashing off, budgets off), one page, measured on the same machine.
- Caveat that matters: the app builds run the Angular **linker**, the esbuild
  bundles do not, so the esbuild numbers under-state the UI (whose template
  compiles into render instructions). The app numbers are the decision input;
  the esbuild numbers isolate the deltas.

### 9.2 Published FESM (unminified, what the tarball contains)

| Entry | raw | gzip |
| --- | --- | --- |
| `@rivinia/table` (core, with spans) | 16,804 B | 4,877 B |
| `@rivinia/table/editing` | 3,077 B | 1,033 B |
| `@rivinia/table/ui` | 30,097 B | 5,287 B |

### 9.3 Consumer bundles (minified, peers external)

| Bundle | raw | gzip | delta |
| --- | --- | --- | --- |
| `import { createTable }` (core with spans) | 9,084 B | 3,619 B | — |
| same, **span engine removed** | 6,320 B | 2,420 B | **spans: 2,764 B / 1,199 B gz** |
| core + `buildSpanModel`/`merge` used | 9,243 B | 3,686 B | +159 B / +67 B gz |
| core + `editing` | 10,814 B | 4,196 B | **editing: 1,730 B / 577 B gz** |
| core + `ui` | 34,439 B | 8,006 B | **ui: 25,355 B / 4,387 B gz** |
| core + dynamic `import('…/editing')` | 9,116 B | 3,644 B | initial +25 B gzip; chunk 1,773 B / 797 B gz |

### 9.4 Real production app (Angular 22.2.2, gzip)

| Build | raw | gzip | delta |
| --- | --- | --- | --- |
| empty app | 93,007 B | 30,891 B | — |
| + core, headless usage (sort + page + render) | 116,490 B | 39,372 B | **+8,481 B** |
| + `@rivinia/table/ui` (grid, filters, footer) | 144,901 B | 48,124 B | **+8,752 B** |
| + `editing` imported statically | 146,621 B | 48,683 B | **+559 B** |
| + `editing` behind `await import()` | initial 145,884 B (main + shared chunk 36,303 + 109,581) | 49,302 B (12,386 + 36,916) | **+1,178 B initial**, +741 B on demand (chunk 1,613 B raw) |

### 9.5 What the numbers decide

**1. Spans stay in the core.** 1,199 B gzip is 33 % of a headless consumer's
core and 15 % of a UI consumer's total. A separate `@rivinia/table/spans`
entry would save that only for a headless consumer who spans nothing — and would
cost a second contract: the controller would have to accept a span model from
outside, the UI would need another input, and navigation would be split across
two packages. Not worth 1.2 kB.

**2. The UI deserves its own entry — and it already has one.** It is the single
biggest piece (+8.75 kB), and the split is clean: a consumer either renders a
grid or does not. This is also the D06 pattern the ecosystem already uses.

**3. Editing is a secondary entry for *contract* reasons, not size.** +0.56 kB
is not a bundle problem. It is optional behavior with its own types
(`TableEditing`, `CellChange`), it will grow an editor UI in 0.2.0, and keeping
it out of the core keeps "the table never mutates your data" visible in the API.
Ship it as `@rivinia/table/editing` and **import it statically** in apps.

**4. `injectAsync` is the wrong tool here, and lazy loading this feature is a
net loss.** Measured against the same app with `editing` imported statically:
lazy loading adds **619 B gzip to the initial payload** (48,683 → 49,302) while
moving only 741 B into the chunk; against the app with no editing at all, the
lazy build still adds **1,178 B gzip initial** (48,124 → 49,302). The extra
chunk boundary costs more in gzip than the feature saves. Lazy loading pays off
for features that are large and rarely used — an XLSX/PDF exporter, a
clipboard/range engine, a worker — not for a 0.5 kB service.
   And mechanically, `injectAsync` cannot express `createEditing(table)` at all:
   it resolves the imported module's default export **through the injector**
   (`injector.get(maybeUnwrapDefaultExport(module))`), so the module must
   default-export a provided DI token. It fits `@rivinia/table/export` as a root
   singleton; it does not fit a per-table factory.

**5. Secondary entries are not about tree-shaking.** A consumer that imports
only `@rivinia/table` pays only for the core: the editing entry exists in the
same tarball and costs the core bundle nothing (measured: 3,619 B gzip with the
editing entry present, exactly the core figure). Entry points earn their keep
through (a) lazy loading, (b) an explicit public contract, and (c) forcing the
wiring decision. Saying "we split it to save bytes" would be false.

### 9.6 Budget check against `table-design.md` §8

| Target | Budget | Prototype |
| --- | --- | --- |
| core FESM gzip | ≤ 10 kB | 4.88 kB |
| UI FESM gzip | ≤ 18 kB | 5.29 kB |
| app delta, core + UI | not set | 17.23 kB |

The prototype is not the implementation (it has one component, no column menu,
no range selection), but the headroom is real: the UI can grow ~3× and still fit
its budget.

---

## 10. Packaging proposal

```
projects/table/
  src/                     → @rivinia/table
  ui/src/                  → @rivinia/table/ui
  editing/src/             → @rivinia/table/editing        (new secondary entry)
  tests/
  ng-package.json          → primary + both secondaries
```

Peers: `@angular/core` (all), `@angular/common` (ui), `@rivinia/table`
(editing, ui). No `@angular/forms` peer in 0.1.0 — editing ships without a
`ControlValueAccessor` (the table is a data grid, not a form control); if a
form-bound editor lands in 0.2.0, the peer is added then, with the
`FormValueControl` precedent from the datepicker.

Release gates gain one line: the packed tarball's **per-entry gzip** is
recorded in `DECISIONS.md`, and a regression beyond 10 % needs a written reason
— a size budget that nobody records is a wish.

---

## 11. Open questions this document does not answer

1. **`maxSpanRows`**: 200 proposed; a real payroll export may merge a whole
   department (thousands of rows). Clamp with a warning, or allow it and accept
   that the window grows? Recommended: clamp at 200 in 0.1.0, revisit with a
   real consumer.
2. **Merged-cell selection tint**: the anchor row's tint vs a distinct
   `data-merged` style. Recommended: inherit the anchor row's tint (fewer
   tokens, no surprise).
3. **Toolbar/pagination split**: they are ~2–3 kB of the UI's 8.8 kB and every
   consumer needs both. Recommended: keep them in `ui`; a `ui/headless-layout`
   entry is not worth a second contract.
4. **Screen-reader pass** on merged cells in a virtualized grid: not done. It is
   the one item that can still change the ARIA mapping.

---

## Appendix A — what the prototype contains

`/tmp/opencode/size-lab/table` — 3 entry points, ~1,100 lines:
`models/table.ts`, `utils/row-model.ts` (filter/sort/page/window, Arabic
normalization), `utils/spans.ts` (the matrix + navigation), `services/selection.ts`,
`services/table.ts` (signals controller), `editing/src/lib/editing.ts` (draft +
validate + commit), `ui/src/lib/components/table/*` (component, template, CSS
with tokens, sticky header, pinned columns, filter row, footer).

It is a measurement instrument, not the implementation: no tests beyond the
semantic checks, no SSR, no axe run.

## Appendix B — the span rendering probe

`/tmp/opencode/span-probe/index.html` + `probe.mjs` (Playwright 1.64.1,
Chromium 1248, viewport 1000 × 700). Every number in §7 comes from
`elementFromPoint`, `getBoundingClientRect` and `scrollHeight` in that page,
with `scrollLeft`/`scrollTop` set to 320/230 to force the interesting overlaps.

## Appendix C — sources (checked 2026-10-26)

- AG Grid 36.2, column spanning: https://www.ag-grid.com/angular-data-grid/column-spanning/
- AG Grid 36.2, row spanning (`spanRows`, `CellSpanModule`, `enableCellSpan`): https://www.ag-grid.com/angular-data-grid/row-spanning/
- TanStack Table v9.3.1, `cell-spanning` feature (`spanRows`, `spanColumns`, `CellSpanIndex`): `@tanstack/table-core@9.3.1`, `dist/features/cell-spanning/*.d.ts`
- MUI X Data Grid 9.16.0, `colSpan` on the column definition: `models/colDef/gridColDef.d.ts`, `models/gridColumnSpanning.d.ts`
- Ant Design Table, `colSpan` / `onCell` (0 = not rendered): https://ant.design/components/table
- PrimeNG 22 Table, `rowGroupMode="rowspan"` and header column groups: https://primeng.org/table
- WAI-ARIA 1.2, `aria-colspan`: https://www.w3.org/TR/wai-aria-1.2/#aria-colspan
- WAI-ARIA 1.2, `aria-rowspan` (0 = rest of the row group): https://www.w3.org/TR/wai-aria-1.2/#aria-rowspan
- WAI-ARIA 1.2, `aria-colindex` (required when any cell spans): https://www.w3.org/TR/wai-aria-1.2/#aria-colindex
- Angular `injectAsync` implementation (`injector.get(maybeUnwrapDefaultExport(module))`): installed `@angular/core@22.2.2`, `fesm2022/core.mjs`

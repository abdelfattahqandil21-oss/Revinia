## 2026-10-27 — D60: `@rivinia/table` — spans inside the core, and the defects a consumer build found

- Context: the ecosystem had no table. The brief: a headless controller plus a
  ready-made grid, with REAL row and column spans (not CSS tricks), an actions
  column the consumer writes end to end, and a playground the user could run.
- **Spans live in the core, not in a `@rivinia/table/spans` entry.** Pinning,
  keyboard navigation and selection all need the grid's real geometry; a second
  entry could only exist by importing the first, so it would be the same package
  with a worse boundary. `table.spans` is a resolved `SpanModel` over
  `pageRows × visibleColumns`, built once per pair, with `at` / `owner` / `move`.
  - Three declarations, enforced at `createTable()`: `merge: 'equal'` (row-span
    by equal consecutive values), `colSpan: n` (or a function), and `span(ctx)`
    (both axes, per cell). `span` + (`merge` | `colSpan`) throws; `merge`
    without an accessor warns; overlaps shrink so the anchor wins, and the
    overlap is reported through `warn`.
- **The grid is divs with explicit ARIA, never `<table>`.** `display: contents`
  rows make the cells items of ONE body grid, so `grid-row: span N` really
  crosses rows — a `<table>` cannot do that with sticky headers, a shared column
  template and virtualized row heights. `role="grid"` / `rowgroup` / `row` /
  `columnheader` / `gridcell`, `aria-rowcount` / `colcount`, `aria-sort`,
  `aria-selected`, `aria-rowspan` / `colspan` on the anchor only.
- **The actions column is consumer markup.** `tableColumn<T>().display('actions')`
  reserves the column; `<ng-template rvTableCell="actions">` fills it. The grid
  ships no icons, no menu, no permission concept — five inline buttons and a
  kebab are both just the template. The UI never reads a row's "actions".
- **Packaging follows D06/D21**: primary entry IS the core, `./ui` depends
  inward, zero new runtime dependencies. Dist FESM imports: core → `@angular/core`;
  UI → `@angular/core` + `@angular/common`. Zero `tslib` imports (D20).
- **Defects found by using it as a consumer, each fixed with a test:**
  1. `TableColumn<T, V = unknown>` made the documented array
     (`TableColumn<Invoice>[]`) reject every `accessor('amount', …)`, because a
     `format(value: number)` cannot accept an `unknown` parameter. Default is now
     `any` — inference at the call site is unchanged, and the array annotation
     erases it.
  2. `pageSize` was read only from `initialState`, so the `pageSize: 25` in the
     README was silently ignored and every table rendered the default 25 rows.
     It is now an option; a restored `initialState.pageSize` still wins.
  3. `selectable` toggled `aria-selected` but drew nothing, so a consumer who
     set it saw no affordance. Each row now gets one DECORATIVE box in its first
     cell (`aria-hidden`): `aria-selected` is the semantics, and a real checkbox
     there would announce the state twice and add a tab stop.
  4. `<rv-table aria-label="…">` — the attribute every consumer writes — stopped
     at the host, so the grid kept the name "Data grid". The component now reads
     the host attribute as a fallback under the `[ariaLabel]` input.
  5. In an Arabic page, an English client name rendered as `.Nile Trading Co`:
     bidi applied the RTL paragraph to the Latin run. Every text span is now
     `dir="auto"`, so the VALUE's direction comes from the value.
  6. A cell whose content is wider than its column painted over its neighbour
     (measured: an actions cell with five text buttons over the amount). The
     grid does not clip a cell by default — a floating menu inside a cell must be
     able to leave it — so the fix is documented (size the column, let it wrap,
     or `overflow: clip` if nothing floats) and the example was resized.
- **Two consumer-only traps, recorded because they will bite again:**
  - `@rivinia/table` resolves from `dist/` for `ng test`, so a fresh checkout
    must `ng build table` first (same as the other UI entries).
  - Replacing a `file:` tarball by extraction does NOT invalidate Vite's
    prebundled deps: `.angular/cache/**/vite/deps/` keeps serving the previous
    build until the cache is cleared. A real `pnpm add` changes the lockfile and
    invalidates it by itself.
- Verified in this session (2026-10-27):
  - **207/207 unit tests in 4 files** (core 148 = 46 controller + 50 spans +
    52 pipeline · UI 59), `ng test table`.
  - `ng build table` → both entry points, 1.3–1.5 s. FESM: core 26,953 B raw /
    **6,775 B gzip**; UI 65,914 B raw / **11,599 B gzip**.
  - Tarball `pack/rivinia-table-0.1.0.tgz`: **8 files, 78.2 kB**, shasum
    `9f36248db1b5d06c3217dc2cebd9509909dc509c`; `exports` `.` + `./ui` only,
    peers `@angular/common` + `@angular/core ^22.0.0`, `sideEffects: false`.
    (The FESM and `.d.ts` files were byte-identical to the previous pack; the
    last repack exists because the README gained its Install and Quick-features
    sections per the D43 convention.)
  - Consumer playground (`tmp/consumer`, public entry points only, tarball
    extracted into `node_modules`): production build **282.54 kB raw / 77.24 kB
    transfer** initial, shared table chunk 43.68 kB / 12.30 kB, pages lazy
    (basic 5.69, spans 3.59, actions 6.64, states 5.48 kB).
  - Chromium against the dev server AND against the production build served by a
    plain static server (`dist/rv-consumer/browser`, no Vite, no HMR), all four
    tabs:
    selection (box + row tint + pill + Space), row spans (`aria-rowspan="4"`,
    48 cells instead of 60 on the spans page, 107 instead of 125 on the full
    page), the actions template (role switch admin → 4 controls, accountant → 2,
    viewer → 1; menu opens, picks, closes, reports
    `copy → INV-1001 (row id 1)`), states (6 skeletons with `aria-busy`, empty
    message, `role="alert"`, densities 32 / 40 / 48 px), Arabic (`dir=rtl`,
    mirrored columns, `dir="auto"` on every value, Arabic loading and empty
    labels), and a 390 px body where the grid scrolls inside its own scroller
    (640 px of content in a 309 px scroller) with the header moving exactly with
    the body (120 px each) and no page overflow. The datepicker playground from
    the previous round still opens its panel (308 px wide, one at a time) in the
    same production build.
  - Not verified and not claimed: screen-reader behaviour, Firefox/WebKit,
    SSR, virtualization (not implemented), server mode (not implemented), and a
    clean `npm install` of the tarball (both npm and pnpm refused it in this
    environment; the files were extracted instead — the packaging itself is
    proven by the same tarball format as the other packages).
- NOT published, NOT committed. Version stays **0.1.0**.

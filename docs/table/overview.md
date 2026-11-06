# Overview

A concise map of the package capabilities and their boundaries.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/table/v1.0.1/projects/table/README.md)

## Quick features

- **Headless first.** The controller is signals and pure functions — no DOM, no
  browser needed to test the pipeline. The grid is a component you can throw
  away and replace with your own markup.
- **Real spans, not CSS tricks.** `merge: 'equal'` for consecutive equal values,
  `colSpan: n`, or a per-cell `span(ctx)` for both axes. The result is a resolved
  matrix, so the keyboard, the ARIA and the pinned columns all follow the real
  geometry.
- **One pipeline.** Filter → sort → page → selection, in that order, every step
  a signal, so a page never recomputes more than it must.
- **Selection by id, never by index.** It survives sorting, filtering and
  paging, and an action always receives the row it was rendered for.
  `selectAllOnPage()` is page-scoped on purpose.
- **A shareable view.** `table.state` is the serialisable slice (sort, filters,
  search, page, page size, selection) — put it in the URL and `setState()`
  restores what the user sees.
- **The actions column is yours.** `display('actions')` reserves the column;
  `<ng-template rvTableCell="actions">` fills it. Five icons, one link, or a
  permission-driven set — the grid passes the row and gets out of the way.
- **Four bodies, not four screens.** Loading skeletons that keep the header
  widths, an empty state, an error alert and the data, all inside one grid, all
  live regions.
- **Right-to-left ready.** Every inset is logical, the header mirrors with the
  body, labels ship in English and Arabic, and each value carries `dir="auto"`
  so an English name stays intact in an Arabic table.
- **Themable end to end.** `--rv-table-*` beats `--rv-*` from `@rivinia/theme`,
  which beats the built-in default; sizes are `rem`, so the grid follows the
  browser's text size.
- **Zero runtime dependencies.** Angular peers only.


## Why another table

Most Angular tables couple three things that change at different speeds: the
data pipeline, the DOM, and the styling. This one separates them. The pipeline
is signals and pure functions, so it is testable without a browser; the grid is
a component you can replace; and every colour, size and radius is a CSS custom
property read at the use site.

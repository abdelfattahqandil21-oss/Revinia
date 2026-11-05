## 2026-10-16 — D34: select search-box owns its keystrokes + autofocus

- Context: lab report — typing in `rv-select` search typed nothing (panel
  menu-typeahead stole focus mid-word), no autofocus on open, stale filter on
  reopen. Measured in headed Chrome: search value `''`, 5 unfiltered rows.
- Decision: search keydown stops propagation except Enter (accept top match),
  Escape (dismiss), arrows (move into list per APG), Tab (jump in manually).
  Opening autofocuses search via select-owned afterRenderEffect + `justOpened`
  signal + microtask (deterministic over the inner menu's item focus); closing
  clears the query. Long panels capped (`min(20rem, 100dvh-2rem)`, scroll).
- Verified: headed run — autofocus lands in search (single + multi), `pai`
  filters to 1 row, Enter/multi picks clean, zero errors. Menu 12/12,
  select 12/12 tests. NOT published.

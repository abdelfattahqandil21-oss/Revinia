## 2026-10-17 — D37: menu audit — real defects vs bad test expectations

- Context: full APG/ARIA audit of `rv-menu` with a new Playwright suite
  (Chromium fixture built from a real production Angular app).
- Method note (kept, because it wasted a full cycle): most "failures" were
  **my own test expectations**, not product bugs. The documented contract is
  "opening focuses the first enabled item", and several tests wrongly assumed
  an extra ArrowDown was needed to get there. Two infrastructure traps also
  masqueraded as defects: `reuseExistingServer` served a stale bundle, and
  key presses sent before the panel opened landed on the trigger.
- Real defects found and fixed (each with a regression test):
  1. `pickFocused()` trusted a stale `activeId`, so Enter activated an item
     that had been disabled after receiving focus (negative control confirmed
     the test catches it).
  2. Deferred focus cleared its flag before the panel existed, stranding focus
     on `<body>`; measurement state was only reset on the popover path.
  3. Outside pointer-down restored focus to the trigger.
  4. The typeahead buffer persisted across close/reopen.
- Decisions: `label` is opt-in (no forced naming); panel id is a module
  counter, stable per instance and safe for SSR because the panel only renders
  client-side; `checked` renders `menuitemcheckbox` while plain rows stay
  `menuitem` (single-select semantics unchanged); no `@layer` (cascade-layer
  vs consumer-utility ordering is not something we could verify here).
- Verified: 23 unit tests; 33/33 Playwright on Chromium; packed 0.2.0 tarball
  inspected (exports/types/peers/files/FESM imports) and built in a clean
  consumer app. Firefox 31/33 with two failures whose cause was not isolated
  (manual Firefox run shows correct focus/active/top-layer); WebKit cannot
  launch in this environment. NOT published.

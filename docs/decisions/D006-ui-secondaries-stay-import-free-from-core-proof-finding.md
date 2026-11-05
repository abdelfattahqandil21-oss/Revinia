## 2026-10-12 — D06: UI secondaries stay import-free from Core (proof finding)

- Context: cross-entry relative imports (`primary → ../core/...`) fail ng-packagr with
  TS6059 (`rootDir` locked to the entry dir); TS6 deprecates `baseUrl`, so source-mapped
  `paths` need migration care. Proven in `proof-core` build attempts.
- Decision: primary entry IS the headless core; `ui` secondary receives data via
  `input()`/templates and imports nothing from Core. Consumers compose in their own
  templates (`<rv-proof-badge [count]="store.count()">`). Chunk grep proves full
  decoupling: core FESM has no UI code, UI FESM has no store code, badge lands only in
  the lazy route chunk. Revisit package-specifier cross-imports only with a measured need.
- Impact: all future `*/ui` entries follow input-composition unless an exception is
  proposed, measured, and logged here.

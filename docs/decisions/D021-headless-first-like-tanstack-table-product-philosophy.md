## 2026-10-12 — D21: headless-first like TanStack Table (product philosophy)

- Core packages sell complex logic, never pixels. The consumer owns rendering:
  use a future `@rivinia/*/ui` entry point or build their own UI — both are
  first-class, and Core releases never wait for UI. No `/ui` secondary is
  required for a Core publish; secondaries are added only with a real,
  validated UI behind them (proof-core/ui stays the packaging experiment).
- Consequence: Core APIs must be fully usable and documented without any UI
  (state signals, handles, recipes for app-owned rendering), and UI entries
  may only depend inward on Core — never the reverse.

## 2026-10-16 — D30: `@rivinia/toast/ui` list component, no new deps

- Context: same shape as D29 — Core owns timers/ordering/dedupe, UI renders.
  Race analysis ("who wins"): Core already settles every race
  (per-toast generations, monotonic ids, update-in-place dedupe, dismiss
  beating stale fires); the UI adds one rule — managed mode wins over
  owned snapshots, so the view never races the manager either.
- Decision: `RiviniaToastList` (managed `[manager]` + presentational
  `[toasts]`), six logical positions defaulting to `bottom-end`, kind rail
  vs `richColors`, `role="status"` (assertive on errors), hover/focus pause,
  150 ms exit snapshots (browser only; SSR drops), reduced-motion support.
  Zero new runtime dependencies; core FESM has zero UI markers.
- Verified: 33/33 toast tests (28 headless + 5 UI), CSR + SSR production
  integration (positions, rich, pause, actions) with zero framework errors.
  NOT published; proposed `toast 0.4.0` (feature, pre-1.0 minor).

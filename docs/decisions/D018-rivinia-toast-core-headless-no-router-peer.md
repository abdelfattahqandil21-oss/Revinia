## 2026-10-12 — D18: @rivinia/toast Core (headless, no Router peer)

- Research applied: WCAG aria-live roles + 2.2.1 timing control (pause/focus,
  persistent, configurable durations — Core exposes the mechanics, UI must bind
  them); industry cap precedent (shadcn limit 3 / BRT 5 → maxVisible 5,
  dismiss-oldest default); update-in-place over flicker (dedupe = update).
- Decisions: peers = `@angular/core` only (Router dropped after proving unneeded —
  3-line app recipe instead); messages are `string | Signal<string>` (reactive
  re-translation without i18n coupling); stale-timer generation guard (i18n-egy
  token pattern family); monotonic never-reused ids; queue timers start at
  promotion; `number | null` on reject; booleans for ambiguous ops; key alone
  never enables.
- Verified: 21/21 vitest (fake timers, incl. timer-count teardown assert),
  ng-packagr build, tarball (5 files), extern consumer install + prod build
  (+0.11 kB). Unverified: browser interaction (demo phase). NOT published
  (awaiting explicit approval).

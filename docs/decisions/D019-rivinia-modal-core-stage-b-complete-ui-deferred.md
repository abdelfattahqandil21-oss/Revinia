## 2026-10-12 — D19: @rivinia/modal Core (Stage B complete, UI deferred)

- Architecture: manager owns registry/results/disposal; Stack/Queue strategies
  own ordering/admission width (pure w.r.t. lifecycle — no mode if/else).
  Primary entry IS Core (D06 precedent); `/ui` comes in Stage C.
- Result contract: Promise-only; 6 settled variants + promise rejection for
  infrastructure failures; results settle at dismissal initiation (animations
  never delay callers); `closing`→`closed` handshake for exit animations
  (confirmClosed/timeout). `close/dismiss/cancel` guard-free primitives with
  booleans; `requestDismiss` runs async guards (deny-safe, stale-safe).
- Notable fixes during validation: overflow-eviction must promote newcomer to
  active; teardown must not promote queued (changes settlement); teardown of
  queued uses queued-cancelled; `debugState` separates active/closing/queued
  buckets (closing still rendered — the earlier test failures were bucket
  semantics, not logic bugs; proven by isolated replication).
- Verified: 24/24 vitest (fake timers), ng-packagr build, tarball (5 files,
  0 DOM markers), external consumer install + prod build (+0.11 kB).
  Peers: `@angular/core` only. NOT published (awaiting explicit approval).

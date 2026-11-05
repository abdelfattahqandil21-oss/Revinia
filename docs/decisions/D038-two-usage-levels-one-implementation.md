## 2026-10-17 — D38: two usage levels, one implementation

- Context: DX task — verify whether `[items]` + `(picked)` and composable
  `rvMenuItem` markup both exist, and remove manual setup from normal usage.
- Verified first: manual `new RiviniaMenu()` / `register()` were already
  optional (the component owns a controller, directives self-register), so the
  gap was the declarative API and the styling hooks, not DI.
- Decision: support both levels because they serve different needs, but route
  the declarative path through the **same** `rvMenuItem` directive, so
  keyboard, focus, registration and click handling exist once. `[items]` +
  projected items throws: a silently dropped list is a data-loss bug.
  `label` renamed to `menuLabel` because the item data also has a `label`.
  Projection accepts both `rvMenuTrigger` and `rv-menu-trigger`.
- Design-tokens: switched to `var(--token, fallback)` and dropped the forced
  dark-mode defaults, because a declaration on the panel out-ranked consumer
  values set on an ancestor. Dark mode is opt-in (also what the brief asks for).
- Defects found by the new consumer-level tests (not by the internal ones):
  late registration could not claim initial activation; `[disabled]` changes
  never synced; static `disabled` attribute collided with the native property.
- Verified: 32 unit tests, 41/41 Playwright on Chromium, packed 0.3.0 tarball
  installed and built in a clean consumer app using both levels. NOT published.

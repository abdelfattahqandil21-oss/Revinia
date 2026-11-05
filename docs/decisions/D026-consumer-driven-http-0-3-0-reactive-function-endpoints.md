## 2026-10-12 — D26: consumer-driven http 0.3.0 (reactive function endpoints)

- Consumer pain (Desktop demo): `getResource(() => url)` — the natural
  `httpResource` style — failed typing (wrapper demanded `Signal`). Real gap,
  not workaround material. Fix: accept `string | Signal | (() => string)` and
  normalize functions via `computed()` (needs injection context, which
  `getResource` already requires like `httpResource` itself).
- Verified: new spec (function endpoint + refetch on signal change), 21/21,
  rebuilt + repacked as 0.3.0 (feature, pre-1.0 minor), Desktop demo builds
  against the tarball; i18n loader impls split into real lazy chunks there.

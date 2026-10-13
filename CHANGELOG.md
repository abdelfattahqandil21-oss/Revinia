# Changelog

Per-package behavior changes. Pre-1.0: minor = breaking/feature, patch = fix.
A change is listed the moment it lands on `main`, not when npm is published.

## Unreleased

### @rivinia/http
- **H-03 (feature):** opt-in backend-envelope validation via an `envelope`
  policy (`successKey`/`errorKey`, default `isSuccess`/`error`). A failed
  envelope throws a typed `RiviniaHttpEnvelopeError` (body + code) instead of
  flowing into `next()` as success; in `getResource` it surfaces as
  `resource.error()`. Off by default; per-call policy replaces global.
- **H-02 (feature):** `getResource` accepts signals and reactive functions for
  `params`/`headers`/`context` (evaluated per request, like `httpResource`).
  New `ReactiveInput<T>` type. URL was already reactive; the rest was static.
- **H-01 (breaking fix):** `unwrapAs` unwraps exactly one envelope level.
  Nested payloads (`{ data: { data, page } }`) are returned whole; recursive
  unwrapping silently dropped sibling fields. No `recursive` option — file an
  issue if a double-wrapped backend genuinely needs it.

### @rivinia/toast
- **T-01 (breaking fix):** `pause()`/`resume()` track suspension explicitly.
  Persistent toasts can never pause, so hover-leave no longer dismisses them;
  `resume()` on anything unpaused returns `false`. Toasts expose `paused`.
  Updating a paused toast stores the new remaining without re-arming.

### @rivinia/modal
- **M-04 (breaking fix):** opening with an already-destroyed owner settles
  `owner-destroyed` immediately without adding a ghost instance (previously
  threw NG0205 after adding).
- **M-02 (breaking fix):** global `dismiss` config is actually read. Merge
  order: built-in defaults < global < preset < per-call, field-by-field (an
  absent key never clobbers).
- **M-03 (feature):** `openModal` accepts a raw `TemplateRef`, a component
  `Type`, or a full descriptor (overloads preserve `TData`/`TResult`);
  component `inputs` via options. README quick start compiles again.
- **M-01 (breaking fix):** owner teardown promotes the queue like any other
  removal. Same-owner queued requests still settle `owner-destroyed` (via
  their own owner callback); independently-owned ones activate.

### @rivinia/i18n
- **I-01 (feature):** `provideRiviniaI18n()` loads the initial language during
  setup (SSR waits via `PendingTasks`). New `preload: false` opt-out, inline
  `translations` seed (network refresh still wins; failures preserve the
  seed), and a `ready` signal. Behavior change: upgrading apps now fetch at
  startup where previously nothing loaded.
- **I-02 (breaking fix):** dictionaries reach visible signals only for the
  currently intended language (replaces the request-token guard, which blocked
  legitimate same-language loads). Explicit preloads of other languages stay
  cached without touching the UI.
- **I-03 (feature):** SSR gaps closed — `<html dir/lang>` via injected
  `DOCUMENT` (server-rendered, no first-paint shift), `'cookie'` storage
  strategy (server reads the request cookie, browser writes it), `TransferState`
  hydration (no double fetch). Server-only paths are code-reviewed, not
  server-executed (no platform-server in this workspace).

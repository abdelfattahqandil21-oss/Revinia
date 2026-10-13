# Changelog

Per-package behavior changes. Pre-1.0: minor = breaking/feature, patch = fix.
A change is listed the moment it lands on `main`, not when npm is published.

## Unreleased

### @rivinia/http
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
- **M-01 (breaking fix):** owner teardown promotes the queue like any other
  removal. Same-owner queued requests still settle `owner-destroyed` (via
  their own owner callback); independently-owned ones activate.

### @rivinia/i18n
- **I-01 (feature):** `provideRiviniaI18n()` loads the initial language during
  setup (SSR waits via `PendingTasks`). New `preload: false` opt-out, inline
  `translations` seed (network refresh still wins; failures preserve the
  seed), and a `ready` signal. Behavior change: upgrading apps now fetch at
  startup where previously nothing loaded.

# Changelog

Per-package behavior changes. Pre-1.0: minor = breaking/feature, patch = fix.
A change is listed the moment it lands on `main`, not when npm is published.

## Unreleased

### @rivinia/i18n (proposed 0.3.0 — breaking default, NOT bumped yet)

- **I-08 (breaking):** default loader path `assets/i18n` → `i18n` (files in
  `public/i18n/`, served from the site root; matches the app template's
  `{ "glob": "**/*", "input": "public" }`). Migration: move
  `src/assets/i18n/*.json` → `public/i18n/*.json`, or pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`. `ng-add` starter, schema descriptions,
  README and JSDoc synced.

## 2026-10-13 — env 0.2.0

### @rivinia/env

- **New package (0.2.0):** `BaseEnvironment` contract + `ng-add` scaffolding
  with environment multi-select, short aliases (`dev`/`stag`/`prod`) and
  per-environment output directories. Typed `environment.model/dev/staging/prod`
  files (version snapshotted from the app's `package.json`) and wiring
  `production`/`staging` file replacements (staging copied from production when
  present). Never overwrites, never removes user config; `development`
  untouched by design.

## 2026-10-13 — http 0.4.0, toast 0.3.0, modal 0.3.0, i18n 0.2.0

### @rivinia/http

- **H-03 (feature):** opt-in backend-envelope validation via an `envelope`
  policy (`successKey`/`errorKey`, default `isSuccess`/`error`). A failed
  envelope throws a typed `RiviniaHttpEnvelopeError` (body + code) instead of
  flowing into `next()` as success; in `getResource` it surfaces as
  `resource.error()`. Off by default; per-call policy replaces global.
  `getResponse`/`postResponse` validate too (raw body kept); binary/text
  paths are exempt (non-JSON by construction).
- **H-02 (feature):** `getResource` accepts signals and reactive functions for
  `params`/`headers`/`context` (evaluated per request, like `httpResource`).
  New `ReactiveInput<T>` type. URL was already reactive; the rest was static.
- **H-04 (feature):** `getResponse`/`postResponse` expose raw status + headers
  (pagination counts, 201 `Location`), plus `getText` for raw text. Raw by
  design — compose `unwrapAs`/`assertEnvelope` yourself when needed.
- **H-01 (breaking fix):** `unwrapAs` unwraps exactly one envelope level.
  Nested payloads (`{ data: { data, page } }`) are returned whole; recursive
  unwrapping silently dropped sibling fields. No `recursive` option — file an
  issue if a double-wrapped backend genuinely needs it.

### @rivinia/toast

- **T-04 (fix):** overflow eviction prefers the oldest timed, actionless toast;
  persistent errors with actions are evicted only when nothing else can go.
- **T-03 (fix):** a kind change re-resolves the per-kind default duration
  unless the toast carries an explicit duration (explicit is sticky forever).
- **T-01 (breaking fix):** `pause()`/`resume()` track suspension explicitly.
  Persistent toasts can never pause, so hover-leave no longer dismisses them;
  `resume()` on anything unpaused returns `false`. Toasts expose `paused`.
  Updating a paused toast stores the new remaining without re-arming.

### @rivinia/modal

- **M-06 (fix):** concurrent `requestDismiss` calls share one in-flight guard
  run (identical results) instead of double-prompting.
- **M-05 (fix):** registry entries are deleted on settle — queued-cancelled
  and rejected opens leave no residue.
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

- **I-07 (feature):** `injectRiviniaI18n<L>()` preserves the language union and
  `defineRiviniaI18n(config)` binds config + accessors with inference, so
  unconfigured ids fail compilation (`@ts-expect-error` covered).
- **I-06 (feature):** `Language.locale` (BCP-47) drives Intl formatting and ICU
  plurals (`ar-EG` digits, not bare-`ar` Latin); formatters cached by
  locale + options.
- **I-05 (breaking fix):** `setLanguageAsync` aborts on load failure —
  language, direction and dictionary stay untouched.
- **I-04 (fix):** browser detection follows priority order (exact then base
  tag per entry) instead of scanning all exact matches first.
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

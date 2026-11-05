## 2026-10-12 — D07: @rivinia/http design (learned from BRT, verified APIs)

- Context: BRT `http-generic.service.ts` pattern — typed get/post/put/patch/delete/getBlob
  over `HttpClient`, `joinUrl` base joining, recursive `{ data }` unwrap, per-request
  options + `HttpContext` escape hatches, auth/error interceptors app-owned. User required:
  global unwrap key + per-call key + unwrap on/off flag, plus `resource` support.
- Verified: `httpResource` stable since v22.0 (angular.dev, installed `http.d.ts` has
  `parse` hook + full `HttpResourceRequest` shape); `resource`/`rxResource` stable.
- Decision: `provideHttp({ baseUrl?, unwrap?=true, unwrapKey?='data' })` (BRT-compatible
  defaults); per call `options.unwrap ?? config.unwrap ?? true`,
  `options.unwrapKey ?? config.unwrapKey ?? 'data'`. Plain Observables for all verbs +
  `getBlob` (never unwrapped) + `getResource()` via `httpResource` with
  `parse = raw -> unwrap -> userParse`. `HttpContext` passed through for app interceptors.
- Peer deps: `@angular/common` + `@angular/core` `^22.0.0`, `rxjs` (Angular's own range).
  The app MUST call `provideHttpClient()` itself; interceptors stay app-owned (BRT
  `auth/error.interceptor.ts` NOT copied — app-specific: tokens, toasts).
- Deferred (additive, semver-minor): `postText`, dedicated `rxResource` mutation helper
  (mutations stay Observable + `resource.reload()`; documented, not implemented).
- Verified 2026-10-12: 15/15 vitest (`HttpTestingController`), ng-packagr build, tarball
  `pack/rivinia-http-0.1.0.tgz`, external consumer install + prod build (initial
  245.29 kB raw / 69.02 transfer; badge lazy chunk unchanged at 1.08 kB).

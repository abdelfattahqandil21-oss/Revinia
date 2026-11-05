## 2026-10-12 — D10: provideHttpClient is default-available; wrap via opt-in httpFeatures

- Research (angular.dev setup guide: "HttpClient is available for injection by
  default in Angular v21+"; `withFetch` deprecated, fetch is the default backend;
  source `_module-chunk.mjs:2035`: every `provideHttpClient()` call re-registers
  `xsrfInterceptorFn` in the multi-token with no cross-call dedup; default chain is
  fully root-provided: HttpClient → HttpHandler → FetchBackend, WITHOUT XSRF).
- Decision: `provideHttp()` NEVER calls `provideHttpClient()` unless the caller
  passes `httpFeatures: [...]` (typed `HttpFeature<HttpFeatureKind>[]`), applied
  once internally. Three documented styles: bare `provideHttp()` (v21+ default),
  single-call with `httpFeatures` (do NOT also call `provideHttpClient()` — double
  XSRF registration), or separate explicit calls (what `ng add` generates, matching
  the official guide; single registration, XSRF on).
- ng-add schematic unchanged (still inserts both calls — official-guide parity).
- Verified: 17/17 vitest (incl. interceptor-applied-through-httpFeatures test;
  testing rule: `provideHttpClientTesting()` must come last so its mock backend wins).

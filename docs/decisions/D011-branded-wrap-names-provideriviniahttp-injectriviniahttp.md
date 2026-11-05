## 2026-10-12 — D11: Branded wrap names (provideRiviniaHttp / injectRiviniaHttp)

- Context: bare `provideHttp` is confusable with Angular's `provideHttpClient`
  (compounded by our `httpFeatures` single-call style). Nothing published yet, so
  a clean rename has zero migration cost. Decision: `provideRiviniaHttp()` +
  `injectRiviniaHttp()` (service stays `RiviniaHttp`); 75 occurrences renamed
  mechanically with word-boundary guards for `provideHttpClient`.
- ng-add extended with `--unwrap-key` (composed with `--baseUrl` into one call arg).
- Verified: schematics 5/5, lib 17/17, rebuild + repack, consumer rebuild
  (245.43 kB), fresh `ng add --baseUrl … --unwrap-key result` wires
  `provideRiviniaHttp({ baseUrl, unwrapKey })` + builds.

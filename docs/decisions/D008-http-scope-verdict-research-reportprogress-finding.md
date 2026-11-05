## 2026-10-12 — D08: http scope verdict (research) + reportProgress finding

- Research (TanStack Angular overview: `@tanstack/angular-query-experimental`, breaking
  changes possible; angular.dev `http-resource` guide; community HTTP-lib thread):
  caching/SWR/dedup belong to TanStack — Rivinia MUST NOT rebuild them; interop recipe
  is `injectQuery(() => ({ queryFn: () => lastValueFrom(api.get(...)) }))`. Retry/timeout
  stay app-side (interceptor or RxJS; retrying non-idempotent POSTs duplicates charges).
  Mutations stay plain Observables + `resource.reload()` per official guidance.
- Decision: v1 transport scope stands (CRUD + unwrap key/flag + getResource). Only
  micro-addition: `reportProgress` passthrough on `getResource` + `projects/http/RECIPES.md`
  (TanStack interop, polling via `rxResource`, retry, mutations, envelopes, progress).
- Finding: `httpResource` does NOT forward `reportProgress` onto the outgoing
  `HttpRequest` (probed 2026-10-12: `rp=false` on the wire object); the `progress`
  signal is the supported surface. Test asserts our surface only, with a NOTE comment.
- Verified: 16/16 vitest, rebuild + repack, external consumer reinstall + prod build
  (initial 245.36 kB raw / 69.05 transfer; lazy badge chunk still 1.08 kB).

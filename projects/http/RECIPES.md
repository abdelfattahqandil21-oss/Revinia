# @rivinia/http — Recipes (deliberately NOT in the library)

`@rivinia/http` is a transport client: typed requests, base URL, envelope
unwrapping, plain Observables + `httpResource`. The patterns below stay in
userland — verified against official Angular docs + TanStack Query docs
(2026-10-12). Copy them into your app; do not expect them from the package.

## 1. Server-state caching (TanStack Query interop)

Caching/SWR/dedup belong to TanStack Query, currently
`@tanstack/angular-query-experimental` (breaking changes possible — pin exact).
Feed it Rivinia observables; unwrapping still applies:

```ts
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';

trips = injectQuery(() => ({
  queryKey: ['trips', this.page()],
  queryFn: () => lastValueFrom(this.api.get<Trip[]>(`trips?page=${this.page()}`)),
}));
```

## 2. Polling (no library needed)

```ts
import { rxResource } from '@angular/core/rxjs-interop';
import { interval, switchMap } from 'rxjs';

status = rxResource({
  stream: () => interval(5000).pipe(switchMap(() => this.api.get<Status>('status'))),
});
```

Stop by destroying the component — `rxResource` cleans up its stream.

## 3. Retry / timeout (app interceptor or RxJS, NOT the client)

Retrying non-idempotent requests (POST payments!) duplicates side effects.
Decide per app, in one place:

```ts
// RxJS at the call site (idempotent reads only)
this.api.get<Trips>('trips').pipe(retry({ count: 2, delay: 500 }), timeout(8000));

// …or a functional interceptor for global policy
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 1, delay: 1000 }));
```

## 4. Mutations (official guidance)

Use the plain methods + `resource.reload()` for reads — never `httpResource`
for POST/PUT (Angular docs explicitly recommend against it):

```ts
this.api.post('trips', dto).subscribe(() => this.tripsResource.reload());
```

## 5. Per-backend envelopes

```ts
provideRiviniaHttp({ unwrap: true });                          // backend wraps { data }
this.api.get<Legacy>('legacy', { unwrap: true, unwrapKey: 'result' }); // odd endpoint
this.api.get<Raw>('raw');                                          // raw (default)
```

## 6. Download progress

```ts
file = this.api.getResource<Blob>('files/9', { reportProgress: true });
loaded = computed(() => this.file.progress()?.loaded ?? 0);
```

Verified 2026-10-12: `httpResource` itself does not forward `reportProgress`
onto the outgoing `HttpRequest` (framework behavior) — the `progress` signal
is the supported surface, and that is what Rivinia exposes. Guard `value()`
reads with `hasValue()` — reading in error state throws (official
`httpResource` behavior, not a Rivinia bug).

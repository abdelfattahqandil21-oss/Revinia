# @rivinia/http

[![npm version](https://img.shields.io/npm/v/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)
[![license](https://img.shields.io/npm/l/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)

Headless typed HTTP client for Angular 22+. Configurable envelope
unwrapping, plain Observables **and** `httpResource` — URLs always used as
given, zero styling, zero backend opinions, interceptors left to your app.

- Version: **0.5.0**
- Requires: **Angular `^22.0.0`**, `rxjs` (same range Angular uses), `tslib`
- Since Angular 21 `HttpClient` (fetch backend) is injectable with zero setup.
  Call `provideHttpClient()` / pass `httpFeatures` only when you configure
  interceptors or other backend features.

## Install

```bash
npm install @rivinia/http
ng add @rivinia/http   # wires app.config.ts (no questions: unwrapping is per call)
```

## Quick start — pick ONE backend style

```ts
// app.config.ts — style A: nothing to configure (Angular ≥21 default)
providers: [provideRiviniaHttp()];

// style B: single call with interceptors (do NOT also call provideHttpClient)
providers: [provideRiviniaHttp({ httpFeatures: [withInterceptors([authInterceptor])] })];

// style C: explicit backend config, like the official setup guide
providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRiviniaHttp()];
```

## URLs: yours, always

The library never joins, prefixes, or rewrites URLs. Compose them at the
call site from wherever you want — typically your environment files
(the BRT pattern):

```ts
// src/environments/environment.ts / environment.prod.ts
export const environment = { apiUrl: 'https://api.example.com' };

// feature service
import { joinUrl } from '@rivinia/http';

export class TripService {
  private api = injectRiviniaHttp();
  private url = (path: string) => joinUrl(environment.apiUrl, path);

  list = () => this.api.get<Trip[]>(this.url('trips'));
  create = (dto: CreateTrip) => this.api.post<Trip>(this.url('trips'), dto);
}

// Reactive resource (auto refetch, loading/error signals)
export class TripPage {
  page = signal(1);
  trips = this.api.getResource<Trip[]>(() => this.url(`trips?page=${this.page()}`));
}
```

```html
@if (trips.hasValue()) { @for (t of trips.value(); track t.id) {
<p>{{ t.title }}</p>
} } @else if (trips.isLoading()) {
<p>Loading…</p>
}
```

## Envelope unwrapping (explicit, per call)

The library assumes nothing about your backend: responses pass through raw
unless the call opts in. There is no global unwrap configuration and no
default key — every unwrapping call states both facts:

```ts
this.api.get<Raw>(url); // raw body (default)
this.api.get<Legacy>(url, { unwrap: true, unwrapKey: 'result' }); // explicit
```

The type system enforces the contract: `{ unwrap: true }` without a key,
a key alone, and `{ unwrap: false, unwrapKey }` all fail compilation.
Different shapes per API in the same app:

```ts
export class MixedService {
  private api = injectRiviniaHttp();

  // main backend: { data: … } (explicit key per call)
  trips = () => this.api.get<Trip[]>(fullUrl('trips'), { unwrap: true, unwrapKey: 'data' });

  // legacy backend: { result: … }
  legacy = () => this.api.get<Old[]>(fullUrl('old'), { unwrap: true, unwrapKey: 'result' });

  // webhook endpoint: raw body (default — nothing to say)
  ping = () => this.api.get<string>(fullUrl('ping'));
}
```

A missing key never passes the body through: it throws
`RiviniaHttpUnwrapError` (with `key` + `endpoint`; the raw `body` is attached
for diagnosis but never interpolated into the message). Catch it like any
HTTP error — in `getResource` it surfaces as `resource.error()`:

```ts
this.api.get<Trip[]>(url, { unwrap: true, unwrapKey: 'data' }).subscribe({
  next: (trips) => (this.list = trips),
  error: (e) => this.fail(e), // RiviniaHttpUnwrapError | HttpErrorResponse
});
```

`getResource` applies the same rules through `parse` (your own `parse` runs
after unwrapping — ideal for Zod/Valibot validation).

## Envelope failure validation (opt-in)

Backends that report failure inside HTTP 200 (`{ data: null, isSuccess: false }`)
must never flow into `next()` as success — critical in payment flows:

```ts
provideRiviniaHttp({ envelope: {} }); // whole app (isSuccess/error keys)
this.api.get(url, { envelope: { successKey: 'ok', errorKey: 'message' } });
```

A failed envelope throws `RiviniaHttpEnvelopeError` (`body` + `code` attached;
in `getResource` it surfaces as `resource.error()`). Validation runs on the raw
body before unwrapping, independent of `unwrap`. Per-call policy replaces any
global one wholesale.

## API

| Export                        | Kind         | Purpose                                                                                                                                                                           |
| ----------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaHttp(config?)` | provider     | `{ envelope?, httpFeatures? }` (no unwrap config — per call only)                                                                                                                 |
| `RiviniaHttp`                 | `@Service()` | `get/post/put/patch/delete`, `getBlob`, `getText`, `getResponse`, `postResponse`, `getResource`                                                                                   |
| `injectRiviniaHttp()`         | function     | shorthand for `inject(RiviniaHttp)`                                                                                                                                               |
| `joinUrl(base, endpoint)`     | util         | slash-safe join; absolute URLs pass through                                                                                                                                       |
| `unwrapAs(body, key)`         | util         | strict single-level extraction — throws `RiviniaHttpUnwrapError` on missing key (nested keys preserved)                                                                           |
| `extractKey(body, key)`       | util         | `unwrapAs` without the generic cast (same strictness)                                                                                                                             |
| types                         | types        | `RiviniaHttpConfig`, `RiviniaRequestOptions`, `RiviniaRawOptions`, `RiviniaDeleteOptions`, `RiviniaResourceOptions`, `RiviniaEnvelopePolicy`, `ReactiveInput`, `QueryParamsInput` |

`getResponse`/`postResponse` return the raw `HttpResponse` (status + headers,
body never unwrapped — and their options REJECT unwrap fields at compile
time via `RiviniaRawOptions`; compose `unwrapAs` yourself if needed). A configured
`envelope` policy still validates the body on these paths: a globally declared
failure rule holds on every JSON path, never just the unwrapped ones. `getText`
returns raw text; binary/text bodies cannot carry envelopes, so the policy does
not apply there. In `getResource`, the URL, `params`, `headers` and `context`
accept values, signals or reactive functions (everything else is static).

`getBlob` is never unwrapped. `HttpContext` passes through untouched, so
app interceptors (auth opt-out, error toasts) keep working. For caching,
polling, retry and TanStack Query interop see [RECIPES.md](./RECIPES.md).

## Type holes (honest, by design)

`unwrapAs<T>` is an unchecked cast — a wrong `T` compiles and mistypes the
payload at runtime. What IS checked is generic flow plus the unwrap contract
itself (see `http-type-safety.spec.ts` `@ts-expect-error` tests). For untyped
backends, pair unwrapping with `envelope` validation or a `parse` hook
(Zod/Valibot — see [RECIPES.md](./RECIPES.md)).

## Migration from global unwrapping (0.4.0 → 0.5.0, breaking)

Global `unwrap`/`unwrapKey` configuration is removed. Previously:

```ts
provideRiviniaHttp({ unwrap: true, unwrapKey: 'data' });
this.api.get<Trip[]>(url); // arrived unwrapped
```

Now every unwrapping call states its key explicitly:

```ts
provideRiviniaHttp();
this.api.get<Trip[]>(url, { unwrap: true, unwrapKey: 'data' });
```

Migrate each applicable call, or the body arrives wrapped (raw). Missing
keys now throw `RiviniaHttpUnwrapError` instead of passing the body through.
`ng add` no longer asks about unwrapping and emits bare
`provideRiviniaHttp()` — there is no automatic migration of call sites.

## Testing your app code

Standard Angular tooling — nothing custom to learn:

```ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting(), provideRiviniaHttp()],
});
api.get('https://api.test/users').subscribe();
TestBed.inject(HttpTestingController).expectOne('https://api.test/users').flush({ data: [] });
```

## License

MIT.

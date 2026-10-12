# @rivinia/http

[![npm version](https://img.shields.io/npm/v/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)
[![license](https://img.shields.io/npm/l/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)

Headless typed HTTP client for Angular 22+. Configurable envelope
unwrapping, plain Observables **and** `httpResource` — URLs always used as
given, zero styling, zero backend opinions, interceptors left to your app.

- Version: **0.3.0**
- Requires: **Angular `^22.0.0`**, `rxjs` (same range Angular uses), `tslib`
- Since Angular 21 `HttpClient` (fetch backend) is injectable with zero setup.
  Call `provideHttpClient()` / pass `httpFeatures` only when you configure
  interceptors or other backend features.

## Install

```bash
npm install @rivinia/http
ng add @rivinia/http   # interactive: asks about unwrapping + key, then wires app.config.ts
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
@if (trips.hasValue()) {
  @for (t of trips.value(); track t.id) { <p>{{ t.title }}</p> }
} @else if (trips.isLoading()) {
  <p>Loading…</p>
}
```

## Envelope unwrapping (opt-in, default off)

The library assumes nothing about your backend: responses pass through raw
unless unwrapping is enabled. Backends that wrap payloads
(`{ data, error, isSuccess }`) opt in globally or per call:

```ts
provideRiviniaHttp({ unwrap: true });                               // whole app, 'data' key
provideRiviniaHttp({ unwrap: true, unwrapKey: 'result' });          // whole app, custom key
this.api.get<Legacy>(url, { unwrap: true, unwrapKey: 'result' });   // this call only
this.api.get<Raw>(url);                                             // raw body (default)
```

NOTE: a key alone never enables unwrapping — only `unwrap: true` does,
at either level. Different shapes per API in the same app:

```ts
export class MixedService {
  private api = injectRiviniaHttp();

  // main backend: { data: … } (global unwrap: true applies, nothing to say)
  trips = () => this.api.get<Trip[]>(fullUrl('trips'));

  // legacy backend: { result: … } (per-call key, unwrapping already on globally)
  legacy = () => this.api.get<Old[]>(fullUrl('old'), { unwrapKey: 'result' });

  // webhook endpoint: raw body despite the enabled global (per-call kill-switch)
  ping = () => this.api.get<string>(fullUrl('ping'), { unwrap: false });
}
```

`getResource` applies the same rules through `parse` (your own `parse` runs
after unwrapping — ideal for Zod/Valibot validation).

## API

| Export | Kind | Purpose |
|---|---|---|
| `provideRiviniaHttp(config?)` | provider | `{ unwrap?=false, unwrapKey?='data', httpFeatures? }` |
| `RiviniaHttp` | `@Service()` | `get/post/put/patch/delete`, `getBlob`, `getResource` |
| `injectRiviniaHttp()` | function | shorthand for `inject(RiviniaHttp)` |
| `joinUrl(base, endpoint)` | util | slash-safe join; absolute URLs pass through |
| `unwrapAs(body, key)` | util | recursive envelope extraction |
| types | types | `RiviniaHttpConfig`, `RiviniaRequestOptions`, `RiviniaDeleteOptions`, `RiviniaResourceOptions`, `QueryParamsInput` |

`getBlob` is never unwrapped. `HttpContext` passes through untouched, so
app interceptors (auth opt-out, error toasts) keep working. For caching,
polling, retry and TanStack Query interop see [RECIPES.md](./RECIPES.md).

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

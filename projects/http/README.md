# @rivinia/http

[![npm version](https://img.shields.io/npm/v/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)
[![license](https://img.shields.io/npm/l/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

`@rivinia/http` is a thin, typed Angular HTTP client for plain `Observable`
requests and reactive `httpResource` requests. It leaves URLs, backend
contracts, and interceptors under app control. Response bodies pass through
unchanged unless a request explicitly asks to unwrap one.

- Package version: **0.5.2**
- Requires Angular `^22.0.0` and RxJS `^6.5.3 || ^7.4.0`; `tslib` is installed
  as a dependency.

## Install and configure

```bash
npm install @rivinia/http
ng add @rivinia/http
```

For a standalone app, `ng add` adds `provideHttpClient()` and
`provideRiviniaHttp()` to the selected project's `src/app/app.config.ts`.
It has no prompts and does not set a base URL or an envelope policy. It is
idempotent and only edits an existing app config containing a `providers: []`
array; if no config is found it warns and skips, so add the providers
manually. In a multi-project workspace it targets `defaultProject` or the
first project; use `--project <name>` to select a project.

The equivalent minimal standalone setup is:

```ts
// src/app/app.config.ts
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRiviniaHttp } from '@rivinia/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideRiviniaHttp()],
};
```

Use the same `provideHttpClient` setup to add app-owned interceptors:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRiviniaHttp } from '@rivinia/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRiviniaHttp()],
};
```

Alternatively, pass features through `provideRiviniaHttp`:

```ts
import { ApplicationConfig } from '@angular/core';
import { withInterceptors } from '@angular/common/http';
import { provideRiviniaHttp } from '@rivinia/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideRiviniaHttp({ httpFeatures: [withInterceptors([authInterceptor])] })],
};
```

Choose one backend setup: when using `httpFeatures`, do not also call
`provideHttpClient()`; otherwise the HTTP backend and its default XSRF
interceptor can be registered twice. If the app already configures
`provideHttpClient(...)`, keep that and call `provideRiviniaHttp()` without
`httpFeatures`.

## URLs and typed service calls

The client sends the endpoint string exactly as given. It never prepends a
base URL or rewrites a path. Compose URLs yourself, for example with
`joinUrl` and the app's environment:

```ts
// src/environments/environment.ts
export const environment = {
  apiUrl: 'https://api.example.com',
} as const;
```

```ts
// src/app/trip.service.ts
import { Service } from '@angular/core';
import type { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { injectRiviniaHttp, joinUrl } from '@rivinia/http';
import { environment } from '../environments/environment';

export interface Trip {
  id: string;
  title: string;
  departureDate: string;
  status: 'planned' | 'booked' | 'cancelled';
}

export interface TripDraft {
  title: string;
  departureDate: string;
}

interface ApiEnvelope<T> {
  data: T;
}

@Service()
export class TripApi {
  private readonly http = injectRiviniaHttp();
  private readonly tripsUrl = joinUrl(environment.apiUrl, 'trips');

  list(): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.tripsUrl, {
      params: { page: 1, search: 'coast' },
      unwrap: true,
      unwrapKey: 'data',
    });
  }

  get(id: string): Observable<Trip> {
    return this.http.get<Trip>(joinUrl(this.tripsUrl, id), {
      unwrap: true,
      unwrapKey: 'data',
    });
  }

  create(input: TripDraft): Observable<Trip> {
    return this.http.post<Trip>(this.tripsUrl, input, {
      unwrap: true,
      unwrapKey: 'data',
    });
  }

  replace(id: string, input: TripDraft): Observable<Trip> {
    return this.http.put<Trip>(joinUrl(this.tripsUrl, id), input, {
      unwrap: true,
      unwrapKey: 'data',
    });
  }

  updateStatus(id: string, status: Trip['status']): Observable<Trip> {
    return this.http.patch<Trip>(
      joinUrl(this.tripsUrl, id),
      { status },
      { unwrap: true, unwrapKey: 'data' },
    );
  }

  cancel(id: string, reason: string): Observable<void> {
    return this.http.delete<void>(joinUrl(this.tripsUrl, id), {
      body: { reason },
      unwrap: true,
      unwrapKey: 'data',
    });
  }

  downloadItinerary(id: string): Observable<Blob> {
    return this.http.getBlob(joinUrl(this.tripsUrl, `${id}/itinerary`));
  }

  getOperatorNotes(id: string): Observable<string> {
    return this.http.getText(joinUrl(this.tripsUrl, `${id}/operator-notes`));
  }

  listWithHeaders(): Observable<HttpResponse<ApiEnvelope<Trip[]>>> {
    return this.http.getResponse<ApiEnvelope<Trip[]>>(this.tripsUrl, {
      params: { page: 1 },
    });
  }

  createAndReadLocation(input: TripDraft): Observable<HttpResponse<ApiEnvelope<Trip>>> {
    return this.http.postResponse<ApiEnvelope<Trip>>(this.tripsUrl, input);
  }
}
```

The JSON endpoints in this example return an object with a `data` field; the first five
methods opt in to extracting that field. `getBlob()` downloads a binary file,
and `getText()` reads plain text; neither method unwraps or checks JSON
envelopes. `getResponse()` and `postResponse()` return the complete
`HttpResponse` so the caller can inspect the status and headers; their body
stays raw and is not unwrapped.

| `RiviniaHttp` method | Used above for                                                     |
| -------------------- | ------------------------------------------------------------------ |
| `get`                | `list()` and `get(id)`                                             |
| `post`               | `create(input)`                                                    |
| `put`                | `replace(id, input)`                                               |
| `patch`              | `updateStatus(id, status)`                                         |
| `delete`             | `cancel(id, reason)`; its optional request body is passed through. |
| `getBlob`            | `downloadItinerary(id)`                                            |
| `getText`            | `getOperatorNotes(id)`                                             |
| `getResponse`        | `listWithHeaders()`                                                |
| `postResponse`       | `createAndReadLocation(input)`                                     |
| `getResource`        | Reactive paginated list in `TripListComponent`.                    |

```ts
// Example use where the API returns pagination metadata in a header.
this.api.listWithHeaders().subscribe((response) => {
  const total = Number(response.headers.get('X-Total-Count') ?? 0);
  console.log(response.status, total, response.body?.data);
});

// A create endpoint may return 201 plus a Location header.
this.api.createAndReadLocation(input).subscribe((response) => {
  const location = response.headers.get('Location');
  console.log(response.status, location, response.body?.data);
});
```

`Observable<T>` is the compile-time type of the result; it does not validate
the server payload. `joinUrl` removes one boundary slash and passes absolute
`http://` or `https://` endpoints through unchanged. Use `params` for query
values: `null` and `undefined` entries are omitted, while strings, numbers,
and booleans are stringified. The standard request options also pass
`headers`, `HttpContext`, and `withCredentials` through to Angular's
`HttpClient`. Use `HttpContext` with your own interceptors for app-specific
controls such as opting out of auth.

## Reactive resources

`getResource` uses Angular's `httpResource`. The endpoint can be a string, a
signal, or a reactive function; `undefined` disables the request. URL,
`params`, `headers`, and `context` can be reactive inputs and trigger a new
request when their signal values change. Other options are read once when
the resource is created.

```ts
import { Component, signal } from '@angular/core';
import { injectRiviniaHttp, joinUrl } from '@rivinia/http';
import { environment } from '../environments/environment';

import type { Trip } from './trip.service';

@Component({
  selector: 'app-trip-list',
  templateUrl: './trip-list.component.html',
})
export class TripListComponent {
  private readonly http = injectRiviniaHttp();
  readonly page = signal(1);
  readonly trips = this.http.getResource<Trip[]>(joinUrl(environment.apiUrl, 'trips'), {
    params: () => ({ page: this.page() }),
    unwrap: true,
    unwrapKey: 'data',
  });

  nextPage(): void {
    this.page.update((value) => value + 1);
  }
}
```

```html
<!-- src/app/trip-list.component.html -->
@if (trips.isLoading()) {
<p>Loading trips…</p>
} @else if (trips.hasValue()) {
<ul>
  @for (trip of trips.value(); track trip.id) {
  <li>{{ trip.title }} — {{ trip.departureDate }} ({{ trip.status }})</li>
  }
</ul>
} @else if (trips.error()) {
<p role="alert">Could not load trips. Try again.</p>
}
<button type="button" (click)="nextPage()">Next page</button>
```

In a real app, share the Trip model through a model module. `parse` is optional;
when provided it runs after envelope validation and unwrapping, and can perform
runtime validation (for example with Zod or Valibot). A parse error, HTTP
error, or library envelope error is exposed through `trips.error()`.
`defaultValue` supplies a value while idle/loading. `reportProgress` is
forwarded to the resource request; for progress events on an `Observable`,
use Angular `HttpClient` directly.

## Response envelopes and errors

By default, all JSON response bodies are returned raw, even when they contain
a field named `data`. To extract a payload, opt in on that call and provide a
key:

```ts
this.http.get<Trip[]>(url); // raw response body
this.http.get<Trip[]>(url, { unwrap: true, unwrapKey: 'data' });
```

The type contract requires `unwrapKey` when `unwrap: true`, and rejects a key
when unwrapping is off. Extraction is strict and single-level: the response
must be a non-null, non-array object with that own property. A missing key,
primitive/array/null body, or empty key throws `RiviniaHttpUnwrapError`;
it does not silently return the original body. Present values such as `null`,
`false`, `0`, and `''` are returned as-is. Nested data and sibling fields are
not modified. `unwrapAs<T>` performs the same one-level extraction outside a
request; its generic type is an unchecked cast, not runtime validation.

An optional envelope policy checks backend-declared failures before
unwrapping. The default keys are `isSuccess` and `error`; only an object whose
`isSuccess` value is exactly `false` is considered failed:

```ts
// Apply to JSON request paths made by this configured client.
provideRiviniaHttp({ envelope: {} });

// Or specify a per-request policy; it replaces the global policy.
this.http.get<Trip[]>(url, {
  envelope: { successKey: 'ok', errorKey: 'message' },
});
```

When a failure is detected, `RiviniaHttpEnvelopeError` is sent through the
Observable error channel or appears as the resource error. It carries the raw
`body` and failure `code`. Set `throwOnFailure: false` for a passive policy.
Policy validation runs before unwrapping, including on `getResponse` and
`postResponse`. Those full-response methods return raw `HttpResponse<T>`
(status, headers, and unwrapped body is not applied). `getBlob` and `getText`
also return raw bodies and do not run envelope validation.

The generic type does not validate the server response. For untrusted or
loosely typed APIs, validate the extracted value with `getResource`'s `parse`
hook, or validate in the Observable pipeline in app code. Do not log
`RiviniaHttpUnwrapError.body` or `RiviniaHttpEnvelopeError.body` without
considering that they may contain sensitive data.

## Public API

| Export                        | Kind     | Purpose                                                                                                          |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaHttp(config?)` | provider | Sets `envelope` and optional `httpFeatures`; no global unwrap option.                                            |
| `RiviniaHttp`                 | class    | `get`, `post`, `put`, `patch`, `delete`, `getBlob`, `getText`, `getResponse`, `postResponse`, and `getResource`. |
| `injectRiviniaHttp()`         | function | Injection-context shorthand for `inject(RiviniaHttp)`.                                                           |
| `joinUrl(base, endpoint)`     | utility  | Removes one boundary slash when joining; absolute HTTP(S) endpoints pass through.                                |
| `unwrapAs(body, key)`         | utility  | Strict, single-level typed extraction.                                                                           |
| `extractKey(body, key)`       | utility  | Strict extraction without a generic cast.                                                                        |
| `RiviniaHttpUnwrapError`      | class    | Error for invalid or missing unwrap properties.                                                                  |
| `RiviniaHttpEnvelopeError`    | class    | Error for a failed configured response envelope.                                                                 |
| `RiviniaHttpConfig`           | type     | `envelope` and `httpFeatures` provider configuration.                                                            |
| `RiviniaEnvelopePolicy`       | type     | Success key, error key, and failure policy settings.                                                             |
| `RiviniaRequestOptions`       | type     | Options for requests that may unwrap.                                                                            |
| `RiviniaRawOptions`           | type     | Options for methods that never unwrap.                                                                           |
| `RiviniaDeleteOptions`        | type     | Delete options including an optional request body.                                                               |
| `RiviniaDeleteRequestOptions` | type     | Delete options including the unwrap contract.                                                                    |
| `RiviniaRequestBase`          | type     | Shared transport and envelope options.                                                                           |
| `RiviniaResourceOptions`      | type     | Reactive resource options and unwrap contract.                                                                   |
| `RiviniaResourceBase`         | type     | Shared resource-specific options.                                                                                |
| `ReactiveInput`               | type     | Static value, signal, or reactive function input.                                                                |
| `QueryParamsInput`            | type     | `HttpParams` or a primitive-valued query object.                                                                 |
| `RiviniaUnwrapOn`             | type     | Required key form for `{ unwrap: true }`.                                                                        |
| `RiviniaUnwrapOff`            | type     | Form where an unwrap key is disallowed.                                                                          |

## Testing

Use Angular's HTTP testing providers. The testing provider follows
`provideHttpClient()` so the test backend replaces the real backend:

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRiviniaHttp, RiviniaHttp } from '@rivinia/http';

TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting(), provideRiviniaHttp()],
});

const api = TestBed.inject(RiviniaHttp);
const requests = TestBed.inject(HttpTestingController);
api
  .get<unknown[]>('https://api.test/trips', {
    unwrap: true,
    unwrapKey: 'data',
  })
  .subscribe();
requests.expectOne('https://api.test/trips').flush({ data: [] });
requests.verify();
```

## Migration from 0.4.x

Global `unwrap` and `unwrapKey` settings were removed in 0.5.0. Move the
unwrap decision and key to each applicable request:

```ts
// Before
provideRiviniaHttp({ unwrap: true, unwrapKey: 'data' });
this.http.get<Trip[]>(url);

// After
provideRiviniaHttp();
this.http.get<Trip[]>(url, { unwrap: true, unwrapKey: 'data' });
```

The `ng add` schematic now emits bare providers and does not migrate request
call sites. Without the per-request options, the response remains raw.

## License

MIT.

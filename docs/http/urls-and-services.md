# URLs and services

Configure HTTP and compose typed endpoint services.

[Back to @rivinia/http README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/http/v1.0.1/projects/http/README.md)

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

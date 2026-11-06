# Reactive resources

Load data with reactive HTTP resources.

[Back to @rivinia/http README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/projects/http/README.md)

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

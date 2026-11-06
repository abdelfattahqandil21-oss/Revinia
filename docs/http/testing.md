# Testing

Test code that uses the package.

[Back to @rivinia/http README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/http/v1.0.1/projects/http/README.md)

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

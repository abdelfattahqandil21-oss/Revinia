# @rivinia/http

[![npm version](https://img.shields.io/npm/v/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)
[![license](https://img.shields.io/npm/l/@rivinia/http.svg)](https://www.npmjs.com/package/@rivinia/http)

A typed Angular HTTP client for Observable requests and reactive resources.

```ts
import { Service } from '@angular/core';
import { injectRiviniaHttp, joinUrl } from '@rivinia/http';
@Service()
export class TripApi {
  private readonly http = injectRiviniaHttp();
  private readonly url = joinUrl('/api', 'trips');
  list() { return this.http.get<Trip[]>(this.url); }
}
```

## Why @rivinia/http

- Typed Observable requests and reactive `httpResource` requests share one client.
- URLs, interceptors, and response contracts remain application-owned.
- Response bodies pass through unless a request explicitly unwraps an envelope.

## Install

```bash
npm install @rivinia/http
ng add @rivinia/http
```

## Quick start

1. Install the package and configure its provider or schematic when required.
2. Use the entry point shown in the example above.
3. Subscribe in the feature and render the response.

## Compatibility

| Angular | RxJS | Node |
| --- | --- | --- |
| `^22.0.0` | `^6.5.3 or ^7.4.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` |

## Go further

| Topic | Read |
| --- | --- |
| URLs and services | [URLs and services](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/docs/http/urls-and-services.md) |
| Reactive resources | [Reactive resources](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/docs/http/resources.md) |
| Response envelopes and errors | [Response envelopes and errors](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/docs/http/envelopes-and-errors.md) |
| API reference | [API reference](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/docs/http/api.md) |
| Testing | [Testing](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/docs/http/testing.md) |

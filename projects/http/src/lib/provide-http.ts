import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RIVINIA_HTTP_CONFIG, type RiviniaHttpConfig } from './http-config';
import { RiviniaHttp } from './rivinia-http';

/**
 * Configures `@rivinia/http`.
 *
 * URLs are always used as given — build them at the call site from wherever
 * you want (see the exported `joinUrl` + your `environment.apiUrl`).
 *
 * Three backend styles (pick ONE):
 * - `provideRiviniaHttp()` alone — Angular ≥21 already injects `HttpClient` (fetch).
 * - `provideRiviniaHttp({ httpFeatures: [withInterceptors([...])] })` — single
 *   call that also configures the backend. Do NOT additionally call
 *   `provideHttpClient()` (double registration duplicates the XSRF interceptor).
 * - `provideHttpClient(...)` + `provideRiviniaHttp()` separately — equivalent,
 *   keeps backend config visibly in app code (this is what `ng add` generates).
 *
 * @example
 * ```ts
 * provideRiviniaHttp({ unwrapKey: 'data' })
 * ```
 */
export function provideRiviniaHttp(config: RiviniaHttpConfig = {}): EnvironmentProviders {
  const { httpFeatures, ...rest } = config;
  return makeEnvironmentProviders([
    ...(httpFeatures ? [provideHttpClient(...httpFeatures)] : []),
    { provide: RIVINIA_HTTP_CONFIG, useValue: rest },
  ]);
}

/** Shorthand for `inject(RiviniaHttp)`. */
export function injectRiviniaHttp(): RiviniaHttp {
  return inject(RiviniaHttp);
}

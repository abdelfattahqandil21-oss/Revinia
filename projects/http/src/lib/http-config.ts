import type { HttpFeature, HttpFeatureKind } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

/**
 * Global configuration for `@rivinia/http`.
 *
 * Every field is optional and can be overridden per request.
 * URLs are ALWAYS used as given — the library never joins, prefixes, or
 * rewrites them. Build them at the call site from wherever you want
 * (`environment.apiUrl`, a constant, a signal …) with the exported `joinUrl`.
 */
export interface RiviniaHttpConfig {
  /**
   * Unwrap `{ [unwrapKey]: payload }` envelopes by default.
   * @default false — the library assumes nothing about your backend;
   * opt in globally here or per call with `{ unwrap: true }`.
   */
  unwrap?: boolean;
  /**
   * Envelope key unwrapped when `unwrap` is enabled.
   * @default 'data'
   */
  unwrapKey?: string;
  /**
   * Optional `HttpClient` features (`withInterceptors(...)`, `withXhr()`, …),
   * applied via a single internal `provideHttpClient(...httpFeatures)` call.
   *
   * Use this INSTEAD of calling `provideHttpClient()` yourself — calling both
   * registers the built-in XSRF interceptor twice (verified against Angular
   * 22.2.2 source: `xsrfInterceptorFn` is a multi-provider with no cross-call
   * dedup). Omit it entirely on Angular ≥21 when you need no features:
   * `HttpClient` (fetch backend) is injectable by default.
   */
  httpFeatures?: HttpFeature<HttpFeatureKind>[];
}

/**
 * Internal configuration token. Consumers must use `provideRiviniaHttp()`.
 * @internal
 */
export const RIVINIA_HTTP_CONFIG = new InjectionToken<RiviniaHttpConfig>(
  'RIVINIA_HTTP_CONFIG',
);

export const DEFAULT_UNWRAP = false;
export const DEFAULT_UNWRAP_KEY = 'data';

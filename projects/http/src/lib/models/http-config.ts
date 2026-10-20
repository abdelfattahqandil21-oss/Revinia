import type { HttpFeature, HttpFeatureKind } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import type { RiviniaEnvelopePolicy } from './http-envelope';

/**
 * Global configuration for `@rivinia/http`.
 *
 * Unwrapping is strictly per request (`{ unwrap: true, unwrapKey }` on the
 * call) — there is intentionally no global unwrap configuration. A global
 * key would silently change what every call returns; an explicit key keeps
 * each call honest. URLs are ALWAYS used as given — the library never joins,
 * prefixes, or rewrites them. Build them at the call site from wherever you
 * want (`environment.apiUrl`, a constant, a signal …) with the exported
 * `joinUrl`.
 */
export interface RiviniaHttpConfig {
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
  /**
   * Opt-in backend-envelope validation applied to every call unless the call
   * provides its own `envelope` (which replaces this wholesale). See
   * `RiviniaEnvelopePolicy`. Off by default — plain bodies flow untouched.
   */
  envelope?: RiviniaEnvelopePolicy;
}

/**
 * Internal configuration token. Consumers must use `provideRiviniaHttp()`.
 * @internal
 */
export const RIVINIA_HTTP_CONFIG = new InjectionToken<RiviniaHttpConfig>('RIVINIA_HTTP_CONFIG');

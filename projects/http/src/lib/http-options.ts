import type { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';

/** Shorthand for building query strings; `null`/`undefined` values are dropped. */
export type QueryParamsInput =
  | HttpParams
  | Record<string, string | number | boolean | undefined | null>;

/**
 * Per-request options. `unwrap` / `unwrapKey` override the global
 * `provideRiviniaHttp()` configuration for this call only.
 */
export interface RiviniaRequestOptions {
  params?: QueryParamsInput;
  headers?: HttpHeaders | Record<string, string | string[]>;
  /** Pass-through for app-owned interceptors (auth opt-out, error policy, ...). */
  context?: HttpContext;
  withCredentials?: boolean;
  /** Enable envelope unwrapping for this call (overrides global `unwrap`). */
  unwrap?: boolean;
  /** Envelope key for this call (overrides global `unwrapKey`). */
  unwrapKey?: string;
}

export interface RiviniaDeleteOptions extends RiviniaRequestOptions {
  body?: unknown;
}

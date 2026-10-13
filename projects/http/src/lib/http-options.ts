import type { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import type { Signal } from '@angular/core';
import type { RiviniaEnvelopePolicy } from './http-envelope';

/**
 * A value, a signal of it, or a reactive function returning it — evaluated
 * inside the `httpResource` request function, so signal reads stay reactive
 * (same contract as `httpResource` itself).
 */
export type ReactiveInput<T> = T | Signal<T> | (() => T);

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
  /**
   * Opt-in backend-envelope validation for this call (replaces any global
   * `envelope` policy wholesale). See `RiviniaEnvelopePolicy`.
   */
  envelope?: RiviniaEnvelopePolicy;
}

export interface RiviniaDeleteOptions extends RiviniaRequestOptions {
  body?: unknown;
}

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
  HttpParams | Record<string, string | number | boolean | undefined | null>;

/**
 * Unwrap contract for a single request — a discriminated union on the literal
 * `unwrap` flag (no overloads needed: both modes return the same types).
 *
 * - omitted/disabled: `unwrapKey` is forbidden (`never`).
 * - `unwrap: true`: `unwrapKey` is required. There is no default key.
 * - a key alone, or `{ unwrap: false, unwrapKey }`, fails compilation.
 *
 * NOTE: excess-property checks apply to fresh literals only. A pre-built
 * object widens `unwrap` to `boolean` — inline the options, annotate them,
 * or use `as const`.
 */
export interface RiviniaUnwrapOn {
  /** Extract `body[unwrapKey]`; a missing key throws `RiviniaHttpUnwrapError`. */
  unwrap: true;
  /** Envelope key to extract. Required, non-empty. No default. */
  unwrapKey: string;
}

export interface RiviniaUnwrapOff {
  unwrap?: false;
  /** Forbidden while unwrapping is off — a key alone never enables it. */
  unwrapKey?: never;
}

/**
 * Shared per-request fields (transport + envelope validation). Unwrap
 * behavior is added by the contract types below — never by a global.
 */
export interface RiviniaRequestBase {
  params?: QueryParamsInput;
  headers?: HttpHeaders | Record<string, string | string[]>;
  /** Pass-through for app-owned interceptors (auth opt-out, error policy, ...). */
  context?: HttpContext;
  withCredentials?: boolean;
  /**
   * Opt-in backend-envelope validation for this call (replaces any global
   * `envelope` policy wholesale). See `RiviniaEnvelopePolicy`.
   */
  envelope?: RiviniaEnvelopePolicy;
}

/**
 * Per-request options for methods that can unwrap (`get`/`post`/`put`/
 * `patch`/`delete`, `getResource`). A discriminated union on the literal
 * `unwrap` flag (no overloads needed: both modes return the same types):
 *
 * - omitted/disabled: `unwrapKey` is forbidden (`never`).
 * - `unwrap: true`: `unwrapKey` is required. There is no default key.
 * - a key alone, or `{ unwrap: false, unwrapKey }`, fails compilation.
 *
 * NOTE: excess-property checks apply to fresh literals only. A pre-built
 * object widens `unwrap` to `boolean` — inline the options, annotate them,
 * or use `as const`.
 */
export type RiviniaRequestOptions = RiviniaRequestBase & (RiviniaUnwrapOn | RiviniaUnwrapOff);

/** Options for methods that never unwrap (blob/text/raw): unwrap fields rejected. */
export type RiviniaRawOptions = RiviniaRequestBase & RiviniaUnwrapOff;

export interface RiviniaDeleteOptions extends RiviniaRequestBase {
  body?: unknown;
}

/**
 * Delete accepts the same unwrap contract as the other unwrapping methods:
 * compose the base delete shape with the union (an `interface extends`
 * a union is illegal, and `Omit` over a union would destroy the
 * discrimination — so the union is applied here explicitly).
 */
export type RiviniaDeleteRequestOptions = RiviniaDeleteOptions &
  (RiviniaUnwrapOn | RiviniaUnwrapOff);

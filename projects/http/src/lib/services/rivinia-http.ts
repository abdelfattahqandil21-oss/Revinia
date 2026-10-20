import {
  HttpClient,
  HttpContext,
  HttpParams,
  httpResource,
  type HttpHeaders,
  type HttpResourceRef,
  type HttpResponse,
} from '@angular/common/http';
import { Service, computed, inject, isSignal, type Signal } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { RIVINIA_HTTP_CONFIG, type RiviniaHttpConfig } from '../models/http-config';
import type {
  QueryParamsInput,
  ReactiveInput,
  RiviniaDeleteRequestOptions,
  RiviniaRawOptions,
  RiviniaRequestBase,
  RiviniaRequestOptions,
  RiviniaUnwrapOff,
  RiviniaUnwrapOn,
} from '../models/http-options';
import { extractKey } from '../utils/http-utils';
import { assertEnvelope, type RiviniaEnvelopePolicy } from '../models/http-envelope';

/**
 * Reactive per-request fields for `getResource` (re-evaluated on every
 * request; everything else is read once per call site).
 */
export interface RiviniaResourceBase<T> {
  /**
   * Query params re-evaluated on every request: value, signal, or reactive
   * function. Anything else in these options is read once per call site —
   * only the URL, params, headers and context are reactive.
   */
  params?: ReactiveInput<QueryParamsInput>;
  headers?: ReactiveInput<HttpHeaders | Record<string, string | string[]>>;
  context?: ReactiveInput<HttpContext>;
  withCredentials?: boolean;
  /** Value while idle/loading. Defaults to `undefined`. */
  defaultValue?: T;
  /**
   * Runs AFTER envelope unwrapping: `raw -> unwrap -> parse`.
   * Use for runtime validation (e.g. Zod) or shaping.
   */
  parse?: (value: unknown) => T;
  /**
   * Forwarded to the `httpResource` request object only (enables the
   * resource `progress` signal for downloads). Has no effect on the
   * plain Observable methods — use `HttpClient` events there directly.
   */
  reportProgress?: boolean;
  /**
   * Opt-in backend-envelope validation for this resource (replaces any
   * global `envelope` policy wholesale). See `RiviniaEnvelopePolicy`.
   */
  envelope?: RiviniaEnvelopePolicy;
}

/**
 * `getResource` options: reactive base + the same per-call unwrap contract
 * as the plain methods (composed explicitly — `Omit` over a union would
 * destroy the discrimination).
 */
export type RiviniaResourceOptions<T> = RiviniaResourceBase<T> &
  (RiviniaUnwrapOn | RiviniaUnwrapOff);

/**
 * Headless typed HTTP client.
 *
 * Thin over `HttpClient` (so app interceptors, `HttpContext` escape hatches
 * and `provideHttpClient()` testing all keep working). Owns no backend:
 * URLs pass through untouched; the library adds opt-in envelope handling —
 * per-request unwrapping (`{ unwrap: true, unwrapKey }`, mandatory key, no
 * default) and failure validation (`envelope`).
 */
@Service()
export class RiviniaHttp {
  private readonly http = inject(HttpClient);
  private readonly config = inject<RiviniaHttpConfig>(RIVINIA_HTTP_CONFIG, {
    optional: true,
  });

  get<T>(endpoint: string, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .get<unknown>(this.url(endpoint), this.httpOptions(options))
      .pipe(map((body) => this.applyUnwrap<T>(endpoint, body, options)));
  }

  post<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .post<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(endpoint, res, options)));
  }

  put<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .put<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(endpoint, res, options)));
  }

  patch<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .patch<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(endpoint, res, options)));
  }

  delete<T>(endpoint: string, options?: RiviniaDeleteRequestOptions): Observable<T> {
    return this.http
      .delete<unknown>(this.url(endpoint), {
        ...this.httpOptions(options),
        body: options?.body,
      })
      .pipe(map((res) => this.applyUnwrap<T>(endpoint, res, options)));
  }

  /** Binary download. Never unwrapped — envelopes don't apply to blobs. */
  getBlob(endpoint: string, options?: RiviniaRawOptions): Observable<Blob> {
    return this.http.get(this.url(endpoint), {
      ...this.httpOptions(options),
      responseType: 'blob',
    });
  }

  /** Plain-text download. Never unwrapped. */
  getText(endpoint: string, options?: RiviniaRawOptions): Observable<string> {
    return this.http.get(this.url(endpoint), {
      ...this.httpOptions(options),
      responseType: 'text',
    });
  }

  /**
   * Full response access (status, headers — e.g. pagination counts or a 201
   * `Location`). Raw body (no unwrapping), but the configured/per-call
   * `envelope` validation still applies to the body — a globally declared
   * failure policy must hold on every JSON path, not just the unwrapped ones.
   */
  getResponse<T>(endpoint: string, options?: RiviniaRawOptions): Observable<HttpResponse<T>> {
    const envelope = this.resolveEnvelope(options);
    return this.http
      .get<T>(this.url(endpoint), {
        ...this.httpOptions(options),
        observe: 'response',
      })
      .pipe(
        map((res) => {
          if (envelope) assertEnvelope(res.body, envelope);
          return res;
        }),
      );
  }

  /**
   * Full response access for creates (status, `Location` header). Same
   * envelope-validation rule as `getResponse`; body otherwise raw.
   */
  postResponse<T>(
    endpoint: string,
    body?: unknown,
    options?: RiviniaRawOptions,
  ): Observable<HttpResponse<T>> {
    const envelope = this.resolveEnvelope(options);
    return this.http
      .post<T>(this.url(endpoint), body, {
        ...this.httpOptions(options),
        observe: 'response',
      })
      .pipe(
        map((res) => {
          if (envelope) assertEnvelope(res.body, envelope);
          return res;
        }),
      );
  }

  /**
   * Reactive GET as an `httpResource` (stable since Angular v22).
   * The endpoint can be a static string, a signal, or a reactive function
   * (same as `httpResource` itself) — it re-fetches on change, and
   * `undefined` disables the request. Unwrap applies through `parse`,
   * composed before a user `parse` if given.
   */
  getResource<T>(
    endpoint: string | Signal<string | undefined> | (() => string | undefined),
    options?: RiviniaResourceOptions<T>,
  ): HttpResourceRef<T | undefined> {
    const { defaultValue, parse, reportProgress, ...requestOptions } = options ?? {};
    const source: string | Signal<string | undefined> =
      typeof endpoint === 'function' && !isSignal(endpoint)
        ? computed(endpoint)
        : (endpoint as string | Signal<string | undefined>);
    const request = () => {
      const ep = typeof source === 'string' ? source : source();
      if (ep === undefined) return undefined;
      return {
        url: this.url(ep),
        params: this.toParams(resolveInput(requestOptions.params)),
        headers: resolveInput(requestOptions.headers),
        context: resolveInput(requestOptions.context),
        withCredentials: requestOptions.withCredentials,
        ...(reportProgress !== undefined ? { reportProgress } : {}),
      };
    };
    const envelope = this.resolveEnvelope(requestOptions);
    const base = { defaultValue: defaultValue as T | undefined };
    // Pipeline order: envelope validation (raw) -> unwrap -> user parse.
    // A throwing envelope or a failed extraction surfaces as resource.error().
    const applyParse = (raw: unknown): T => {
      if (envelope) assertEnvelope(raw, envelope);
      if (requestOptions.unwrap !== true) return parse ? parse(raw as T) : (raw as T);
      const unwrapped = extractKey(raw, requestOptions.unwrapKey) as T;
      return parse ? parse(unwrapped) : unwrapped;
    };
    return defaultValue === undefined
      ? httpResource<T>(request, { ...base, parse: applyParse })
      : httpResource<T>(request, {
          ...base,
          defaultValue: defaultValue as T,
          parse: applyParse,
        });
  }

  private url(endpoint: string): string {
    // Deliberate passthrough: the caller owns the URL (environment, constant,
    // signal …). Use the exported `joinUrl` at the call site when composing.
    return endpoint;
  }

  private resolveEnvelope(options?: {
    envelope?: RiviniaEnvelopePolicy;
  }): RiviniaEnvelopePolicy | undefined {
    return options?.envelope ?? this.config?.envelope;
  }

  private applyUnwrap<T>(endpoint: string, body: unknown, options?: RiviniaRequestOptions): T {
    const envelope = this.resolveEnvelope(options);
    if (envelope) assertEnvelope(body, envelope);
    if (options?.unwrap !== true) return body as T;
    return extractKey(body, options.unwrapKey, endpoint) as T;
  }

  private httpOptions(options?: RiviniaRequestBase) {
    return {
      params: this.toParams(options?.params),
      headers: options?.headers,
      context: options?.context ?? new HttpContext(),
      withCredentials: options?.withCredentials,
    };
  }

  private toParams(input?: QueryParamsInput): HttpParams | undefined {
    if (!input) return undefined;
    if (input instanceof HttpParams) return input;
    let params = new HttpParams();
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}

/**
 * Evaluates a reactive input inside the request function: signals are read
 * (tracked), plain functions are called, values pass through.
 */
function resolveInput<T>(value: ReactiveInput<T> | undefined): T | undefined {
  if (value === undefined) return undefined;
  if (isSignal(value)) return (value as Signal<T>)();
  if (typeof value === 'function') return (value as () => T)();
  return value as T;
}

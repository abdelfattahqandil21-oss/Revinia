import {
  HttpClient,
  HttpContext,
  HttpParams,
  httpResource,
  type HttpHeaders,
  type HttpResourceRef,
} from '@angular/common/http';
import { Service, computed, inject, isSignal, type Signal } from '@angular/core';
import { map, type Observable } from 'rxjs';
import {
  DEFAULT_UNWRAP,
  DEFAULT_UNWRAP_KEY,
  RIVINIA_HTTP_CONFIG,
  type RiviniaHttpConfig,
} from './http-config';
import {
  type QueryParamsInput,
  type ReactiveInput,
  type RiviniaDeleteOptions,
  type RiviniaRequestOptions,
} from './http-options';
import { unwrapAs } from './http-utils';
import { assertEnvelope, type RiviniaEnvelopePolicy } from './http-envelope';

/** Options for `getResource` in addition to per-request options. */
export interface RiviniaResourceOptions<T>
  extends Omit<RiviniaRequestOptions, 'params' | 'headers' | 'context'> {
  /**
   * Query params re-evaluated on every request: value, signal, or reactive
   * function. Anything else in these options is read once per call site —
   * only the URL, params, headers and context are reactive.
   */
  params?: ReactiveInput<QueryParamsInput>;
  headers?: ReactiveInput<HttpHeaders | Record<string, string | string[]>>;
  context?: ReactiveInput<HttpContext>;
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
}

/**
 * Headless typed HTTP client.
 *
 * Thin over `HttpClient` (so app interceptors, `HttpContext` escape hatches
 * and `provideHttpClient()` testing all keep working). Owns no backend:
 * URLs pass through untouched; the library adds opt-in envelope handling —
 * unwrapping (`unwrap`/`unwrapKey`) and failure validation (`envelope`).
 *
 * Unwrap resolution per call: `options.unwrap ?? config.unwrap ?? false`,
 * key: `options.unwrapKey ?? config.unwrapKey ?? 'data'`.
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
      .pipe(map((body) => this.applyUnwrap<T>(body, options)));
  }

  post<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .post<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(res, options)));
  }

  put<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .put<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(res, options)));
  }

  patch<T>(endpoint: string, body?: unknown, options?: RiviniaRequestOptions): Observable<T> {
    return this.http
      .patch<unknown>(this.url(endpoint), body, this.httpOptions(options))
      .pipe(map((res) => this.applyUnwrap<T>(res, options)));
  }

  delete<T>(endpoint: string, options?: RiviniaDeleteOptions): Observable<T> {
    return this.http
      .delete<unknown>(this.url(endpoint), {
        ...this.httpOptions(options),
        body: options?.body,
      })
      .pipe(map((res) => this.applyUnwrap<T>(res, options)));
  }

  /** Binary download. Never unwrapped — envelopes don't apply to blobs. */
  getBlob(endpoint: string, options?: RiviniaRequestOptions): Observable<Blob> {
    return this.http.get(this.url(endpoint), {
      ...this.httpOptions(options),
      responseType: 'blob',
    });
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
    const unwrapKey = this.resolveKey(requestOptions);
    const unwrapEnabled = this.resolveUnwrap(requestOptions);
    const envelope = this.resolveEnvelope(requestOptions);
    const base = { defaultValue: defaultValue as T | undefined };
    // Pipeline order: envelope validation (raw) -> unwrap -> user parse.
    // A throwing envelope surfaces as resource.error() automatically.
    const applyParse = (raw: unknown): T => {
      if (envelope) assertEnvelope(raw, envelope);
      const unwrapped = unwrapEnabled ? unwrapAs<T>(raw, unwrapKey) : (raw as T);
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

  private resolveUnwrap(options?: { unwrap?: boolean }): boolean {
    return options?.unwrap ?? this.config?.unwrap ?? DEFAULT_UNWRAP;
  }

  private resolveKey(options?: { unwrapKey?: string }): string {
    return options?.unwrapKey ?? this.config?.unwrapKey ?? DEFAULT_UNWRAP_KEY;
  }

  private resolveEnvelope(options?: { envelope?: RiviniaEnvelopePolicy }): RiviniaEnvelopePolicy | undefined {
    return options?.envelope ?? this.config?.envelope;
  }

  private applyUnwrap<T>(body: unknown, options?: RiviniaRequestOptions): T {
    const envelope = this.resolveEnvelope(options);
    if (envelope) assertEnvelope(body, envelope);
    if (!this.resolveUnwrap(options)) return body as T;
    return unwrapAs<T>(body, this.resolveKey(options));
  }

  private httpOptions(options?: RiviniaRequestOptions) {
    return {
      params: this.toParams(options?.params),
      headers: options?.headers,
      context: options?.context ?? new HttpContext(),
      withCredentials: options?.withCredentials,
    };
  }

  private toParams(input?: QueryParamsInput): HttpParams | undefined {    if (!input) return undefined;
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

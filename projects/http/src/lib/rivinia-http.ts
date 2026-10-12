import {
  HttpClient,
  HttpContext,
  HttpParams,
  httpResource,
  type HttpResourceRef,
} from '@angular/common/http';
import { Service, inject, type Signal } from '@angular/core';
import { map, type Observable } from 'rxjs';
import {
  DEFAULT_UNWRAP,
  DEFAULT_UNWRAP_KEY,
  RIVINIA_HTTP_CONFIG,
  type RiviniaHttpConfig,
} from './http-config';
import {
  type QueryParamsInput,
  type RiviniaDeleteOptions,
  type RiviniaRequestOptions,
} from './http-options';
import { unwrapAs } from './http-utils';

/** Options for `getResource` in addition to per-request options. */
export interface RiviniaResourceOptions<T> extends RiviniaRequestOptions {
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
 * the app provides `HttpClient`, this library only adds base-URL joining
 * plus configurable envelope unwrapping.
 *
 * Unwrap resolution per call: `options.unwrap ?? config.unwrap ?? true`,
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
   * Re-fetches when the endpoint signal changes; `undefined` disables.
   * Unwrap applies through `parse`, composed before a user `parse` if given.
   */
  getResource<T>(
    endpoint: string | Signal<string | undefined>,
    options?: RiviniaResourceOptions<T>,
  ): HttpResourceRef<T | undefined> {
    const { defaultValue, parse, reportProgress, ...requestOptions } = options ?? {};
    const request = () => {
      const ep = typeof endpoint === 'string' ? endpoint : endpoint();
      if (ep === undefined) return undefined;
      return {
        url: this.url(ep),
        params: this.toParams(requestOptions.params),
        headers: requestOptions.headers,
        context: requestOptions.context,
        withCredentials: requestOptions.withCredentials,
        ...(reportProgress !== undefined ? { reportProgress } : {}),
      };
    };
    const unwrapKey = this.resolveKey(requestOptions);
    const unwrapEnabled = this.resolveUnwrap(requestOptions);
    const base = { defaultValue: defaultValue as T | undefined };
    if (unwrapEnabled) {
      const applyParse = (raw: unknown): T =>
        parse ? parse(unwrapAs<T>(raw, unwrapKey)) : unwrapAs<T>(raw, unwrapKey);
      return defaultValue === undefined
        ? httpResource<T>(request, { ...base, parse: applyParse })
        : httpResource<T>(request, {
            ...base,
            defaultValue: defaultValue as T,
            parse: applyParse,
          });
    }
    return defaultValue === undefined
      ? httpResource<T>(request, { ...base, ...(parse ? { parse } : {}) })
      : httpResource<T>(request, {
          ...base,
          defaultValue: defaultValue as T,
          ...(parse ? { parse } : {}),
        });
  }

  private url(endpoint: string): string {
    // Deliberate passthrough: the caller owns the URL (environment, constant,
    // signal …). Use the exported `joinUrl` at the call site when composing.
    return endpoint;
  }

  private resolveUnwrap(options?: RiviniaRequestOptions): boolean {
    return options?.unwrap ?? this.config?.unwrap ?? DEFAULT_UNWRAP;
  }

  private resolveKey(options?: RiviniaRequestOptions): string {
    return options?.unwrapKey ?? this.config?.unwrapKey ?? DEFAULT_UNWRAP_KEY;
  }

  private applyUnwrap<T>(body: unknown, options?: RiviniaRequestOptions): T {
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

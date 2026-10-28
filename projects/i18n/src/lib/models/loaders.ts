/**
 * Platform facts a loader needs to build a fetchable URL.
 *
 * `baseUrl` mirrors `document.baseURI`: on the browser it is the document's
 * own base, on the server it is the document's `<base href>` resolved against
 * the incoming request. It always describes a DIRECTORY-like base the way the
 * browser sees it (a `<base href="/app/">` keeps its trailing slash; a
 * `<base href="/app">` does not, exactly as in the browser).
 */
export interface LoaderContext {
  /** Absolute base URL for relative dictionary paths. */
  readonly baseUrl: string;
  /** `true` when the application renders on the server (SSR / prerender). */
  readonly isServer: boolean;
}

/**
 * Pluggable key-dictionary loader. Returns a flat/nested JSON-compatible map
 * merged into `loadedTranslations` and read by key-based `translate(key)`.
 */
export interface TranslationLoader<L extends string = string> {
  load(language: L, context?: LoaderContext): Promise<Record<string, unknown>>;
}

/**
 * Lazy descriptor: `resolve()` dynamic-imports the real implementation, so
 * loader code splits out of the main bundle until first use. Resolved once
 * and cached by the service. `context` lets a descriptor pick a
 * platform-specific implementation (e.g. filesystem on the server).
 */
export interface LoaderDescriptor<L extends string = string> {
  resolve(context?: LoaderContext): Promise<TranslationLoader<L>>;
}

export function jsonLoader(options?: { path?: string }): LoaderDescriptor<string> {
  return {
    async resolve() {
      const { JsonLoader } = await import('../services/json-loader.impl');
      return new JsonLoader(options);
    },
  };
}

export interface HttpLoaderOptions {
  readonly endpoint: string;
  readonly method?: string;
  readonly buildUrl?: (language: string) => string;
}

export function httpLoader(options: HttpLoaderOptions): LoaderDescriptor<string> {
  return {
    async resolve() {
      const { HttpLoader } = await import('../services/http-loader.impl');
      return new HttpLoader(options);
    },
  };
}

export interface RemoteLoaderOptions {
  readonly url: (language: string) => string;
  readonly headers?: Record<string, string>;
}

export function remoteLoader(options: RemoteLoaderOptions): LoaderDescriptor<string> {
  return {
    async resolve() {
      const { RemoteLoader } = await import('../services/remote-loader.impl');
      return new RemoteLoader(options);
    },
  };
}

/** Wraps any function as a loader (mocks, in-memory, third-party SDKs). */
export function customLoader<L extends string = string>(
  load: (language: L, context?: LoaderContext) => Promise<Record<string, unknown>>,
): LoaderDescriptor<L> {
  return {
    async resolve() {
      return { load };
    },
  };
}

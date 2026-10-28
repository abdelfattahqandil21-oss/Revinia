import { JsonLoader } from '../services/json-loader.impl';
import { RiviniaLoadError } from './load-error';
import { resolveLoaderUrl } from '../utils/loader-url';

function loadError(url: string, status: number, language: string): Error {
  return new RiviniaLoadError(url, status, language);
}

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

/**
 * The conventional `i18n/{language}.json` loader, and the service's default.
 * Deliberately NOT code-split: it runs in the app initializer, so a lazy chunk
 * would add two script round-trips (loader + its URL helper) before the first
 * dictionary fetch. `httpLoader`/`remoteLoader` stay lazy — they are opt-in.
 */
export function jsonLoader(options?: { path?: string }): LoaderDescriptor<string> {
  return {
    async resolve() {
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
      // The runtime helpers travel as arguments so the lazy chunk imports no
      // module the main bundle already has; a shared import would make the
      // bundler emit an extra initial chunk.
      return new HttpLoader(options, resolveLoaderUrl, loadError);
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
      return new RemoteLoader(options, resolveLoaderUrl, loadError);
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

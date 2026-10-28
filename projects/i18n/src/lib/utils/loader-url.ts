import type { LoaderContext } from '../models/loaders';

/**
 * Resolves a loader URL for the current platform.
 *
 * The browser already resolves a relative `fetch()` URL against
 * `document.baseURI`, so the string is passed through untouched (a consumer's
 * `fetch` mock keeps seeing the same URL it always saw). On the server there
 * is no document, so a relative URL is resolved against `context.baseUrl`.
 *
 * Absolute URLs are never rewritten, and a base that cannot be parsed leaves
 * the input unchanged — a loader must not throw while building a URL.
 */
export function resolveLoaderUrl(url: string, context?: LoaderContext): string {
  if (!context?.isServer) return url;
  try {
    return new URL(url, context.baseUrl).href;
  } catch {
    return url;
  }
}

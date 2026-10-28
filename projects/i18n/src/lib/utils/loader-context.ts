import type { LoaderContext } from '../models/loaders';

/**
 * Builds the loader context ONCE per application.
 *
 * Browser: `document.baseURI` — the exact base the browser uses for relative
 * `fetch()` URLs.
 *
 * Server: the document's `<base href>` resolved against the incoming request
 * URL, mirroring `document.baseURI` semantics (a relative `<base href="./">`
 * resolves against the request path, not the origin). Without a `<base>`
 * element the origin is used, because the conventional layout serves
 * `public/` at the site root.
 *
 * Never throws: an unparsable request URL or base falls back to the
 * document's own base URI.
 */
export function createLoaderContext(request: Request | null, doc: Document): LoaderContext {
  const documentBase = readBaseUri(doc);
  if (!request) {
    return { baseUrl: documentBase, isServer: false };
  }

  const requestUrl = parseUrl(request.url);
  const baseHref = readBaseHref(doc);

  if (baseHref) {
    const resolved = resolveUrl(baseHref, requestUrl?.href ?? documentBase);
    if (resolved) return { baseUrl: resolved, isServer: true };
  }
  if (requestUrl) {
    return { baseUrl: `${requestUrl.origin}/`, isServer: true };
  }
  return { baseUrl: documentBase, isServer: true };
}

function readBaseUri(doc: Document): string {
  const uri = (doc as { baseURI?: string } | null)?.baseURI;
  return typeof uri === 'string' && uri.length > 0 ? uri : '/';
}

function readBaseHref(doc: Document): string | null {
  try {
    const element = doc.querySelector?.('base[href]');
    const href = element?.getAttribute('href')?.trim();
    return href ? href : null;
  } catch {
    return null;
  }
}

function parseUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolveUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

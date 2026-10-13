/**
 * Cookie helpers for the `'cookie'` storage strategy. Pure and SSR-testable:
 * the service supplies the header (server `REQUEST`) or `document.cookie`
 * (browser); these functions only parse and serialize.
 */

/** Extracts a cookie value by name from a `Cookie` header or `document.cookie`. */
export function parseCookie(
  header: string | null | undefined,
  name: string,
): string | null {
  if (!header) return null;
  const prefix = `${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return null;
}

/** Serializes a language cookie ( Lax, root path, one year). */
export function serializeCookie(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

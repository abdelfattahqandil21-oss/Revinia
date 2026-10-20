/**
 * Cookie helpers for the `'cookie'` storage strategy. Pure and SSR-testable:
 * the service supplies the header (server `REQUEST`) or `document.cookie`
 * (browser); these functions only parse and serialize.
 */

/** Extracts a cookie value by name from a `Cookie` header or `document.cookie`. */
export function parseCookie(header: string | null | undefined, name: string): string | null {
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

/** Serializes a language cookie (Lax, root path, one year). */
export function serializeCookie(
  name: string,
  value: string,
  options?: { secure?: boolean },
): string {
  const base = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return options?.secure ? `${base}; Secure` : base;
}

/**
 * Decides whether the language cookie gets `Secure`: only on `https:`, never
 * on `localhost` (dev TLS included — `Secure` there buys nothing and risks
 * silent persistence loss). Pure and SSR-safe: unknown locations → `false`.
 * The server never writes cookies regardless (app-owned responses).
 */
export function shouldSecureCookie(
  location: { protocol?: string; hostname?: string } | null | undefined,
): boolean {
  try {
    if (!location) return false;
    if (location.protocol !== 'https:') return false;
    if (location.hostname === 'localhost') return false;
    return true;
  } catch {
    return false;
  }
}

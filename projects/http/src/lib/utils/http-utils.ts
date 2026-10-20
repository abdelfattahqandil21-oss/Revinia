/**
 * Joins a base URL and an endpoint without producing double slashes.
 * Absolute `http(s)` endpoints pass through untouched.
 */
export function joinUrl(baseUrl: string, endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return path ? `${base}/${path}` : base;
}

/**
 * Typed extraction failure. Thrown when explicit unwrapping
 * (`{ unwrap: true, unwrapKey }`) cannot be performed: empty key, non-object
 * body, or missing property. Never thrown when unwrapping is disabled.
 * In `getResource` this surfaces as `resource.error()`.
 */
export class RiviniaHttpUnwrapError extends Error {
  /** The requested envelope key. */
  readonly key: string;
  /** The endpoint being read, when known (never the body). */
  readonly endpoint: string | undefined;
  /**
   * The raw response body. Attached for diagnosis (a `parse` hook or logger
   * can inspect it) — it may carry PII, so never log it blindly and never
   * interpolate it into messages.
   */
  readonly body: unknown;

  constructor(key: string, body: unknown, endpoint?: string, reason?: string) {
    super(
      `[rivinia/http] Cannot unwrap key "${key}"` +
        (endpoint ? ` from ${endpoint}` : '') +
        (reason ? `: ${reason}` : ': property missing'),
    );
    this.name = 'RiviniaHttpUnwrapError';
    this.key = key;
    this.endpoint = endpoint;
    this.body = body;
  }
}

/**
 * Strict single-level extraction shared by every unwrapping path (plain
 * methods + `getResource`). Rules:
 * - the key must be a non-empty string (an empty key is never intentional);
 * - the body must be a non-null, non-array object;
 * - presence is an OWN-property check (`hasOwnProperty`) — inherited
 *   properties (`'toString' in {}`) never count;
 * - a present-but-falsy value (`null`, `undefined`, `false`, `0`, `''`) is
 *   delivered unchanged — truthiness never decides success;
 * - anything else throws `RiviniaHttpUnwrapError`. The original body is
 *   never silently returned after an explicit extraction fails.
 *
 * Limit, stated openly: presence proves nothing about the value matching an
 * arbitrary generic `T`. Pair with `envelope` validation or a `parse` hook
 * (Zod/Valibot) when the backend is untyped.
 */
export function extractKey(body: unknown, key: string, endpoint?: string): unknown {
  if (typeof key !== 'string' || key.length === 0) {
    throw new RiviniaHttpUnwrapError(key, body, endpoint, 'invalid key');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new RiviniaHttpUnwrapError(key, body, endpoint, 'response is not an object');
  }
  const record = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    throw new RiviniaHttpUnwrapError(key, body, endpoint);
  }
  return record[key];
}

/**
 * Extracts `body[key]` when the backend wraps payloads in an envelope
 * (e.g. `{ data, error, isSuccess }`). Strict: a missing key, a non-object
 * body, or an empty key throws `RiviniaHttpUnwrapError` — the original body
 * is never silently passed through after an explicit extraction request.
 * Unwraps EXACTLY ONE level: a payload that itself contains the key
 * (`{ data: { data: […], page: 1 } }`) is returned whole.
 */
export function unwrapAs<T>(body: unknown, key: string): T {
  return extractKey(body, key) as T;
}

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
 * Extracts `body[key]` when the backend wraps payloads in an envelope
 * (e.g. `{ data, error, isSuccess }`); passes anything else through
 * unchanged. Unwraps EXACTLY ONE level: a payload that itself contains the
 * key (`{ data: { data: […], page: 1 } }`) is returned whole — recursive
 * unwrapping silently destroyed sibling fields (data-loss bug, fixed).
 */
export function unwrapAs<T>(body: unknown, key: string): T {
  if (isObjectRecord(body) && hasOwn(body, key)) {
    return body[key] as T;
  }
  return body as T;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

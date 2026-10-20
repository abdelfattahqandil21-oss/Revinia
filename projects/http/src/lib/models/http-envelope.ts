/**
 * Typed envelope failure. Thrown when a backend signals failure inside a
 * successful HTTP response (e.g. `{ data: null, isSuccess: false }` with
 * HTTP 200) and the envelope policy opts into throwing. In `getResource`
 * this surfaces as `resource.error()`.
 */
export class RiviniaHttpEnvelopeError extends Error {
  /** The raw response body. */
  readonly body: unknown;
  /** The machine-readable failure code (`body[errorKey]`), if any. */
  readonly code: unknown;

  constructor(body: unknown, code: unknown) {
    super(
      typeof code === 'string' && code.length > 0
        ? `[rivinia/http] Request failed: ${code}`
        : '[rivinia/http] Request failed (backend envelope)',
    );
    this.name = 'RiviniaHttpEnvelopeError';
    this.body = body;
    this.code = code;
  }
}

/**
 * Opt-in backend-envelope validation. When present (globally or per call),
 * a response object whose `successKey` is strictly `false` throws
 * `RiviniaHttpEnvelopeError` instead of flowing into `next()` as success.
 * Runs on the raw body before unwrapping, independent of `unwrap`.
 */
export interface RiviniaEnvelopePolicy {
  /** Body key holding the success flag. @default 'isSuccess' */
  readonly successKey?: string;
  /** Body key holding the failure code. @default 'error' */
  readonly errorKey?: string;
  /** Throw on failure. Explicit `false` disables (policy becomes passive). @default true */
  readonly throwOnFailure?: boolean;
}

const DEFAULT_SUCCESS_KEY = 'isSuccess';
const DEFAULT_ERROR_KEY = 'error';

/** Throws when the envelope signals failure and the policy opts in. */
export function assertEnvelope(body: unknown, policy: RiviniaEnvelopePolicy): void {
  if (policy.throwOnFailure === false) return;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return;
  const successKey = policy.successKey ?? DEFAULT_SUCCESS_KEY;
  const record = body as Record<string, unknown>;
  if (!(successKey in record) || record[successKey] !== false) return;
  const errorKey = policy.errorKey ?? DEFAULT_ERROR_KEY;
  throw new RiviniaHttpEnvelopeError(body, record[errorKey]);
}

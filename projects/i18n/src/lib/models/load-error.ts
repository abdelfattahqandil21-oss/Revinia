/**
 * A dictionary request that reached the network and failed.
 *
 * `statusText` is empty on HTTP/2 (measured: Chrome reports an empty string
 * for a 404 over h2), so the message carries the numeric status instead.
 * Passed to `RiviniaI18nConfig.onLoadError`.
 */
export class RiviniaLoadError extends Error {
  readonly url: string;
  readonly status: number;
  readonly language: string;

  constructor(url: string, status: number, language: string, options?: { cause?: unknown }) {
    super(`[rivinia/i18n] Failed to load '${url}' (HTTP ${status})`, options);
    this.name = 'RiviniaLoadError';
    this.url = url;
    this.status = status;
    this.language = language;
  }
}

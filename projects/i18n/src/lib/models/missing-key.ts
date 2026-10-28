/**
 * Emitted (and optionally warned about) when `translate()` cannot resolve a
 * key from the current dictionary, the fallback dictionary, or an explicit
 * `defaultValue`.
 *
 * The event is reported **once per key per session**, no matter how many
 * times a template re-renders it. `fallbackLanguage` is present only when a
 * fallback is configured.
 */
export interface MissingKeyEvent<T extends string = string> {
  readonly key: string;
  readonly language: T;
  readonly fallbackLanguage?: T;
}

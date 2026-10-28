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

/**
 * Emitted (and optionally warned about) when a resolved message needs a named
 * argument that the caller did not pass. Reported **once per (key, param)
 * pair per session**; the placeholder stays in the output.
 */
export interface MissingParamEvent<T extends string = string> {
  readonly key: string;
  readonly param: string;
  readonly language: T;
}

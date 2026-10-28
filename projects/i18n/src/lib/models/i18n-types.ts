/** Text rendering direction. */
export type Direction = 'ltr' | 'rtl';

/**
 * A supported language. `nativeName` is presentation-only metadata for
 * switcher UIs — Core never reads it internally.
 */
export interface Language<T extends string = string> {
  readonly id: T;
  readonly nativeName?: string;
  readonly dir: Direction;
  /**
   * BCP-47 locale for `Intl` formatting and plural rules (e.g. `ar-EG` for
   * Arabic-Indic digits, `en-GB` vs `en-US`). Defaults to the language id —
   * note a bare id like `ar` formats Latin digits, which is often NOT what
   * Arabic readers expect.
   */
  readonly locale?: string;
}

/** Inline typed translations: `{ ar: 'حفظ', en: 'Save' }`. */
export type Translation<T extends string> = Record<T, string>;

/** Persistence backend. SSR-safe: everything degrades to no-op off-browser. */
export type StorageStrategy = 'local' | 'session' | 'none' | 'cookie';

/**
 * Interpolation + ICU params (`{count}`, `{gender}`, `{day, date}`).
 * `Date` values are consumed by `{d, date[, style]}`; a plain `{name}`
 * renders them with `String(value)`.
 */
export type TranslateParams = Record<string, string | number | boolean | Date>;

export interface ViewTransitionInfo {
  readonly language: string;
  readonly direction: Direction;
}

export interface ViewTransitionConfig {
  readonly enabled?: boolean;
  readonly skipInitialTransition?: boolean;
  readonly onViewTransitionCreated?: (info: ViewTransitionInfo) => void;
}

/** `'instant'`: flip now, load in background. `'preload-first'`: no raw-key flash. */
export type SwitchStrategy = 'instant' | 'preload-first';

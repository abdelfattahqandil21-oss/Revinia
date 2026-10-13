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
}

/** Inline typed translations: `{ ar: 'حفظ', en: 'Save' }`. */
export type Translation<T extends string> = Record<T, string>;

/** Persistence backend. SSR-safe: everything degrades to no-op off-browser. */
export type StorageStrategy = 'local' | 'session' | 'none' | 'cookie';

/** Interpolation + ICU params (`{count}`, `{gender}`). */
export type TranslateParams = Record<string, string | number | boolean>;

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

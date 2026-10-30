import { InjectionToken } from '@angular/core';
import type { Language, StorageStrategy, SwitchStrategy, ViewTransitionConfig } from './i18n-types';
import type { LoaderDescriptor } from './loaders';
import type { MissingKeyEvent, MissingParamEvent } from './missing-key';

/**
 * Global configuration for `@rivinia/i18n`.
 */
export interface RiviniaI18nConfig<T extends string = string> {
  readonly languages: readonly Language<T>[];
  /**
   * Language used on a first visit (no stored preference, detection off).
   * Defaults to the first entry of `languages`. When provided it must be a
   * non-empty id present in `languages` — anything else throws at construction
   * instead of resolving to an undefined language.
   */
  readonly defaultLanguage?: T;
  /**
   * Language used when a key is absent from the current dictionary. Must be
   * one of `languages`. The fallback dictionary is loaded silently (it never
   * drives `loadingState`), and its messages are rendered with the fallback
   * language's locale — an English plural template keeps English plural rules.
   */
  readonly fallbackLanguage?: T;
  readonly storageKey?: string;
  readonly storageStrategy?: StorageStrategy;
  readonly autoApplyDirection?: boolean;
  readonly viewTransition?: ViewTransitionConfig;
  /**
   * Dictionary source. Defaults to `jsonLoader()` — the conventional
   * `i18n/{language}.json` layout (files in `public/i18n/`, served from the
   * site root). Override with any descriptor
   * (custom path, HTTP endpoint, in-memory). Inline-only apps that want zero
   * network traffic pass `customLoader(async () => ({}))`.
   */
  readonly loader?: LoaderDescriptor<T>;
  readonly switchStrategy?: SwitchStrategy;
  /** Called when a dictionary load fails. The service still falls back safely. */
  readonly onLoadError?: (language: T, error: unknown) => void;
  /**
   * Log a `console.error` when a dictionary fails to load and no `onLoadError`
   * handler is configured. A failed load leaves every key unresolved, so the
   * page renders raw key names; the warning fires once per language per session.
   * @default isDevMode() && !onLoadError
   */
  readonly warnOnLoadError?: boolean;
  /**
   * Called when `translate()` cannot resolve a key (absent from the current
   * dictionary, from the fallback dictionary, and with no `defaultValue`).
   * Fires once per key per session. When set, the default console warning is
   * suppressed.
   */
  readonly onMissingKey?: (event: MissingKeyEvent<T>) => void;
  /**
   * Log a `console.warn` (once per key) for unresolved keys.
   * @default isDevMode() && !onMissingKey
   */
  readonly warnOnMissingKey?: boolean;
  /**
   * Called once per (key, param) pair when a message needs a named argument
   * that `params` does not provide. The placeholder is still rendered
   * unchanged. Delivered from a microtask, like `onMissingKey`.
   */
  readonly onMissingParam?: (event: MissingParamEvent<T>) => void;
  /**
   * Log a `console.warn` (once per key/param pair) for missing arguments.
   * @default isDevMode() && !onMissingParam
   */
  readonly warnOnMissingParam?: boolean;
  /**
   * Persist the language to storage/cookie after a user-initiated switch
   * (`setLanguage`, `toggle`, `next`, `previous`, `setLanguageAsync`). The
   * initial language is never written, so a cookie is only set once the user
   * actually chooses a language.
   * @default true
   */
  readonly persist?: boolean;
  /**
   * Load the initial language during provider setup (before first paint).
   * SSR waits via `PendingTasks`. Set `false` to skip (e.g. fully inline apps
   * that call `loadTranslations` themselves).
   * @default true
   */
  readonly preload?: boolean;
  /**
   * Inline per-language dictionaries. Seeded before any network load (zero
   * network + SSR-safe first paint); a successful loader response still wins.
   */
  readonly translations?: Partial<Record<T, Record<string, unknown>>>;
  /**
   * Match `navigator.languages` against supported ids on first visit
   * (stored preference always wins; base tags match, e.g. `ar-EG` → `ar`).
   * @default false — explicit opt-in, no surprises.
   */
  readonly detectBrowser?: boolean;
}

/**
 * Internal configuration token. Consumers must use `provideRiviniaI18n()`.
 * @internal
 */
export const RIVINIA_I18N_CONFIG = new InjectionToken<RiviniaI18nConfig>('RIVINIA_I18N_CONFIG');

export const DEFAULT_STORAGE_KEY = 'rivinia.i18n.language';
export const DEFAULT_STORAGE_STRATEGY: StorageStrategy = 'local';
export const DEFAULT_AUTO_APPLY_DIRECTION = true;

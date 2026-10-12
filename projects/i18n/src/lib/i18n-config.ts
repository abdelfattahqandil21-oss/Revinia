import { InjectionToken } from '@angular/core';
import type {
  Language,
  StorageStrategy,
  SwitchStrategy,
  ViewTransitionConfig,
} from './i18n-types';
import type { LoaderDescriptor } from './loaders';

/**
 * Global configuration for `@rivinia/i18n`.
 */
export interface RiviniaI18nConfig<T extends string = string> {
  readonly languages: readonly Language<T>[];
  readonly defaultLanguage: T;
  readonly storageKey?: string;
  readonly storageStrategy?: StorageStrategy;
  readonly autoApplyDirection?: boolean;
  readonly viewTransition?: ViewTransitionConfig;
  readonly loader?: LoaderDescriptor<T>;
  readonly switchStrategy?: SwitchStrategy;
  /** Called when a dictionary load fails. The service still falls back safely. */
  readonly onLoadError?: (language: T, error: unknown) => void;
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
export const RIVINIA_I18N_CONFIG = new InjectionToken<RiviniaI18nConfig>(
  'RIVINIA_I18N_CONFIG',
);

export const DEFAULT_STORAGE_KEY = 'rivinia.i18n.language';
export const DEFAULT_STORAGE_STRATEGY: StorageStrategy = 'local';
export const DEFAULT_AUTO_APPLY_DIRECTION = true;

import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { RIVINIA_I18N_CONFIG, type RiviniaI18nConfig } from './i18n-config';
import { RiviniaI18n } from './rivinia-i18n';

/**
 * Configures `@rivinia/i18n` for the application. Call once at bootstrap.
 * Also registers an app initializer that loads the initial language before
 * first paint (opt out with `preload: false`).
 *
 * @example
 * ```ts
 * provideRiviniaI18n({
 *   defaultLanguage: 'ar',
 *   languages: [
 *     { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
 *     { id: 'en', nativeName: 'English', dir: 'ltr' },
 *   ],
 * })
 * ```
 */
export function provideRiviniaI18n<L extends string>(
  config: RiviniaI18nConfig<L>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RIVINIA_I18N_CONFIG, useValue: config },
    provideAppInitializer(() => {
      const i18n = inject(RiviniaI18n) as RiviniaI18n<string>;
      return i18n.initialize();
    }),
  ]);
}

/** Shorthand for `inject(RiviniaI18n)`. */
export function injectRiviniaI18n(): RiviniaI18n<string> {
  return inject(RiviniaI18n);
}

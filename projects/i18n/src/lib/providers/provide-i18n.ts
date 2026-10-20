import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { RIVINIA_I18N_CONFIG, type RiviniaI18nConfig } from '../models/i18n-config';
import { RiviniaI18n } from '../services/rivinia-i18n';

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

/** Shorthand for `inject(RiviniaI18n)` — preserves the configured language union. */
export function injectRiviniaI18n<L extends string = string>(): RiviniaI18n<L> {
  return inject(RiviniaI18n) as unknown as RiviniaI18n<L>;
}

/**
 * Binds a config and its typed accessors together so `L` is inferred once
 * from the configuration instead of being lost at the injection site.
 *
 * @example
 * ```ts
 * export const i18n = defineRiviniaI18n({
 *   defaultLanguage: 'ar',
 *   languages: [
 *     { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
 *     { id: 'en', nativeName: 'English', dir: 'ltr' },
 *   ],
 * });
 * // app.config.ts
 * providers: [i18n.provide()]
 * // anywhere (typed 'ar' | 'en'):
 * const lang = i18n.inject();
 * ```
 */
export function defineRiviniaI18n<L extends string>(config: RiviniaI18nConfig<L>): {
  readonly config: RiviniaI18nConfig<L>;
  provide: () => EnvironmentProviders;
  inject: () => RiviniaI18n<L>;
} {
  return {
    config,
    provide: () => provideRiviniaI18n(config),
    inject: () => injectRiviniaI18n<L>(),
  };
}

import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { RIVINIA_I18N_CONFIG, type RiviniaI18nConfig } from '../models/i18n-config';
import { RiviniaI18n } from '../services/rivinia-i18n';

/**
 * Type-level scan for a repeated language id. It only sees a tuple, i.e. a
 * `languages` list written inline in the config. A hoisted `const LANGS = […]`
 * widens to an array, where this resolves to `never` — there the runtime check
 * thrown from `RiviniaI18n`'s constructor is the guarantee.
 */
type DuplicateLanguageId<
  T extends readonly { readonly id: string }[],
  Seen extends string = never,
> = T extends readonly [
  infer Head extends { readonly id: string },
  ...infer Rest extends readonly { readonly id: string }[],
]
  ? Head['id'] extends Seen
    ? Head['id'] | DuplicateLanguageId<Rest, Seen | Head['id']>
    : DuplicateLanguageId<Rest, Seen | Head['id']>
  : never;

type AssertUniqueLanguageIds<T extends readonly { readonly id: string }[]> =
  DuplicateLanguageId<T> extends infer Duplicate
    ? [Duplicate] extends [never]
      ? unknown
      : { readonly duplicateLanguageId: Duplicate }
    : never;

/**
 * Configures `@rivinia/i18n` for the application. Call once at bootstrap.
 * Also registers an app initializer that loads the initial language before
 * first paint (opt out with `preload: false`).
 *
 * A repeated id written inline (`languages: [AR, EN, AR]`) is a compile error.
 * The check needs the array literal, so it is skipped when the call supplies
 * the language union explicitly (`<'ar' | 'en'>`) or passes a hoisted list —
 * both still fail at bootstrap with the runtime error. `Language` in TS terms
 * (not this guard) is what requires `dir`.
 *
 * @example
 * ```ts
 * provideRiviniaI18n({
 *   languages: [
 *     { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
 *     { id: 'en', nativeName: 'English', dir: 'ltr' },
 *   ],
 * })
 * ```
 *
 * @example
 * ```ts
 * // `as const` keeps `id` and `dir` literal — hoisted objects would
 * // otherwise widen to `string` and fail the `Language` check.
 * const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
 * const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;
 * provideRiviniaI18n<'ar' | 'en'>({
 *   languages: [AR, EN],
 * })
 * ```
 */
export function provideRiviniaI18n<
  L extends string,
  const C extends RiviniaI18nConfig<L> = RiviniaI18nConfig<L>,
>(
  config: C & AssertUniqueLanguageIds<C['languages']> & RiviniaI18nConfig<L>,
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
 * Like `provideRiviniaI18n`, a repeated id in an inline `languages` list is a
 * compile error; supplying the union explicitly or hoisting the list keeps the
 * runtime check as the guard.
 *
 * @example
 * ```ts
 * export const i18n = defineRiviniaI18n({
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
export function defineRiviniaI18n<
  L extends string,
  const C extends RiviniaI18nConfig<L> = RiviniaI18nConfig<L>,
>(
  config: C & AssertUniqueLanguageIds<C['languages']> & RiviniaI18nConfig<L>,
): {
  readonly config: C;
  provide: () => EnvironmentProviders;
  inject: () => RiviniaI18n<C['languages'][number]['id']>;
} {
  return {
    config,
    provide: () => provideRiviniaI18n<L>(config),
    inject: () => injectRiviniaI18n<C['languages'][number]['id']>(),
  };
}

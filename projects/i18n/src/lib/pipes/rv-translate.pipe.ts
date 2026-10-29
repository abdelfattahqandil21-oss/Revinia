import { Pipe, inject } from '@angular/core';
import { RiviniaI18n } from '../services/rivinia-i18n';
import type { TranslateParams } from '../models/i18n-types';
import type { Translation } from '../models/i18n-types';
import type { RegisteredI18nKey } from '../models/typed-keys';

/**
 * Template pipe delegating to `RiviniaI18n.translate()`.
 *
 * Impure (`pure: false`) by necessity: the service reads signals on every
 * call, and a pure pipe would not re-evaluate on language switches. For long
 * lists prefer `translate()` in component code — or `t()`, which returns a
 * signal a template can read without re-running the pipe.
 */
@Pipe({
  name: 'rvTranslate',
  pure: false,
})
export class RvTranslatePipe<L extends string = string> {
  private readonly _i18n = inject(RiviniaI18n<L>);

  transform(key: RegisteredI18nKey, defaultValue?: string, params?: TranslateParams): string;
  transform(key: RegisteredI18nKey, params?: TranslateParams): string;
  transform(translations: Translation<L>): string;

  transform(
    keyOrTranslations: RegisteredI18nKey | Translation<L>,
    defaultValueOrParams?: string | TranslateParams,
    maybeParams?: TranslateParams,
  ): string {
    return this._i18n.translate(
      keyOrTranslations as RegisteredI18nKey,
      defaultValueOrParams as string,
      maybeParams as TranslateParams,
    );
  }
}

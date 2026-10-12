import { Pipe, inject } from '@angular/core';
import { RiviniaI18n } from './rivinia-i18n';
import type { TranslateParams } from './i18n-types';
import type { Translation } from './i18n-types';

/**
 * Template pipe delegating to `RiviniaI18n.translate()`.
 *
 * Impure (`pure: false`) by necessity: the service reads signals on every
 * call, and a pure pipe would not re-evaluate on language switches. For long
 * lists prefer `translate()` in component code over this pipe.
 */
@Pipe({
  name: 'rTranslate',
  standalone: true,
  pure: false,
})
export class RTranslatePipe<L extends string = string> {
  private readonly _i18n = inject(RiviniaI18n<L>);

  transform(key: string, defaultValue?: string, params?: TranslateParams): string;
  transform(key: string, params?: TranslateParams): string;
  transform(translations: Translation<L>): string;

  transform(
    keyOrTranslations: string | Translation<L>,
    defaultValueOrParams?: string | TranslateParams,
    maybeParams?: TranslateParams,
  ): string {
    return this._i18n.translate(
      keyOrTranslations as string,
      defaultValueOrParams as string,
      maybeParams as TranslateParams,
    );
  }
}

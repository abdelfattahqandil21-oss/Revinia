import type { LanguageLike } from '@rivinia/i18n/ui';
import type { LanguageSelectOption } from '../models/language-select-option';
import { languageName } from './language-name';

/**
 * Map languages to `rv-select` options, in the order given.
 *
 * The visible name follows the same rule as the `/ui` toggle
 * (`nativeName` → `Intl.DisplayNames` → id). The id is repeated as `lang`, and
 * as a `hint` only when it adds information — a row whose label already is
 * the id would otherwise print the same text twice.
 */
export function languageSelectOptions(
  languages: readonly LanguageLike[],
): readonly LanguageSelectOption[] {
  return languages.map((language) => {
    const label = languageName(language);
    const option: {
      id: string;
      label: string;
      lang: string;
      dir?: LanguageLike['dir'];
      hint?: string;
    } = {
      id: language.id,
      label,
      lang: language.id,
    };

    if (language.dir !== undefined) {
      option.dir = language.dir;
    }
    if (label !== language.id) {
      option.hint = language.id;
    }

    return option;
  });
}

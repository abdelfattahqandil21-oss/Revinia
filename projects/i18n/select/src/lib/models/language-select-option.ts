import type { RiviniaSelectOption } from '@rivinia/select';
import type { LanguageLike } from '@rivinia/i18n/ui';

/**
 * A select option for one language. `RiviniaSelectOption` already carries the
 * `id` (the language id) and the visible `label`; the extra fields exist so a
 * custom row can put `lang`/`dir` on the name instead of inheriting the page's.
 */
export interface LanguageSelectOption extends RiviniaSelectOption {
  /** The language id, repeated as the row's `lang`. */
  readonly lang: string;
  /** The language direction, when the source entry declares one. */
  readonly dir?: LanguageLike['dir'];
}

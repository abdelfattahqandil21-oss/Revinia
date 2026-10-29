import type { Direction } from '@rivinia/i18n';

/** The slice of a language entry the toggle needs. Structurally satisfied by
 *  `Language` from @rivinia/i18n (which requires `dir`). */
export interface LanguageLike {
  readonly id: string;
  readonly nativeName?: string;
  readonly dir?: Direction; // absent → rendered as dir="auto"
  readonly locale?: string;
}

/** The structural slice of `RiviniaI18n` the toggle drives (D30 shape).
 *  `RiviniaI18n` satisfies it with no import from core at runtime. */
export interface RiviniaLanguageManager {
  readonly languages: () => readonly LanguageLike[];
  readonly currentLanguage: () => string;
  readonly loadingState: () => 'idle' | 'loading' | 'error';
  setLanguageAsync(id: string): Promise<void>;
}

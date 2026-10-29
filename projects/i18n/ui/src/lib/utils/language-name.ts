import type { LanguageLike } from '../models/language-view';

/** Scaffold only: the resolution order (nativeName → DisplayNames → id) lands with the component. */
export function languageName(_entry: LanguageLike): string {
  return '';
}

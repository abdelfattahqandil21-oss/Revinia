/**
 * Internal helpers behind the multi-select description. Not exported from any
 * public API: the component is the only consumer.
 *
 * The list text is produced by `Intl.ListFormat` in the page language, so
 * "TypeScript, Angular and Signals" reads correctly in every locale instead of
 * being a comma-joined English list.
 */

/** One formatter per locale; formatters are immutable and hold no user data. */
const formatters = new Map<string, Intl.ListFormat>();

/**
 * The formatter for `locale`, created once and reused.
 *
 * The cache is what keeps a language change from constructing a new formatter
 * on every change-detection tick — and what makes "back to Arabic" return the
 * very same instance. Throws `RangeError` for an invalid locale; callers
 * resolve the locale first.
 */
export function formatterFor(locale: string): Intl.ListFormat {
  let formatter = formatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.ListFormat(locale, { type: 'conjunction', style: 'long' });
    formatters.set(locale, formatter);
  }
  return formatter;
}

/**
 * The locale the description should be formatted in.
 *
 * Rule order: a usable `lang` on the document, else `'en'`. A locale is usable
 * when a formatter can be built for it — `Intl.ListFormat('invalid_locale')`
 * throws `RangeError`, and a page with a bad tag must still render. When the
 * runtime has no `Intl.ListFormat` at all, the tag is returned as-is: the
 * formatting helper falls back to a plain join and the locale stops mattering.
 */
export function resolveListLocale(doc: Document | null): string {
  if (doc === null) return 'en';
  const lang = doc.documentElement?.getAttribute('lang')?.trim() ?? '';
  if (lang === '') return 'en';
  if (typeof Intl.ListFormat !== 'function') return lang;
  try {
    formatterFor(lang);
    return lang;
  } catch {
    return 'en';
  }
}

/**
 * `labels` joined for the page language.
 *
 * Missing `Intl.ListFormat` degrades to `', '` rather than failing the render;
 * an unexpected formatter error falls back to English.
 */
export function formatSelectionList(labels: readonly string[], locale: string): string {
  if (typeof Intl.ListFormat !== 'function') return labels.join(', ');
  try {
    return formatterFor(locale).format(labels);
  } catch {
    return formatterFor('en').format(labels);
  }
}

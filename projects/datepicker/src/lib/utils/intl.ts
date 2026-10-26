import type { RiviniaDate } from '../models/date-types';
import { toLocalDate } from './date-math';

/*
 * Shared `Intl` plumbing for the formatters (both the style layer and the
 * pattern layer), kept in one file so the pinning rule exists once.
 */

export const DEFAULT_LOCALE = 'en-US';

/**
 * Insert `-u-ca-gregory`, replacing any existing calendar keyword and KEEPING
 * the other Unicode extension keywords (notably `nu`).
 *
 * A regular expression is not enough here: `ar-SA-u-ca-islamic-umalqura` has a
 * calendar value that spans two subtags, so the extension has to be parsed as
 * key/value pairs. (A naive replace produced `ar-sa-u-ca-gregory-`, which
 * `Intl` rejects — measured during development.)
 */
export function gregorianLocale(locale: string): string {
  const parts = locale.split('-');
  const index = parts.indexOf('u');
  if (index === -1) return `${locale}-u-ca-gregory`;

  const base = parts.slice(0, index);
  const extension = parts.slice(index + 1);
  const kept: string[] = [];
  for (let i = 0; i < extension.length; ) {
    const key = extension[i];
    let end = i + 1;
    // A key is two characters; its values are three or more.
    while (end < extension.length && extension[end].length > 2) end++;
    if (key !== 'ca') kept.push(extension.slice(i, end).join('-'));
    i = end;
  }
  return [...base, 'u', 'ca-gregory', ...kept].join('-');
}

/**
 * Formatter instances are immutable, so they are cached: one day view asks for
 * 42 day labels plus 7 weekday names per render, and constructing that many
 * `Intl.DateTimeFormat` objects is measurable waste. The cache is bounded, so
 * an application that feeds arbitrary locale strings cannot grow it forever.
 */
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const FORMATTER_CACHE_LIMIT = 40;

/**
 * A formatter that cannot throw: an invalid locale tag falls back to en-US.
 * A date picker rendering inside a template must not break a page because an
 * application passed an unsupported locale.
 */
export function intlFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  const cached = FORMATTER_CACHE.get(key);
  if (cached) return cached;

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat(gregorianLocale(locale), options);
  } catch {
    formatter = new Intl.DateTimeFormat(gregorianLocale(DEFAULT_LOCALE), options);
  }

  if (FORMATTER_CACHE.size >= FORMATTER_CACHE_LIMIT) {
    const oldest = FORMATTER_CACHE.keys().next().value;
    if (oldest !== undefined) FORMATTER_CACHE.delete(oldest);
  }
  FORMATTER_CACHE.set(key, formatter);
  return formatter;
}

/**
 * Number formatter, cached separately. The time fields and the time pattern
 * layer need the locale's own digits (`ar-EG` → ١٥, not 15) without a date
 * formatter, and `Intl.NumberFormat` is the only API that guarantees them.
 */
const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();
const NUMBER_FORMATTER_CACHE_LIMIT = 40;

export function intlNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  const cached = NUMBER_FORMATTER_CACHE.get(key);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, options);
  } catch {
    formatter = new Intl.NumberFormat(DEFAULT_LOCALE, options);
  }

  if (NUMBER_FORMATTER_CACHE.size >= NUMBER_FORMATTER_CACHE_LIMIT) {
    const oldest = NUMBER_FORMATTER_CACHE.keys().next().value;
    if (oldest !== undefined) NUMBER_FORMATTER_CACHE.delete(oldest);
  }
  NUMBER_FORMATTER_CACHE.set(key, formatter);
  return formatter;
}

/** Local noon, so no time zone can push the rendered day across midnight. */
export function formatValue(
  locale: string,
  date: RiviniaDate,
  options: Intl.DateTimeFormatOptions,
): string {
  return intlFormatter(locale, options).format(toLocalDate(date));
}

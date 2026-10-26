import { DEFAULT_DATE_FORMAT, isDateStyle } from '../models/date-types';
import type {
  RiviniaCalendarView,
  RiviniaDateFormat,
  RiviniaDateStyle,
  RiviniaWeekday,
} from '../models/date-types';
import type { RiviniaDate } from '../models/date-types';
import type { RiviniaWeekdayName } from '../models/calendar-types';
import { addDays, toLocalDate } from './date-math';
import { formatValue, intlFormatter } from './intl';
import { formatWithPattern } from './date-pattern';

/*
 * Formatting is delegated to `Intl`, and the calendar is pinned to Gregorian.
 * Two reasons for pinning:
 *  - the SAME `{year, month, day}` must never render as a Hijri year. Node
 *    happens to resolve `ar-SA` to Gregorian, but ICU, a browser, or a
 *    consumer's explicit `-u-ca-islamic-umalqura` may not — measured: an
 *    unpinned `ar-SA-u-ca-islamic-umalqura` renders ١٤٤٨ for 2026. A Hijri
 *    grid is a separate calendar, not a locale accident.
 *  - It must not remove the numbering system: `ar-EG-u-nu-latn` is a legitimate
 *    request for Latin digits with Arabic names, and is preserved.
 */

/** `short` / `medium` / `long` / `full` — all date-only, no time. */
export function formatWithStyle(
  locale: string,
  date: RiviniaDate,
  style: RiviniaDateStyle,
): string {
  return formatValue(locale, date, { dateStyle: style });
}

/** The calendar heading, e.g. `October 2026` / `أكتوبر ٢٠٢٦`. */
export function formatMonthYear(locale: string, date: RiviniaDate): string {
  return formatValue(locale, date, { year: 'numeric', month: 'long' });
}

/** The month-view label. Mid-month keeps every calendar on the same month. */
export function formatMonthName(locale: string, year: number, month: number): string {
  return formatValue(locale, { year, month, day: 15 }, { month: 'long' });
}

export function formatDayNumber(locale: string, date: RiviniaDate): string {
  return formatValue(locale, date, { day: 'numeric' });
}

/** The accessible name of a day cell; always full, independent of `format`. */
export function formatFullDate(locale: string, date: RiviniaDate): string {
  return formatWithStyle(locale, date, 'full');
}

export function formatYear(locale: string, year: number): string {
  // Mid-year, so no calendar can push the rendered year across a boundary.
  return formatValue(locale, { year, month: 6, day: 15 }, { year: 'numeric' });
}

/** 2024-01-01 was a Monday (ISO 1) — the anchor for the weekday names. */
const REFERENCE_MONDAY: RiviniaDate = { year: 2024, month: 1, day: 1 };

/**
 * The seven column headers, in display order, starting at the LOCALE week
 * start. Each entry carries all three widths, so a layout can pick one without
 * paying for another `Intl` round trip.
 */
export function weekdaysOf(
  locale: string,
  firstDay: RiviniaWeekday,
): readonly RiviniaWeekdayName[] {
  const long = intlFormatter(locale, { weekday: 'long' });
  const short = intlFormatter(locale, { weekday: 'short' });
  const narrow = intlFormatter(locale, { weekday: 'narrow' });

  const names: RiviniaWeekdayName[] = [];
  for (let index = 0; index < 7; index++) {
    const weekday = (((firstDay - 1 + index) % 7) + 1) as RiviniaWeekday;
    const day = toLocalDate(addDays(REFERENCE_MONDAY, weekday - 1));
    names.push({
      weekday,
      long: long.format(day),
      short: short.format(day),
      narrow: narrow.format(day),
    });
  }
  return names;
}

/**
 * The single display entry point: a style keyword goes to `Intl`, anything
 * else is a date pattern.
 */
export function formatDate(
  locale: string,
  date: RiviniaDate,
  format: RiviniaDateFormat | null | undefined = DEFAULT_DATE_FORMAT,
): string {
  const resolved = format || DEFAULT_DATE_FORMAT;
  return isDateStyle(resolved)
    ? formatWithStyle(locale, date, resolved)
    : formatWithPattern(locale, date, resolved);
}

/**
 * The heading of the current view. Kept here (not in the service) so the
 * year-range text is testable without an injector.
 */
export function formatViewHeading(
  locale: string,
  view: RiviniaCalendarView,
  date: RiviniaDate,
  decade: number,
): string {
  if (view === 'day') return formatMonthYear(locale, date);
  if (view === 'month') return formatYear(locale, date.year);
  return `${formatYear(locale, decade)} – ${formatYear(locale, decade + 11)}`;
}

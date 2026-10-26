import type { RiviniaDateFormat } from '../models/date-types';
import { DEFAULT_DATE_FORMAT, isDateStyle } from '../models/date-types';
import type {
  RiviniaDateTime,
  RiviniaTime,
  RiviniaTimeFormat,
  RiviniaTimeStyle,
} from '../models/time-types';
import { DEFAULT_TIME_FORMAT, isTimeStyle } from '../models/time-types';
import { formatDate } from './date-format';
import { intlFormatter } from './intl';
import { normalizeTime } from './time-math';
import { formatTimeWithPattern } from './time-pattern';

/**
 * The display half of the time support. A style keyword goes to `Intl`; any
 * other string is a time pattern. The reference date is pinned to UTC so the
 * machine's zone can never shift a civil time by an hour (D51's rule).
 */

function referenceTime(time: RiviniaTime): Date {
  const value = normalizeTime(time);
  return new Date(
    Date.UTC(2000, 0, 1, value.hour, value.minute, value.second),
  );
}

function referenceDateTime(value: RiviniaDateTime): Date {
  const date = value.date;
  const time = normalizeTime(value.time);
  const result = new Date(
    Date.UTC(2000, date.month - 1, date.day, time.hour, time.minute, time.second),
  );
  result.setUTCFullYear(date.year);
  return result;
}

export interface RiviniaTimeFormatOptions {
  /** `undefined` follows the locale's clock. */
  readonly hour12?: boolean;
}

/** `short` / `medium`, or a time pattern (`HH:mm`, `hh:mm a`, `HH:mm:ss`). */
export function formatTime(
  locale: string,
  time: RiviniaTime,
  format: RiviniaTimeFormat | null | undefined = DEFAULT_TIME_FORMAT,
  options: RiviniaTimeFormatOptions = {},
): string {
  const resolved = format || DEFAULT_TIME_FORMAT;
  const value = normalizeTime(time);
  if (!isTimeStyle(resolved)) {
    return formatTimeWithPattern(locale, value, resolved);
  }

  const intlOptions: Intl.DateTimeFormatOptions = {
    timeStyle: resolved,
    timeZone: 'UTC',
  };
  if (options.hour12 !== undefined) intlOptions.hour12 = options.hour12;
  return intlFormatter(locale, intlOptions).format(referenceTime(value));
}

/**
 * The locale's separator between a date and a time. `Intl.DateTimeFormat`
 * with both styles owns that separator; when only one half is a style we have
 * to join ourselves, and Arabic uses its own comma.
 */
function separatorFor(locale: string): string {
  return /^ar(\b|-)/i.test(locale) ? ' في ' : ', ';
}

/**
 * The trigger's text: the date format and the time format joined. When BOTH
 * are style keywords the combined `Intl` formatter is used, which is the only
 * way to get ICU's locale-specific separator and bidi marks. Otherwise the
 * two halves are formatted separately and joined with the locale's comma.
 */
export function formatDateTime(
  locale: string,
  value: RiviniaDateTime,
  dateFormat: RiviniaDateFormat | null | undefined = DEFAULT_DATE_FORMAT,
  timeFormat: RiviniaTimeFormat | null | undefined = DEFAULT_TIME_FORMAT,
  options: RiviniaTimeFormatOptions = {},
): string {
  const date = dateFormat || DEFAULT_DATE_FORMAT;
  const time = timeFormat || DEFAULT_TIME_FORMAT;

  if (isDateStyle(date) && isTimeStyle(time)) {
    const intlOptions: Intl.DateTimeFormatOptions = {
      dateStyle: date,
      timeStyle: time,
      timeZone: 'UTC',
    };
    if (options.hour12 !== undefined) intlOptions.hour12 = options.hour12;
    return intlFormatter(locale, intlOptions).format(referenceDateTime(value));
  }

  return `${formatDate(locale, value.date, date)}${separatorFor(locale)}${formatTime(
    locale,
    value.time,
    time,
    options,
  )}`;
}

export type RiviniaTimeZoneNameStyle = 'short' | 'long' | 'shortOffset' | 'longOffset';

/**
 * The zone's name at an instant: "EEST" / "GMT+3" / "Eastern European
 * Summer Time". The IANA id itself is the consumer's to display; a name is
 * what a reader can act on.
 */
export function formatTimeZoneName(
  locale: string,
  timeZone: string,
  instant: number,
  style: RiviniaTimeZoneNameStyle = 'short',
): string {
  if (!timeZone) return '';
  try {
    const parts = intlFormatter(locale, {
      timeZone,
      timeZoneName: style,
      year: 'numeric',
    }).formatToParts(new Date(instant));
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

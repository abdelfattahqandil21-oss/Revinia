import type { RiviniaDate, RiviniaWeekday } from '../models/date-types';

/*
 * Integer calendar arithmetic, no `Date` anywhere except `todayDate` (which is
 * the one place where the clock legitimately enters).
 *
 * `Date` is avoided on purpose: `new Date(y, m, d)` is local, `new Date(iso)`
 * is UTC, and adding "one day" across a DST boundary is 23 or 25 hours. None of
 * that belongs in a calendar grid. The conversions below use Howard Hinnant's
 * civil-from-days algorithm, which is exact for the proleptic Gregorian
 * calendar in both directions.
 */

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 0 for a month outside 1…12, so validation never needs a second table. */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) return 0;
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_LENGTHS[month - 1];
}

export function isValidDate(date: RiviniaDate): boolean {
  if (!date || typeof date !== 'object') return false;
  const { year, month, day } = date;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** Days since 1970-01-01 in the proleptic Gregorian calendar. */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days: number): RiviniaDate {
  const shifted = days + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  return { year: year + (month <= 2 ? 1 : 0), month, day };
}

export function addDays(date: RiviniaDate, days: number): RiviniaDate {
  return civilFromDays(daysFromCivil(date.year, date.month, date.day) + days);
}

export function addMonths(date: RiviniaDate, months: number): RiviniaDate {
  const total = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  const day = Math.min(date.day, daysInMonth(year, month));
  return { year, month, day };
}

export function addYears(date: RiviniaDate, years: number): RiviniaDate {
  return addMonths(date, years * 12);
}

/** ISO weekday of a calendar day: 1 = Monday … 7 = Sunday. */
export function weekdayOf(date: RiviniaDate): RiviniaWeekday {
  const days = daysFromCivil(date.year, date.month, date.day);
  return (((((days + 3) % 7) + 7) % 7) + 1) as RiviniaWeekday;
}

export function startOfWeek(date: RiviniaDate, firstDay: RiviniaWeekday): RiviniaDate {
  const offset = (weekdayOf(date) - firstDay + 7) % 7;
  return addDays(date, -offset);
}

export function endOfWeek(date: RiviniaDate, firstDay: RiviniaWeekday): RiviniaDate {
  return addDays(startOfWeek(date, firstDay), 6);
}

export function compare(a: RiviniaDate, b: RiviniaDate): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

export function isSameDay(a: RiviniaDate | null, b: RiviniaDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** The LOCAL calendar day — never `toISOString()`, which is UTC. */
export function todayDate(now: Date = new Date()): RiviniaDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/** Local noon, which keeps `Intl` on the intended calendar day in every zone. */
export function toLocalDate(date: RiviniaDate): Date {
  // `new Date(year, …)` maps years 0…99 to 1900…1999, so the year is set
  // explicitly — `formatYear(locale, 5)` must render year 5, not 1905.
  const result = new Date(2000, date.month - 1, date.day, 12, 0, 0, 0);
  result.setFullYear(date.year);
  return result;
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

export function toIso(date: RiviniaDate): string {
  return `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`;
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Strict: a malformed or impossible ISO date is an error, not a silent null. */
export function fromIso(value: string): RiviniaDate {
  const match = ISO_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Invalid ISO date: "${value}" (expected YYYY-MM-DD).`);
  }
  const date: RiviniaDate = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  if (!isValidDate(date)) {
    throw new RangeError(`Invalid ISO date: "${value}" is not a real calendar day.`);
  }
  return date;
}

/**
 * The lenient boundary used by component inputs and configuration: `null` in,
 * `null` out, and a malformed value never throws inside a template binding.
 */
export function parseDate(value: RiviniaDate | string | null | undefined): RiviniaDate | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return fromIso(value);
    } catch {
      return null;
    }
  }
  if (!isValidDate(value)) return null;
  return { year: value.year, month: value.month, day: value.day };
}

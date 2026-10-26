import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  compare,
  daysInMonth,
  endOfWeek,
  fromIso,
  isLeapYear,
  isSameDay,
  isValidDate,
  parseDate,
  startOfWeek,
  toIso,
  todayDate,
  weekdayOf,
} from '../src/public-api';
import type { RiviniaDate } from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });

/*
 * The date math runs on plain `{year, month, day}` values and integer
 * arithmetic — no `Date`, therefore no time zone and no DST. These tests pin
 * the arithmetic that the calendar grid depends on; the ones that matter most
 * are the clamps (31 Jan + 1 month, 29 Feb + 1 year), because a naive
 * implementation silently rolls over into the next month instead.
 */

describe('isLeapYear', () => {
  it.each([
    { year: 2024, leap: true, why: 'divisible by 4' },
    { year: 2026, leap: false, why: 'not divisible by 4' },
    { year: 2000, leap: true, why: 'century divisible by 400' },
    { year: 1900, leap: false, why: 'century not divisible by 400' },
    { year: 2100, leap: false, why: 'century not divisible by 400' },
    { year: 2400, leap: true, why: 'far century divisible by 400' },
    { year: 1996, leap: true, why: 'divisible by 4' },
  ])('isLeapYear($year) === $leap — $why', ({ year, leap }) => {
    expect(isLeapYear(year)).toBe(leap);
  });
});

describe('daysInMonth', () => {
  it.each([
    { month: 1, year: 2026, days: 31 },
    { month: 2, year: 2026, days: 28 },
    { month: 2, year: 2024, days: 29 },
    { month: 2, year: 2000, days: 29 },
    { month: 4, year: 2026, days: 30 },
    { month: 6, year: 2026, days: 30 },
    { month: 9, year: 2026, days: 30 },
    { month: 11, year: 2026, days: 30 },
    { month: 12, year: 2026, days: 31 },
  ])('daysInMonth($year, $month) === $days', ({ year, month, days }) => {
    expect(daysInMonth(year, month)).toBe(days);
  });
});

describe('isValidDate', () => {
  it('accepts real dates', () => {
    expect(isValidDate(d(2026, 10, 25))).toBe(true);
    expect(isValidDate(d(2024, 2, 29))).toBe(true);
    expect(isValidDate(d(2026, 1, 1))).toBe(true);
    expect(isValidDate(d(2026, 12, 31))).toBe(true);
  });

  it('rejects impossible months', () => {
    expect(isValidDate(d(2026, 0, 1))).toBe(false);
    expect(isValidDate(d(2026, 13, 1))).toBe(false);
    expect(isValidDate(d(2026, -1, 1))).toBe(false);
  });

  it('rejects impossible days', () => {
    expect(isValidDate(d(2026, 10, 0))).toBe(false);
    expect(isValidDate(d(2026, 10, 32))).toBe(false);
    expect(isValidDate(d(2026, 2, 29))).toBe(false);
    expect(isValidDate(d(2026, 4, 31))).toBe(false);
  });

  it('rejects non-integer parts', () => {
    expect(isValidDate({ year: 2026.5, month: 10, day: 25 })).toBe(false);
    expect(isValidDate({ year: 2026, month: 10.5, day: 25 })).toBe(false);
    expect(isValidDate({ year: 2026, month: 10, day: 25.5 })).toBe(false);
  });
});

describe('toIso', () => {
  it('always pads to YYYY-MM-DD', () => {
    expect(toIso(d(2026, 1, 5))).toBe('2026-01-05');
    expect(toIso(d(2026, 12, 31))).toBe('2026-12-31');
    expect(toIso(d(2026, 10, 25))).toBe('2026-10-25');
  });
});

describe('fromIso', () => {
  it('round-trips with toIso', () => {
    for (const date of [d(2026, 1, 5), d(2024, 2, 29), d(2026, 12, 31)]) {
      expect(fromIso(toIso(date))).toEqual(date);
    }
  });

  it.each([
    { iso: '2026-02-30', why: '30 February' },
    { iso: '2026-02-29', why: 'not a leap year' },
    { iso: '2026-13-01', why: 'month 13' },
    { iso: '2026-00-10', why: 'month 0' },
    { iso: '2026-10-00', why: 'day 0' },
    { iso: '2026-1-5', why: 'not zero padded' },
    { iso: '26-10-25', why: 'two-digit year' },
    { iso: '2026-10-25T00:00:00Z', why: 'carries a time' },
    { iso: '2026/10/25', why: 'wrong separator' },
    { iso: '', why: 'empty' },
    { iso: 'not a date', why: 'garbage' },
  ])('throws on "$iso" — $why', ({ iso }) => {
    expect(() => fromIso(iso)).toThrow(RangeError);
  });

  it('accepts a real leap day', () => {
    expect(fromIso('2024-02-29')).toEqual(d(2024, 2, 29));
  });
});

describe('parseDate (the lenient boundary for component inputs)', () => {
  it('returns null for null and undefined', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });

  it('accepts an ISO string', () => {
    expect(parseDate('2026-10-25')).toEqual(d(2026, 10, 25));
  });

  it('returns null for a malformed or impossible string instead of throwing', () => {
    expect(parseDate('2026-02-30')).toBeNull();
    expect(parseDate('25/10/2026')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('accepts a RiviniaDate and copies it', () => {
    const value = d(2026, 10, 25);
    const parsed = parseDate(value);
    expect(parsed).toEqual(value);
    expect(parsed).not.toBe(value);
  });

  it('returns null for an invalid RiviniaDate', () => {
    expect(parseDate({ year: 2026, month: 2, day: 29 })).toBeNull();
    expect(parseDate({ year: 2026, month: 13, day: 1 })).toBeNull();
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays(d(2026, 10, 31), 1)).toEqual(d(2026, 11, 1));
    expect(addDays(d(2026, 11, 1), -1)).toEqual(d(2026, 10, 31));
  });

  it('crosses a year boundary in both directions', () => {
    expect(addDays(d(2026, 12, 31), 1)).toEqual(d(2027, 1, 1));
    expect(addDays(d(2027, 1, 1), -1)).toEqual(d(2026, 12, 31));
  });

  it('crosses a leap day', () => {
    expect(addDays(d(2024, 2, 28), 1)).toEqual(d(2024, 2, 29));
    expect(addDays(d(2024, 2, 29), 1)).toEqual(d(2024, 3, 1));
    expect(addDays(d(2026, 2, 28), 1)).toEqual(d(2026, 3, 1));
  });

  it('leaves the date alone for 0', () => {
    expect(addDays(d(2026, 10, 25), 0)).toEqual(d(2026, 10, 25));
  });

  it('adds a whole year as 365 days', () => {
    expect(addDays(d(2026, 1, 1), 365)).toEqual(d(2027, 1, 1));
  });

  it('produces 366 distinct consecutive dates from 1 Jan 2024', () => {
    const seen = new Set<string>();
    let cursor = d(2024, 1, 1);
    for (let i = 0; i < 366; i++) {
      seen.add(toIso(cursor));
      cursor = addDays(cursor, 1);
    }
    expect(seen.size).toBe(366);
    expect(cursor).toEqual(d(2025, 1, 1));
  });
});

describe('addMonths — clamps the day instead of rolling over', () => {
  it.each([
    { from: d(2026, 1, 31), by: 1, to: d(2026, 2, 28), why: '31 Jan + 1 month' },
    { from: d(2024, 1, 31), by: 1, to: d(2024, 2, 29), why: '31 Jan + 1 month in a leap year' },
    { from: d(2026, 3, 31), by: 1, to: d(2026, 4, 30), why: '31 Mar + 1 month' },
    { from: d(2026, 3, 31), by: -1, to: d(2026, 2, 28), why: '31 Mar - 1 month' },
    { from: d(2026, 5, 31), by: 1, to: d(2026, 6, 30), why: '31 May + 1 month' },
    { from: d(2026, 11, 30), by: 3, to: d(2027, 2, 28), why: 'across a year, clamped' },
    { from: d(2026, 10, 25), by: 3, to: d(2027, 1, 25), why: 'across a year, not clamped' },
    { from: d(2026, 10, 25), by: -10, to: d(2025, 12, 25), why: 'backwards across a year' },
    { from: d(2026, 10, 25), by: 0, to: d(2026, 10, 25), why: 'zero' },
    { from: d(2026, 12, 31), by: 12, to: d(2027, 12, 31), why: 'a full year' },
  ])('$why → $to.year-$to.month-$to.day', ({ from, by, to }) => {
    expect(addMonths(from, by)).toEqual(to);
  });
});

describe('addYears — clamps 29 February', () => {
  it.each([
    { from: d(2024, 2, 29), by: 1, to: d(2025, 2, 28), why: 'leap day + 1' },
    { from: d(2024, 2, 29), by: -1, to: d(2023, 2, 28), why: 'leap day - 1' },
    { from: d(2024, 2, 29), by: 4, to: d(2028, 2, 29), why: 'leap day + 4 stays a leap day' },
    { from: d(2026, 10, 25), by: 1, to: d(2027, 10, 25), why: 'ordinary date' },
    { from: d(2026, 10, 25), by: -30, to: d(1996, 10, 25), why: 'far backwards' },
  ])('$why → $to.year-$to.month-$to.day', ({ from, by, to }) => {
    expect(addYears(from, by)).toEqual(to);
  });
});

describe('compare / isSameDay', () => {
  it('orders by year, then month, then day', () => {
    expect(compare(d(2026, 10, 25), d(2026, 10, 25))).toBe(0);
    expect(compare(d(2025, 12, 31), d(2026, 1, 1))).toBe(-1);
    expect(compare(d(2026, 1, 1), d(2025, 12, 31))).toBe(1);
    expect(compare(d(2026, 9, 30), d(2026, 10, 1))).toBe(-1);
    expect(compare(d(2026, 10, 24), d(2026, 10, 25))).toBe(-1);
    expect(compare(d(2026, 10, 26), d(2026, 10, 25))).toBe(1);
  });

  it('knows the same day', () => {
    expect(isSameDay(d(2026, 10, 25), d(2026, 10, 25))).toBe(true);
    expect(isSameDay(d(2026, 10, 25), d(2026, 10, 26))).toBe(false);
  });
});

describe('weekdayOf (ISO: 1 = Monday … 7 = Sunday)', () => {
  it.each([
    { date: d(1970, 1, 1), weekday: 4, why: 'Thursday, the epoch' },
    { date: d(2000, 1, 1), weekday: 6, why: 'Saturday' },
    { date: d(2024, 1, 1), weekday: 1, why: 'Monday' },
    { date: d(2026, 10, 24), weekday: 6, why: 'Saturday' },
    { date: d(2026, 10, 25), weekday: 7, why: 'Sunday' },
    { date: d(2026, 10, 26), weekday: 1, why: 'Monday' },
    { date: d(2026, 10, 29), weekday: 4, why: 'Thursday' },
  ])('$why → $weekday', ({ date, weekday }) => {
    expect(weekdayOf(date)).toBe(weekday);
  });

  it('advances by one for each consecutive day', () => {
    let expected = weekdayOf(d(2026, 10, 25));
    let cursor = d(2026, 10, 25);
    for (let i = 0; i < 400; i++) {
      expect(weekdayOf(cursor)).toBe(expected);
      expected = (expected % 7) + 1;
      cursor = addDays(cursor, 1);
    }
  });
});

describe('startOfWeek / endOfWeek', () => {
  it('a Sunday is the start when the week starts on Sunday', () => {
    expect(startOfWeek(d(2026, 10, 25), 7)).toEqual(d(2026, 10, 25));
    expect(endOfWeek(d(2026, 10, 25), 7)).toEqual(d(2026, 10, 31));
  });

  it('a Sunday is the end when the week starts on Monday', () => {
    expect(startOfWeek(d(2026, 10, 25), 1)).toEqual(d(2026, 10, 19));
    expect(endOfWeek(d(2026, 10, 25), 1)).toEqual(d(2026, 10, 25));
  });

  it('a Sunday is in the middle when the week starts on Saturday', () => {
    expect(startOfWeek(d(2026, 10, 25), 6)).toEqual(d(2026, 10, 24));
    expect(endOfWeek(d(2026, 10, 25), 6)).toEqual(d(2026, 10, 30));
  });

  it('is a no-op when the date already is the first day', () => {
    for (const firstDay of [1, 2, 3, 4, 5, 6, 7] as const) {
      const date = d(2026, 10, 25);
      const start = startOfWeek(date, firstDay);
      expect(weekdayOf(start)).toBe(firstDay);
      expect(compare(start, date)).toBeLessThanOrEqual(0);
      expect(addDays(start, 6)).toEqual(endOfWeek(date, firstDay));
    }
  });

  it('crosses a month boundary', () => {
    // 1 Dec 2026 is a Tuesday → the Sunday-start week begins on 29 November.
    expect(startOfWeek(d(2026, 12, 1), 7)).toEqual(d(2026, 11, 29));
    expect(endOfWeek(d(2026, 12, 1), 7)).toEqual(d(2026, 12, 5));
  });
});

describe('todayDate', () => {
  it('reads the LOCAL calendar day, never UTC', () => {
    expect(todayDate(new Date(2026, 9, 25, 23, 59, 59))).toEqual(d(2026, 10, 25));
    expect(todayDate(new Date(2026, 9, 25, 0, 0, 0))).toEqual(d(2026, 10, 25));
  });

  it('defaults to now', () => {
    const now = new Date();
    expect(todayDate()).toEqual({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    });
  });
});

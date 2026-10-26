import { describe, expect, it } from 'vitest';
import {
  DATE_STYLES,
  DEFAULT_DATE_FORMAT,
  formatDate,
  formatDayNumber,
  formatFullDate,
  formatMonthName,
  formatMonthYear,
  formatWithStyle,
  formatYear,
  gregorianLocale,
  isDateStyle,
  weekdaysOf,
} from '../src/public-api';
import type { RiviniaDate } from '../src/public-api';

const oct25: RiviniaDate = { year: 2026, month: 10, day: 25 };
const oct5: RiviniaDate = { year: 2026, month: 10, day: 5 };

/*
 * Two formatting layers, deliberately:
 *
 * 1. STYLES (`short|medium|long|full`) delegate to `Intl.DateTimeFormat` with
 *    `dateStyle`. That is the "short/long pipe" the consumer asked for, done
 *    natively: locale-correct order, Arabic-Indic digits, Arabic month and
 *    weekday names, zero extra dependencies. Angular's `DatePipe` is NOT used
 *    because its `short|medium|long|full` presets append the TIME, and it does
 *    not localize digits (measured: ar-EG → "25", not "٢٥").
 *
 * 2. PATTERNS (`dd/MM/yyyy`) are assembled from localized parts in
 *    date-pattern.spec.ts.
 *
 * Everything below is measured in this environment, including the invisible
 * marks: ICU puts U+200F (RLM) around the slashes of the Arabic numeric date
 * and nowhere else. That asymmetry is asserted on purpose — patterns we build
 * ourselves carry no bidi marks at all.
 */

describe('DATE_STYLES / isDateStyle', () => {
  it('exposes exactly the four Intl date styles', () => {
    expect(DATE_STYLES).toEqual(['short', 'medium', 'long', 'full']);
  });

  it('recognizes a style and rejects a pattern', () => {
    for (const style of DATE_STYLES) {
      expect(isDateStyle(style)).toBe(true);
    }
    expect(isDateStyle('dd/MM/yyyy')).toBe(false);
    expect(isDateStyle('Medium')).toBe(false);
    expect(isDateStyle('')).toBe(false);
  });

  it('the default format is a style, not a hard-coded pattern', () => {
    expect(DEFAULT_DATE_FORMAT).toBe('medium');
    expect(isDateStyle(DEFAULT_DATE_FORMAT)).toBe(true);
  });
});

describe('formatWithStyle — Intl dateStyle', () => {
  it.each([
    { locale: 'en-US', style: 'short', expected: '10/25/26' },
    { locale: 'en-US', style: 'medium', expected: 'Oct 25, 2026' },
    { locale: 'en-US', style: 'long', expected: 'October 25, 2026' },
    { locale: 'en-US', style: 'full', expected: 'Sunday, October 25, 2026' },
    { locale: 'en-GB', style: 'short', expected: '25/10/2026' },
    { locale: 'en-GB', style: 'medium', expected: '25 Oct 2026' },
    { locale: 'en-GB', style: 'long', expected: '25 October 2026' },
    { locale: 'en-GB', style: 'full', expected: 'Sunday, 25 October 2026' },
    { locale: 'ar-EG', style: 'short', expected: '٢٥\u200F/١٠\u200F/٢٠٢٦' },
    { locale: 'ar-EG', style: 'medium', expected: '٢٥\u200F/١٠\u200F/٢٠٢٦' },
    { locale: 'ar-EG', style: 'long', expected: '٢٥ أكتوبر ٢٠٢٦' },
    { locale: 'ar-EG', style: 'full', expected: 'الأحد، ٢٥ أكتوبر ٢٠٢٦' },
  ] as const)('$locale / $style → "$expected"', ({ locale, style, expected }) => {
    expect(formatWithStyle(locale, oct25, style)).toBe(expected);
  });

  it('NEVER includes a time, in any locale or style', () => {
    for (const locale of ['en-US', 'en-GB', 'ar-EG', 'ar-SA']) {
      for (const style of DATE_STYLES) {
        const out = formatWithStyle(locale, oct25, style);
        expect(out).not.toMatch(/\d:\d/);
        expect(out).not.toMatch(/\b(AM|PM)\b/);
        expect(out).not.toMatch(/[صم]\s*$|\s(ص|م)$/);
      }
    }
  });

  it('localizes the digits: ar-EG is Arabic-Indic, en-US is Latin', () => {
    expect(formatWithStyle('ar-EG', oct25, 'long')).toContain('٢٥');
    expect(formatWithStyle('ar-EG', oct25, 'long')).not.toContain('25');
    expect(formatWithStyle('en-US', oct25, 'long')).toContain('25');
    expect(formatWithStyle('en-US', oct25, 'long')).not.toContain('٢٥');
  });

  it('carries the CLDR bidi marks in the Arabic NUMERIC styles (and only there)', () => {
    expect(formatWithStyle('ar-EG', oct25, 'short')).toContain('\u200F');
    expect(formatWithStyle('ar-EG', oct25, 'medium')).toContain('\u200F');
    expect(formatWithStyle('ar-EG', oct25, 'long')).not.toContain('\u200F');
    expect(formatWithStyle('ar-EG', oct25, 'full')).not.toContain('\u200F');
  });

  it('falls back to en-US for an invalid locale tag instead of throwing', () => {
    expect(formatWithStyle('not-a-locale!!', oct25, 'medium')).toBe('Oct 25, 2026');
  });
});

describe('formatMonthYear (the calendar heading)', () => {
  it.each([
    { locale: 'en-US', expected: 'October 2026' },
    { locale: 'en-GB', expected: 'October 2026' },
    { locale: 'ar-EG', expected: 'أكتوبر ٢٠٢٦' },
  ] as const)('$locale → "$expected"', ({ locale, expected }) => {
    expect(formatMonthYear(locale, oct25)).toBe(expected);
  });

  it('has no bidi marks — it is a heading, not a numeric date', () => {
    expect(formatMonthYear('ar-EG', oct25)).not.toMatch(/[\u200E\u200F]/);
  });
});

describe('formatMonthName (the month view)', () => {
  const arabicMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  it.each(arabicMonths.map((name, index) => ({ month: index + 1, name })))(
    'ar-EG month $month → "$name"',
    ({ month, name }) => {
      expect(formatMonthName('ar-EG', 2026, month)).toBe(name);
    },
  );

  it.each([
    { month: 1, name: 'January' },
    { month: 6, name: 'June' },
    { month: 10, name: 'October' },
    { month: 12, name: 'December' },
  ])('en-US month $month → "$name"', ({ month, name }) => {
    expect(formatMonthName('en-US', 2026, month)).toBe(name);
  });

  it('produces a name for every month in every locale', () => {
    for (const locale of ['en-US', 'en-GB', 'ar-EG', 'fr', 'de']) {
      for (let month = 1; month <= 12; month++) {
        const name = formatMonthName(locale, 2026, month);
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('formatYear / formatDayNumber', () => {
  it('formats a year without padding', () => {
    expect(formatYear('en-US', 2026)).toBe('2026');
    expect(formatYear('ar-EG', 2026)).toBe('٢٠٢٦');
    expect(formatYear('en-US', 5)).toBe('5');
    expect(formatYear('ar-EG', 5)).toBe('٥');
  });

  it('formats a day number without padding', () => {
    expect(formatDayNumber('en-US', oct5)).toBe('5');
    expect(formatDayNumber('ar-EG', oct5)).toBe('٥');
    expect(formatDayNumber('en-US', oct25)).toBe('25');
    expect(formatDayNumber('ar-EG', oct25)).toBe('٢٥');
  });
});

describe('formatFullDate (the aria-label of a day)', () => {
  it.each([
    { locale: 'en-US', expected: 'Sunday, October 25, 2026' },
    { locale: 'ar-EG', expected: 'الأحد، ٢٥ أكتوبر ٢٠٢٦' },
  ] as const)('$locale → "$expected"', ({ locale, expected }) => {
    expect(formatFullDate(locale, oct25)).toBe(expected);
  });

  it('is the same string as the full style', () => {
    expect(formatFullDate('ar-EG', oct25)).toBe(formatWithStyle('ar-EG', oct25, 'full'));
  });
});

describe('weekdaysOf — the column headers, starting at the locale week start', () => {
  it('en-US starts on Sunday', () => {
    expect(weekdaysOf('en-US', 7)).toEqual([
      { weekday: 7, long: 'Sunday', short: 'Sun', narrow: 'S' },
      { weekday: 1, long: 'Monday', short: 'Mon', narrow: 'M' },
      { weekday: 2, long: 'Tuesday', short: 'Tue', narrow: 'T' },
      { weekday: 3, long: 'Wednesday', short: 'Wed', narrow: 'W' },
      { weekday: 4, long: 'Thursday', short: 'Thu', narrow: 'T' },
      { weekday: 5, long: 'Friday', short: 'Fri', narrow: 'F' },
      { weekday: 6, long: 'Saturday', short: 'Sat', narrow: 'S' },
    ]);
  });

  it('en-GB starts on Monday', () => {
    const names = weekdaysOf('en-GB', 1);
    expect(names.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(names[0].long).toBe('Monday');
    expect(names[6].long).toBe('Sunday');
  });

  it('ar-EG starts on Saturday, and Arabic does not abbreviate', () => {
    expect(weekdaysOf('ar-EG', 6)).toEqual([
      { weekday: 6, long: 'السبت', short: 'السبت', narrow: 'س' },
      { weekday: 7, long: 'الأحد', short: 'الأحد', narrow: 'ح' },
      { weekday: 1, long: 'الاثنين', short: 'الاثنين', narrow: 'ن' },
      { weekday: 2, long: 'الثلاثاء', short: 'الثلاثاء', narrow: 'ث' },
      { weekday: 3, long: 'الأربعاء', short: 'الأربعاء', narrow: 'ر' },
      { weekday: 4, long: 'الخميس', short: 'الخميس', narrow: 'خ' },
      { weekday: 5, long: 'الجمعة', short: 'الجمعة', narrow: 'ج' },
    ]);
  });

  it('always returns 7 unique long names in ISO order from any first day', () => {
    for (const firstDay of [1, 2, 3, 4, 5, 6, 7] as const) {
      const names = weekdaysOf('en-GB', firstDay);
      expect(names).toHaveLength(7);
      expect(names.map((day) => day.weekday)).toEqual([
        firstDay,
        (firstDay % 7) + 1,
        ((firstDay + 1) % 7) + 1,
        ((firstDay + 2) % 7) + 1,
        ((firstDay + 3) % 7) + 1,
        ((firstDay + 4) % 7) + 1,
        ((firstDay + 5) % 7) + 1,
      ]);
      expect(new Set(names.map((day) => day.long)).size).toBe(7);
    }
  });

  it('falls back to en-US for an invalid locale tag', () => {
    expect(weekdaysOf('not-a-locale!!', 7)[0].long).toBe('Sunday');
  });
});

describe('gregorianLocale — pin the calendar, keep the numbering system', () => {
  it.each([
    { locale: 'en-US', expected: 'en-US-u-ca-gregory' },
    { locale: 'ar-EG', expected: 'ar-EG-u-ca-gregory' },
    { locale: 'ar-SA', expected: 'ar-SA-u-ca-gregory' },
    { locale: 'ar-SA-u-ca-islamic-umalqura', expected: 'ar-SA-u-ca-gregory' },
    {
      locale: 'ar-SA-u-ca-islamic-umalqura-nu-latn',
      expected: 'ar-SA-u-ca-gregory-nu-latn',
    },
    { locale: 'en-u-ca-hebrew-nu-arab', expected: 'en-u-ca-gregory-nu-arab' },
    { locale: 'ar-EG-u-nu-latn', expected: 'ar-EG-u-ca-gregory-nu-latn' },
    { locale: 'fa-u-nu-latn-ca-persian', expected: 'fa-u-ca-gregory-nu-latn' },
  ] as const)('$locale → $expected', ({ locale, expected }) => {
    expect(gregorianLocale(locale)).toBe(expected);
  });

  it('resolves to a Gregorian calendar in Intl, whatever the input', () => {
    for (const locale of [
      'ar-SA',
      'ar-SA-u-ca-islamic-umalqura',
      'en-u-ca-hebrew',
      'fa-u-ca-persian',
    ]) {
      const options = new Intl.DateTimeFormat(gregorianLocale(locale)).resolvedOptions();
      expect(options.calendar).toBe('gregory');
    }
  });

  it('keeps the numbering system chosen by the locale', () => {
    expect(
      new Intl.DateTimeFormat(gregorianLocale('ar-EG')).resolvedOptions().numberingSystem,
    ).toBe('arab');
    expect(
      new Intl.DateTimeFormat(gregorianLocale('ar-EG-u-nu-latn')).resolvedOptions()
        .numberingSystem,
    ).toBe('latn');
    expect(
      new Intl.DateTimeFormat(gregorianLocale('en-US')).resolvedOptions().numberingSystem,
    ).toBe('latn');
  });

  it('a non-Gregorian request would render a different year; the pin prevents it', () => {
    // Measured: in this environment `ar-SA` resolves to Gregorian by default,
    // so the honest case is an EXPLICIT non-Gregorian calendar — which is what
    // another runtime's default, or a consumer's tag, can produce. The same
    // {year, month, day} must never render as a Hijri year.
    const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      year: 'numeric',
    }).format(new Date(2026, 9, 25, 12));
    expect(hijri).not.toBe('٢٠٢٦');
    expect(formatYear('ar-SA-u-ca-islamic-umalqura', 2026)).toBe('٢٠٢٦');
  });
});

describe('formatDate — one entry point for styles and patterns', () => {
  it('defaults to the medium style', () => {
    expect(formatDate('en-US', oct25)).toBe('Oct 25, 2026');
    expect(formatDate('en-US', oct25, '')).toBe('Oct 25, 2026');
    expect(formatDate('ar-EG', oct25)).toBe('٢٥\u200F/١٠\u200F/٢٠٢٦');
  });

  it('dispatches to a style when the value is a style keyword', () => {
    expect(formatDate('en-US', oct25, 'short')).toBe('10/25/26');
    expect(formatDate('en-US', oct25, 'full')).toBe('Sunday, October 25, 2026');
  });

  it('dispatches to the pattern formatter for anything else', () => {
    expect(formatDate('en-US', oct25, 'dd/MM/yyyy')).toBe('25/10/2026');
    expect(formatDate('en-US', oct25, 'MM-dd-yyyy')).toBe('10-25-2026');
    expect(formatDate('ar-EG', oct25, 'dd/MM/yyyy')).toBe('٢٥/١٠/٢٠٢٦');
  });
});

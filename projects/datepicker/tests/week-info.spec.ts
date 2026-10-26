import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstDayOf, weekInfo } from '../src/public-api';

/*
 * The first day of the week is a LOCALE fact, not a preference: Egypt starts on
 * Saturday, Saudi Arabia and the US on Sunday, the UK on Monday. Reading it
 * from CLDR (via `Intl.Locale`) is what makes the grid correct without a
 * hand-maintained table.
 *
 * Every expectation below was measured in this environment (Node 24 / ICU) —
 * see the D-entry in docs/DECISIONS.md — not copied from documentation.
 */

const ISO_FALLBACK = { firstDay: 1, weekend: [6, 7] } as const;

describe('weekInfo — CLDR values', () => {
  it.each([
    { locale: 'en-US', firstDay: 7, weekend: [6, 7], why: 'United States starts on Sunday' },
    { locale: 'en-GB', firstDay: 1, weekend: [6, 7], why: 'United Kingdom starts on Monday' },
    { locale: 'ar-EG', firstDay: 6, weekend: [5, 6], why: 'Egypt starts on Saturday' },
    { locale: 'ar-SA', firstDay: 7, weekend: [5, 6], why: 'Saudi Arabia starts on Sunday' },
    { locale: 'he', firstDay: 7, weekend: [5, 6], why: 'Hebrew starts on Sunday' },
    { locale: 'fa', firstDay: 6, weekend: [5], why: 'Persian starts on Saturday, Friday weekend' },
    { locale: 'fr', firstDay: 1, weekend: [6, 7], why: 'France starts on Monday' },
  ])('$locale → firstDay $firstDay ($why)', ({ locale, firstDay, weekend }) => {
    const info = weekInfo(locale);
    expect(info.firstDay).toBe(firstDay);
    expect(info.weekend).toEqual(weekend);
  });

  it('always returns a weekday in the ISO range 1…7', () => {
    for (const locale of ['en-US', 'en-GB', 'ar-EG', 'ar-SA', 'he', 'fa', 'fr', 'de', 'ja', 'zh-CN']) {
      const { firstDay } = weekInfo(locale);
      expect(Number.isInteger(firstDay)).toBe(true);
      expect(firstDay).toBeGreaterThanOrEqual(1);
      expect(firstDay).toBeLessThanOrEqual(7);
    }
  });

  it('is a pure function: two calls agree', () => {
    expect(weekInfo('ar-EG')).toEqual(weekInfo('ar-EG'));
  });
});

describe('weekInfo — engines without getWeekInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to ISO (Monday) for an invalid locale tag instead of throwing', () => {
    expect(weekInfo('not-a-locale!!')).toEqual(ISO_FALLBACK);
    expect(weekInfo('')).toEqual(ISO_FALLBACK);
  });

  it('falls back to ISO when the engine throws', () => {
    vi.spyOn(Intl.Locale.prototype, 'getWeekInfo').mockImplementation(() => {
      throw new TypeError('unsupported');
    });
    expect(weekInfo('ar-EG')).toEqual(ISO_FALLBACK);
  });

  it('falls back to ISO when the engine returns garbage', () => {
    vi.spyOn(Intl.Locale.prototype, 'getWeekInfo').mockImplementation(
      () => ({ firstDay: 9, weekend: [0, 8], minimalDays: 0 }) as never,
    );
    expect(weekInfo('ar-EG')).toEqual(ISO_FALLBACK);
  });

  it('uses the legacy `weekInfo` accessor when `getWeekInfo` is missing', () => {
    const proto = Intl.Locale.prototype as unknown as {
      getWeekInfo?: () => unknown;
      weekInfo?: unknown;
    };
    const hadGet = Object.getOwnPropertyDescriptor(proto, 'getWeekInfo');
    const hadLegacy = Object.getOwnPropertyDescriptor(proto, 'weekInfo');
    try {
      delete proto.getWeekInfo;
      Object.defineProperty(proto, 'weekInfo', {
        configurable: true,
        get: () => ({ firstDay: 4, weekend: [6, 7], minimalDays: 1 }),
      });
      expect(weekInfo('en-US')).toEqual({ firstDay: 4, weekend: [6, 7], minimalDays: 1 });
    } finally {
      // Restore BOTH, or every later spec inherits a stub prototype.
      delete proto.weekInfo;
      if (hadLegacy) {
        Object.defineProperty(proto, 'weekInfo', hadLegacy);
      }
      if (hadGet) {
        Object.defineProperty(proto, 'getWeekInfo', hadGet);
      }
    }
  });
});

describe('firstDayOf', () => {
  it('is the first day of the locale week, not of the ISO week', () => {
    expect(firstDayOf('ar-EG')).toBe(6);
    expect(firstDayOf('en-US')).toBe(7);
    expect(firstDayOf('en-GB')).toBe(1);
  });

  it('agrees with weekInfo', () => {
    for (const locale of ['ar-EG', 'en-US', 'en-GB', 'fa']) {
      expect(firstDayOf(locale)).toBe(weekInfo(locale).firstDay);
    }
  });
});

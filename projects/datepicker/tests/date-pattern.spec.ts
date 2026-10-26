import { describe, expect, it } from 'vitest';
import { formatDate, formatWithPattern, parseDatePattern } from '../src/public-api';
import type { RiviniaDate } from '../src/public-api';

const oct25: RiviniaDate = { year: 2026, month: 10, day: 25 };
const oct5: RiviniaDate = { year: 2026, month: 10, day: 5 };

/*
 * A `pattern` is the second formatting layer: the CONSUMER decides the order
 * and the separators, the LOCALE decides the names and the digits.
 *
 *   formatWithPattern('en-GB', oct25, 'MM/dd/yyyy') === '10/25/2026'
 *   formatWithPattern('ar-EG', oct25, 'dd/MM/yyyy') === '٢٥/١٠/٢٠٢٦'
 *
 * The second line is the reason this layer is hand-assembled instead of
 * delegating to Intl: ICU owns the pattern of a `dateStyle`, and its Arabic
 * numeric output carries two U+200F marks. Here we own the separators, so the
 * output contains NO invisible characters — asserted below.
 *
 * Tokens are CASE-INSENSITIVE (`mm` and `MM` are both the month, `YYYY` is the
 * year): in a date-only field there are no minutes, so the date-fns trap
 * ("mm" = minutes) cannot apply, and refusing the user's own examples
 * (mm-dd-yyyy, DD/MM/YYYY) would be pedantry. Time tokens are rejected with a
 * message that says why.
 */

describe('parseDatePattern — tokens and literals', () => {
  it('decomposes a pattern into canonical tokens and literals', () => {
    expect(parseDatePattern('dd/MM/yyyy')).toEqual([
      { token: 'dd', value: 'dd' },
      { token: null, value: '/' },
      { token: 'MM', value: 'MM' },
      { token: null, value: '/' },
      { token: 'yyyy', value: 'yyyy' },
    ]);
  });

  it('merges adjacent literal characters into one part', () => {
    expect(parseDatePattern('d MMMM, yyyy')).toEqual([
      { token: 'd', value: 'd' },
      { token: null, value: ' ' },
      { token: 'MMMM', value: 'MMMM' },
      { token: null, value: ', ' },
      { token: 'yyyy', value: 'yyyy' },
    ]);
  });

  it('is case-insensitive and keeps the source text in `value`', () => {
    expect(parseDatePattern('DD/MM/YYYY').map((part) => part.token)).toEqual([
      'dd',
      null,
      'MM',
      null,
      'yyyy',
    ]);
    expect(parseDatePattern('mmmm').map((part) => part.token)).toEqual(['MMMM']);
    expect(parseDatePattern('MmmM')[0]).toEqual({ token: 'MMMM', value: 'MmmM' });
  });

  it('treats m/mm as the month (there are no minutes in a date-only field)', () => {
    expect(parseDatePattern('mm-dd-yyyy').map((part) => part.token)).toEqual([
      'MM',
      null,
      'dd',
      null,
      'yyyy',
    ]);
    expect(formatWithPattern('en-US', oct25, 'mm-dd-yyyy')).toBe('10-25-2026');
  });

  it('maps each width to the right token', () => {
    expect(parseDatePattern('M').map((p) => p.token)).toEqual(['M']);
    expect(parseDatePattern('MM').map((p) => p.token)).toEqual(['MM']);
    expect(parseDatePattern('MMM').map((p) => p.token)).toEqual(['MMM']);
    expect(parseDatePattern('MMMM').map((p) => p.token)).toEqual(['MMMM']);
    expect(parseDatePattern('d').map((p) => p.token)).toEqual(['d']);
    expect(parseDatePattern('dd').map((p) => p.token)).toEqual(['dd']);
    expect(parseDatePattern('y').map((p) => p.token)).toEqual(['yyyy']);
    expect(parseDatePattern('yy').map((p) => p.token)).toEqual(['yy']);
    expect(parseDatePattern('yyy').map((p) => p.token)).toEqual(['yyyy']);
    expect(parseDatePattern('yyyy').map((p) => p.token)).toEqual(['yyyy']);
    expect(parseDatePattern('E').map((p) => p.token)).toEqual(['EEE']);
    expect(parseDatePattern('EEE').map((p) => p.token)).toEqual(['EEE']);
    expect(parseDatePattern('EEEE').map((p) => p.token)).toEqual(['EEEE']);
    expect(parseDatePattern('EEEEE').map((p) => p.token)).toEqual(['EEEEE']);
  });

  it('supports quoted literals, including a doubled quote', () => {
    expect(parseDatePattern("'Day:' dd")).toEqual([
      { token: null, value: 'Day: ' },
      { token: 'dd', value: 'dd' },
    ]);
    expect(formatWithPattern('en-US', oct25, "'Day:' dd")).toBe('Day: 25');
    expect(formatWithPattern('en-US', oct25, "'It''s' yyyy")).toBe("It's 2026");
  });

  it('allows non-ASCII literals without quoting', () => {
    expect(parseDatePattern('yyyy年MM月dd日').map((p) => p.token ?? p.value)).toEqual([
      'yyyy',
      '年',
      'MM',
      '月',
      'dd',
      '日',
    ]);
  });
});

describe('parseDatePattern — a date-only field rejects time', () => {
  it.each([
    { pattern: 'HH:mm', token: 'HH', why: 'hours' },
    { pattern: 'hh:mm a', token: 'hh', why: '12-hour hours' },
    { pattern: 'dd/MM/yyyy ss', token: 'ss', why: 'seconds' },
    { pattern: 'SSS', token: 'SSS', why: 'fractional seconds' },
    { pattern: 'yyyy-MM-dd HH', token: 'HH', why: 'hours at the end' },
  ])('rejects $why ("$pattern")', ({ pattern, token }) => {
    expect(() => parseDatePattern(pattern)).toThrow(/date-only/i);
    expect(() => parseDatePattern(pattern)).toThrow(token);
  });

  it('rejects an unknown alphabetic token', () => {
    expect(() => parseDatePattern('qq/yyyy')).toThrow(/unknown token/i);
    expect(() => parseDatePattern('qq/yyyy')).toThrow(/qq/i);
  });

  it('rejects a token that is too wide', () => {
    expect(() => parseDatePattern('MMMMM')).toThrow(/MMMM/);
    expect(() => parseDatePattern('yyyyyy')).toThrow(/yyyy/);
    expect(() => parseDatePattern('EEEEEE')).toThrow(/EEEEE/);
  });

  it('rejects ddd with a hint that points at E', () => {
    expect(() => parseDatePattern('ddd')).toThrow(/weekday/i);
    expect(() => parseDatePattern('ddd')).toThrow(/EEEE/);
  });

  it('rejects an empty pattern', () => {
    expect(() => parseDatePattern('')).toThrow(/empty/i);
  });

  it('rejects an unterminated quote', () => {
    expect(() => parseDatePattern("dd 'oops")).toThrow(/quote/i);
  });
});

describe('formatWithPattern — the consumer owns the order, the locale owns the words', () => {
  it.each([
    { pattern: 'yyyy-MM-dd', en: '2026-10-25', ar: '٢٠٢٦-١٠-٢٥' },
    { pattern: 'dd/MM/yyyy', en: '25/10/2026', ar: '٢٥/١٠/٢٠٢٦' },
    { pattern: 'MM-dd-yyyy', en: '10-25-2026', ar: '١٠-٢٥-٢٠٢٦' },
    { pattern: 'MM-dd-yy', en: '10-25-26', ar: '١٠-٢٥-٢٦' },
    { pattern: 'dd-mm-yy', en: '25-10-26', ar: '٢٥-١٠-٢٦' },
    { pattern: 'dd.MM.yy', en: '25.10.26', ar: '٢٥.١٠.٢٦' },
    { pattern: 'dd MM yyyy', en: '25 10 2026', ar: '٢٥ ١٠ ٢٠٢٦' },
    { pattern: 'd/M/yyyy', en: '25/10/2026', ar: '٢٥/١٠/٢٠٢٦' },
    { pattern: 'MMMM d, yyyy', en: 'October 25, 2026', ar: 'أكتوبر ٢٥, ٢٠٢٦' },
    { pattern: 'MMM d, yyyy', en: 'Oct 25, 2026', ar: 'أكتوبر ٢٥, ٢٠٢٦' },
    { pattern: 'EEEE, MMMM d, yyyy', en: 'Sunday, October 25, 2026', ar: 'الأحد, أكتوبر ٢٥, ٢٠٢٦' },
    { pattern: 'yyyy年MM月dd日', en: '2026年10月25日', ar: '٢٠٢٦年١٠月٢٥日' },
  ])('$pattern', ({ pattern, en, ar }) => {
    expect(formatWithPattern('en-US', oct25, pattern)).toBe(en);
    expect(formatWithPattern('ar-EG', oct25, pattern)).toBe(ar);
  });

  it("the user's four examples all work, in both cases", () => {
    expect(formatWithPattern('en-US', oct25, 'mm-dd-yyyy')).toBe('10-25-2026');
    expect(formatWithPattern('en-US', oct25, 'MM-DD-YYYY')).toBe('10-25-2026');
    expect(formatWithPattern('en-US', oct25, 'mm-dd-yy')).toBe('10-25-26');
    expect(formatWithPattern('en-US', oct25, 'dd-mm-yy')).toBe('25-10-26');
    expect(formatWithPattern('en-US', oct25, 'dd/mm/yyyy')).toBe('25/10/2026');
    expect(formatWithPattern('en-US', oct25, 'DD/MM/YYYY')).toBe('25/10/2026');
  });

  it('does not mirror the pattern in RTL: the pattern is order, not direction', () => {
    expect(formatWithPattern('ar-EG', oct25, 'yyyy/MM/dd')).toBe('٢٠٢٦/١٠/٢٥');
    expect(formatWithPattern('ar-EG', oct25, 'dd/MM/yyyy')).toBe('٢٥/١٠/٢٠٢٦');
  });

  it('a pattern dictates the order even when the locale disagrees', () => {
    expect(formatWithPattern('en-GB', oct25, 'MM/dd/yyyy')).toBe('10/25/2026');
    expect(formatWithPattern('en-US', oct25, 'dd/MM/yyyy')).toBe('25/10/2026');
  });

  it('pads only when the pattern asks for it', () => {
    expect(formatWithPattern('en-US', oct5, 'd/M/yyyy')).toBe('5/10/2026');
    expect(formatWithPattern('en-US', oct5, 'dd/MM/yyyy')).toBe('05/10/2026');
    expect(formatWithPattern('ar-EG', oct5, 'd/M/yyyy')).toBe('٥/١٠/٢٠٢٦');
    expect(formatWithPattern('ar-EG', oct5, 'dd/MM/yyyy')).toBe('٠٥/١٠/٢٠٢٦');
  });

  it('emits NO invisible bidi characters (unlike the Intl styles)', () => {
    for (const pattern of ['dd/MM/yyyy', 'yyyy-MM-dd', 'EEEE، d MMMM yyyy']) {
      const out = formatWithPattern('ar-EG', oct25, pattern);
      expect(out).not.toMatch(/[\u200E\u200F\u061C]/);
    }
    expect(formatWithPattern('ar-EG', oct25, 'dd/MM/yyyy')).toBe('٢٥/١٠/٢٠٢٦');
  });

  it('accepts an Arabic comma as a plain literal', () => {
    expect(formatWithPattern('ar-EG', oct25, 'EEEE، d MMMM yyyy')).toBe(
      'الأحد، ٢٥ أكتوبر ٢٠٢٦',
    );
  });

  it('formats the weekday in three widths', () => {
    expect(formatWithPattern('en-US', oct25, 'EEEE')).toBe('Sunday');
    expect(formatWithPattern('en-US', oct25, 'EEE')).toBe('Sun');
    expect(formatWithPattern('en-US', oct25, 'EEEEE')).toBe('S');
    expect(formatWithPattern('ar-EG', oct25, 'EEEEE')).toBe('ح');
  });

  it('is reachable through formatDate', () => {
    expect(formatDate('en-US', oct25, 'yyyy-MM-dd')).toBe('2026-10-25');
    expect(formatDate('ar-EG', oct25, 'yyyy-MM-dd')).toBe('٢٠٢٦-١٠-٢٥');
  });

  it('does not leak state between patterns', () => {
    expect(formatWithPattern('en-US', oct25, 'dd/MM/yyyy')).toBe('25/10/2026');
    expect(formatWithPattern('en-US', oct25, 'MMMM d, yyyy')).toBe('October 25, 2026');
    expect(formatWithPattern('en-US', oct25, 'dd/MM/yyyy')).toBe('25/10/2026');
  });

  it('falls back to en-US for an invalid locale tag', () => {
    expect(formatWithPattern('not-a-locale!!', oct25, 'dd/MM/yyyy')).toBe('25/10/2026');
  });
});

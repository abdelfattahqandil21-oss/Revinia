import { describe, expect, it } from 'vitest';
import { formatIcu } from '../src/lib/utils/icu';

/**
 * RIV-01 — compact ICU (no space before `{`).
 *
 * Expected values are written by hand from the ICU MessageFormat rules, not
 * from the implementation: a plural category owns the branch that follows the
 * selector, whether or not a space separates them.
 */
describe('RIV-01 compact ICU selectors', () => {
  it('parses a compact plural', () => {
    const tpl = '{n, plural, one{# item} other{# items}}';
    expect(formatIcu(tpl, { n: 1 }, 'en')).toBe('1 item');
    expect(formatIcu(tpl, { n: 2 }, 'en')).toBe('2 items');
  });

  it('parses a compact exact match', () => {
    const tpl = '{n, plural, =0{none} one{# item} other{# items}}';
    expect(formatIcu(tpl, { n: 0 }, 'en')).toBe('none');
    expect(formatIcu(tpl, { n: 1 }, 'en')).toBe('1 item');
  });

  it('parses a compact select', () => {
    const tpl = '{g, select, male{He} female{She} other{They}} went';
    expect(formatIcu(tpl, { g: 'male' }, 'en')).toBe('He went');
    expect(formatIcu(tpl, { g: 'female' }, 'en')).toBe('She went');
  });

  it('parses a compact selectordinal', () => {
    const tpl = '{n, selectordinal, one{#st} two{#nd} few{#rd} other{#th}}';
    expect(formatIcu(tpl, { n: 1 }, 'en')).toBe('1st');
    expect(formatIcu(tpl, { n: 2 }, 'en')).toBe('2nd');
    expect(formatIcu(tpl, { n: 3 }, 'en')).toBe('3rd');
    expect(formatIcu(tpl, { n: 4 }, 'en')).toBe('4th');
  });

  it('keeps the Arabic six forms in compact form', () => {
    const tpl =
      '{count, plural, zero{لا عناصر} one{عنصر واحد} two{عنصران} few{# عناصر} many{# عنصرًا} other{# عنصر}}';
    expect(formatIcu(tpl, { count: 0 }, 'ar')).toBe('لا عناصر');
    expect(formatIcu(tpl, { count: 1 }, 'ar')).toBe('عنصر واحد');
    expect(formatIcu(tpl, { count: 2 }, 'ar')).toBe('عنصران');
    expect(formatIcu(tpl, { count: 3 }, 'ar')).toBe('3 عناصر');
    expect(formatIcu(tpl, { count: 11 }, 'ar')).toBe('11 عنصرًا');
    expect(formatIcu(tpl, { count: 100 }, 'ar')).toBe('100 عنصر');
  });

  it('returns malformed compact input raw and never throws', () => {
    const malformed = '{n, plural, one{unclosed';
    expect(() => formatIcu(malformed, { n: 1 }, 'en')).not.toThrow();
    expect(formatIcu(malformed, { n: 1 }, 'en')).toBe(malformed);
  });

  it('keeps the spaced form working (regression)', () => {
    const tpl = '{n, plural, one {# item} other {# items}}';
    expect(formatIcu(tpl, { n: 1 }, 'en')).toBe('1 item');
    expect(formatIcu(tpl, { n: 5 }, 'en')).toBe('5 items');
  });
});

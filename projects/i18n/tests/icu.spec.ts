import { describe, expect, it } from 'vitest';
import { formatIcu } from '../src/lib/utils/icu';

describe('formatIcu interpolation', () => {
  it('replaces {name} params, keeps missing placeholders', () => {
    expect(formatIcu('Hello {name}', { name: 'A' }, 'en')).toBe('Hello A');
    expect(formatIcu('Hello {name}', {}, 'en')).toBe('Hello {name}');
    expect(formatIcu('No placeholders', { a: 1 }, 'en')).toBe('No placeholders');
  });
});

describe('formatIcu plural (English)', () => {
  const tpl = '{count, plural, one {# item} other {# items}}';
  it('selects one/other', () => {
    expect(formatIcu(tpl, { count: 1 }, 'en')).toBe('1 item');
    expect(formatIcu(tpl, { count: 5 }, 'en')).toBe('5 items');
  });

  it('prefers exact =N matches over categories', () => {
    const tpl2 = '{count, plural, =0 {none} one {# item} other {# items}}';
    expect(formatIcu(tpl2, { count: 0 }, 'en')).toBe('none');
    expect(formatIcu(tpl2, { count: 1 }, 'en')).toBe('1 item');
  });
});

describe('formatIcu plural (Arabic — six forms)', () => {
  const tpl =
    '{count, plural, zero {لا عناصر} one {عنصر واحد} two {عنصران} few {# عناصر} many {# عنصرًا} other {# عنصر}}';
  it.each([
    [0, 'لا عناصر'],
    [1, 'عنصر واحد'],
    [2, 'عنصران'],
    [3, '3 عناصر'],
    [11, '11 عنصرًا'],
    [100, '100 عنصر'],
  ])('count %i → %s', (count, expected) => {
    expect(formatIcu(tpl, { count }, 'ar')).toBe(expected);
  });
});

describe('formatIcu select', () => {
  const tpl = '{gender, select, male {He} female {She} other {They}} went';
  it('matches exact values, falls back to other', () => {
    expect(formatIcu(tpl, { gender: 'male' }, 'en')).toBe('He went');
    expect(formatIcu(tpl, { gender: 'x' }, 'en')).toBe('They went');
    expect(formatIcu(tpl, {}, 'en')).toBe('They went');
  });
});

describe('formatIcu nesting and #', () => {
  it('evaluates nested arguments with correct # scope', () => {
    const tpl =
      '{count, plural, other {{gender, select, male {He has #} other {They have #}}}}';
    expect(formatIcu(tpl, { count: 3, gender: 'male' }, 'en')).toBe('He has 3');
  });

  it('keeps # literal outside plurals', () => {
    expect(formatIcu('Ticket #5', {}, 'en')).toBe('Ticket #5');
  });
});

describe('formatIcu malformed input', () => {
  it('never throws: returns raw segments', () => {
    expect(formatIcu('{count, plural, one {x}', { count: 1 }, 'en')).toBe('{count, plural, one {x}');
    expect(formatIcu('{count, unknown, one {x}}', { count: 1 }, 'en')).toBe(
      '{count, unknown, one {x}}',
    );
    expect(formatIcu('{count, plural}', { count: 1 }, 'en')).toBe('{count, plural}');
    expect(formatIcu('{oops', {}, 'en')).toBe('{oops');
  });

  it('non-numeric plural values fall back to other', () => {
    expect(formatIcu('{c, plural, one {1} other {n}}', { c: 'x' }, 'en')).toBe('n');
  });
});

describe('formatIcu selectordinal', () => {
  const en = '{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
  ])('English ordinal %i → %s', (rank, expected) => {
    expect(formatIcu(en, { rank }, 'en')).toBe(expected);
  });

  it('Arabic has no ordinal categories: everything is other', () => {
    expect(formatIcu(en, { rank: 3 }, 'ar')).toBe('3th');
  });
});

describe('formatIcu offset', () => {
  const tpl =
    '{n, plural, offset:1 =0 {none} =1 {only you} one {you and # other} other {you and # others}}';

  it.each([
    [0, 'none'],
    [1, 'only you'],
    [2, 'you and 1 other'],
    [3, 'you and 2 others'],
  ])('n=%i → %s', (n, expected) => {
    expect(formatIcu(tpl, { n }, 'en')).toBe(expected);
  });

  it('matches =N against the RAW value, not the offset value', () => {
    // n=2 has category `one` (2-1=1), but `=2` would win if declared.
    const withExact = '{n, plural, offset:1 =2 {exactly two} one {one} other {other}}';
    expect(formatIcu(withExact, { n: 2 }, 'en')).toBe('exactly two');
  });
});

describe('formatIcu # number formatting', () => {
  it('formats # with the locale NumberFormat', () => {
    expect(formatIcu('{n, plural, other {#}}', { n: 1234.5 }, 'en')).toBe('1,234.5');
    expect(formatIcu('{n, plural, other {#}}', { n: 3 }, 'ar-EG')).toBe('٣');
    expect(formatIcu('{n, plural, other {#}}', { n: 3 }, 'ar')).toBe('3');
  });

  it('keeps # literal outside plural-style arguments', () => {
    expect(formatIcu('#5 {n, select, other {#}}', { n: 'x' }, 'en')).toBe('#5 #');
  });
});

describe('formatIcu number', () => {
  it('formats plain numbers per locale', () => {
    expect(formatIcu('{n, number}', { n: 1234.5 }, 'en')).toBe('1,234.5');
    expect(formatIcu('{n, number}', { n: 1234.5 }, 'ar-EG')).toBe('١٬٢٣٤٫٥');
  });

  it('supports percent, integer and currency skeletons', () => {
    expect(formatIcu('{n, number, percent}', { n: 0.25 }, 'en')).toBe('25%');
    expect(formatIcu('{n, number, percent}', { n: 0.25 }, 'ar-EG')).toBe('٢٥٪؜');
    expect(formatIcu('{n, number, integer}', { n: 12.6 }, 'en')).toBe('13');
    expect(formatIcu('{n, number, ::currency/USD}', { n: 12.5 }, 'en')).toBe('$12.50');
  });

  it('returns the raw segment for unsupported input', () => {
    expect(formatIcu('{n, number, scientific}', { n: 1 }, 'en')).toBe(
      '{n, number, scientific}',
    );
    expect(formatIcu('{n, number, ::currency/US}', { n: 1 }, 'en')).toBe(
      '{n, number, ::currency/US}',
    );
    expect(formatIcu('{n, number}', { n: 'x' }, 'en')).toBe('{n, number}');
    expect(formatIcu('{n, number}', { n: Number.NaN }, 'en')).toBe('{n, number}');
  });

  it('continues after a raw segment', () => {
    expect(formatIcu('{n, number, scientific} tail', { n: 1 }, 'en')).toBe(
      '{n, number, scientific} tail',
    );
  });
});

describe('formatIcu date', () => {
  const day = new Date(2026, 9, 25);

  it('formats a Date per locale, date only', () => {
    expect(formatIcu('{d, date}', { d: day }, 'en')).toBe('10/25/2026');
    expect(formatIcu('{d, date, short}', { d: day }, 'en')).toBe('10/25/26');
    expect(formatIcu('{d, date, long}', { d: day }, 'en')).toBe('October 25, 2026');
    expect(formatIcu('{d, date, short}', { d: day }, 'ar-EG')).toBe('٢٥‏/١٠‏/٢٠٢٦');
  });

  it('accepts epoch milliseconds', () => {
    expect(formatIcu('{d, date, short}', { d: day.getTime() }, 'en')).toBe('10/25/26');
  });

  it('returns the raw segment for a non-date value or unknown style', () => {
    expect(formatIcu('{d, date}', { d: '2026-10-25' }, 'en')).toBe('{d, date}');
    expect(formatIcu('{d, date, short}', { d: new Date(Number.NaN) }, 'en')).toBe(
      '{d, date, short}',
    );
    expect(formatIcu('{d, date, iso}', { d: day }, 'en')).toBe('{d, date, iso}');
  });
});

describe('formatIcu nesting with the new argument types', () => {
  it('binds # to the nearest plural-style argument', () => {
    const tpl =
      '{count, plural, other {{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}}}';
    expect(formatIcu(tpl, { count: 7, rank: 3 }, 'en')).toBe('3rd');
    expect(formatIcu(tpl, { count: 7, rank: 4 }, 'en')).toBe('4th');
  });

  it('nests number and date inside a select', () => {
    const tpl = '{kind, select, money {{amount, number, ::currency/USD}} other {{day, date, short}}}';
    expect(formatIcu(tpl, { kind: 'money', amount: 12.5 }, 'en')).toBe('$12.50');
    expect(formatIcu(tpl, { kind: 'day', day: new Date(2026, 9, 25) }, 'en')).toBe('10/25/26');
  });
});

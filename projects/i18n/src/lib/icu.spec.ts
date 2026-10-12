import { describe, expect, it } from 'vitest';
import { formatIcu } from './icu';

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

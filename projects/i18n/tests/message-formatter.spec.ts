import { describe, expect, it } from 'vitest';
import { MessageFormatter } from '../src/lib/services/message-formatter';

function make(locale = 'en', onMissingParam?: (key: string, name: string) => void) {
  return new MessageFormatter({ locale: () => locale, onMissingParam });
}

describe('MessageFormatter.render', () => {
  it('renders with the locale of the dictionary the text came from', () => {
    const f = make();
    const tpl = '{count, plural, one {# item} other {# items}}';
    expect(f.render(tpl, { count: 1 }, 'en', 'items')).toBe('1 item');
    expect(f.render(tpl, { count: 3 }, 'ar-EG', 'items')).toBe('٣ items');
  });

  it('returns the template untouched when it has no parameters and no syntax', () => {
    const f = make();
    expect(f.render('Hello', undefined, 'en', 'hello')).toBe('Hello');
  });

  it('keeps a parameterless plural template raw instead of picking a category', () => {
    const f = make();
    const tpl = '{count, plural, one {# item} other {# items}}';
    expect(f.render(tpl, undefined, 'en', 'items')).toBe(tpl);
  });

  it('collapses apostrophe quoting even without params', () => {
    const f = make();
    expect(f.render("It''s '{'x'}'", undefined, 'en', 'quoted')).toBe("It's {x}");
  });

  it('reports a missing parameter with the key and the name, keeping the placeholder', () => {
    const hits: string[] = [];
    const f = make('en', (key, name) => hits.push(`${key}:${name}`));
    expect(f.render('Hi {name}', {}, 'en', 'greeting')).toBe('Hi {name}');
    expect(hits).toEqual(['greeting:name']);
  });
});

describe('MessageFormatter number/date memo', () => {
  it('formats with the current locale, not a fixed one', () => {
    let locale = 'en';
    const f = new MessageFormatter({ locale: () => locale });
    expect(f.formatNumber(1234.5)).toBe('1,234.5');
    locale = 'ar-EG';
    expect(f.formatNumber(1234)).toBe('١٬٢٣٤');
  });

  it('reuses one Intl formatter for the same locale and options', () => {
    const f = make('en');
    const opts: Intl.NumberFormatOptions = { style: 'percent' };
    expect(f.formatNumber(0.25, opts)).toBe('25%');
    expect(f.cachedFormatterCount).toBe(1);
    f.formatNumber(0.5, { style: 'percent' });
    expect(f.cachedFormatterCount).toBe(1);
  });

  it('bounds the memo instead of growing without limit', () => {
    const f = new MessageFormatter({ locale: () => 'en' }, 2);
    f.formatNumber(1, { minimumIntegerDigits: 1 });
    f.formatNumber(1, { minimumIntegerDigits: 2 });
    f.formatNumber(1, { minimumIntegerDigits: 3 });
    expect(f.cachedFormatterCount).toBe(2);
    // The evicted entry is rebuilt, not broken.
    expect(f.formatNumber(7, { minimumIntegerDigits: 1 })).toBe('7');
    expect(f.cachedFormatterCount).toBe(2);
  });

  it('formats dates with the current locale', () => {
    const f = make('en-GB');
    const opts: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    };
    expect(f.formatDate(new Date(Date.UTC(2024, 1, 1)), opts)).toBe('01/02/2024');
    expect(f.formatDate(Date.UTC(2024, 1, 1), opts)).toBe('01/02/2024');
    expect(f.cachedFormatterCount).toBe(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { formatIcu } from '../src/lib/utils/icu';

describe('RIV-06 compiled-message cache', () => {
  const template = '{count, plural, =0 {No items} one {# item} other {# items}}';

  it('renders the same template 100k times well under the 0.4.0 baseline (669 ms)', () => {
    // Warm the cache exactly as an app's first render would.
    formatIcu(template, { count: 1 }, 'en');
    const started = performance.now();
    for (let i = 0; i < 100_000; i++) {
      formatIcu(template, { count: i % 5 }, 'en');
    }
    const elapsed = performance.now() - started;
    // Measured: 669.2 ms before the cache, ~50 ms after (≈13x). The 200 ms
    // ceiling leaves room for slow CI while still failing a re-parse per call.
    expect(elapsed).toBeLessThan(200);
  });

  it('keeps one compiled message usable across locales', () => {
    const tpl = '{count, plural, one {# item} two {# TWIN} other {# items}}';
    expect(formatIcu(tpl, { count: 1 }, 'en')).toBe('1 item');
    expect(formatIcu(tpl, { count: 2 }, 'ar-EG')).toBe('٢ TWIN');
    expect(formatIcu(tpl, { count: 1 }, 'en')).toBe('1 item');
  });
});

describe('RIV-08 ICU apostrophe quoting', () => {
  it("quotes literal braces: It''s '{'x'}' → It's {x}", () => {
    expect(formatIcu("It''s '{'x'}'", {}, 'en')).toBe("It's {x}");
  });

  it("renders '' as one apostrophe", () => {
    expect(formatIcu("a''b", {}, 'en')).toBe("a'b");
  });

  it('keeps a lone apostrophe unchanged (Don\'t)', () => {
    expect(formatIcu("Don't {name}", { name: 'A' }, 'en')).toBe("Don't A");
    expect(formatIcu("l'été", {}, 'fr')).toBe("l'été");
  });

  it('quotes braces and # inside a plural branch', () => {
    const tpl = "{n, plural, one {'{'#'}' item} other {# items}}";
    expect(formatIcu(tpl, { n: 1 }, 'en')).toBe('{1} item');
    expect(formatIcu(tpl, { n: 3 }, 'en')).toBe('3 items');
  });

  it('treats an unterminated quote as literal to the end', () => {
    expect(formatIcu("a '{' b", {}, 'en')).toBe('a { b');
  });

  it('does not let quoting break the tolerant fallback', () => {
    expect(formatIcu("'{'unclosed", {}, 'en')).toBe('{unclosed');
  });
});

describe('RIV-09 missing params are reported, output unchanged', () => {
  it('calls onMissingParam and keeps the placeholder', () => {
    const missing = vi.fn();
    expect(formatIcu('Hello {name}', {}, 'en', { onMissingParam: missing })).toBe('Hello {name}');
    expect(missing).toHaveBeenCalledWith('name');
    expect(missing).toHaveBeenCalledTimes(1);
  });

  it('does not report a provided param', () => {
    const missing = vi.fn();
    expect(formatIcu('Hello {name}', { name: 'A' }, 'en', { onMissingParam: missing })).toBe(
      'Hello A',
    );
    expect(missing).not.toHaveBeenCalled();
  });

  it('reports missing plural, number and date arguments', () => {
    const missing = vi.fn();
    formatIcu(
      '{n, plural, one {# item} other {# items}} {c, number} {d, date, long}',
      {},
      'en',
      { onMissingParam: missing },
    );
    expect(missing.mock.calls.map(([name]) => name)).toEqual(['n', 'c', 'd']);
  });

  it('never throws without a hook', () => {
    expect(() => formatIcu('Hello {name}', {}, 'en')).not.toThrow();
  });
});

describe('RIV-10 date accepts strict ISO-8601 strings', () => {
  it('renders a date-only string as that calendar date', () => {
    expect(formatIcu('{d, date, long}', { d: '2026-10-28' }, 'en-GB')).toBe('28 October 2026');
    expect(formatIcu('{d, date, long}', { d: '2026-10-28' }, 'ar-EG')).toContain('٢٨');
  });

  it('renders a date-time string', () => {
    expect(formatIcu('{d, date, long}', { d: '2026-10-28T12:00:00Z' }, 'en-GB')).toBe(
      '28 October 2026',
    );
  });

  it('rejects non-ISO garbage and impossible dates', () => {
    expect(formatIcu('{d, date, long}', { d: 'garbage' }, 'en')).toBe('{d, date, long}');
    expect(formatIcu('{d, date, long}', { d: '2026-02-30' }, 'en')).toBe('{d, date, long}');
    expect(formatIcu('{d, date, long}', { d: '28/10/2026' }, 'en')).toBe('{d, date, long}');
  });

  it('keeps ISO strings out of the number argument', () => {
    expect(formatIcu('{n, number}', { n: '2026-10-28' }, 'en')).toBe('{n, number}');
  });
});

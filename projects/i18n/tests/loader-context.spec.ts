import { describe, expect, it } from 'vitest';
import { createLoaderContext } from '../src/lib/utils/loader-context';
import { resolveLoaderUrl } from '../src/lib/utils/loader-url';

/** Minimal document double: `baseURI` plus an optional `<base href>`. */
function fakeDoc(baseURI: string, baseHref?: string): Document {
  return {
    baseURI,
    querySelector: (selector: string) =>
      baseHref !== undefined && selector.includes('base')
        ? { getAttribute: () => baseHref }
        : null,
  } as unknown as Document;
}

function request(url: string): Request {
  return { url } as Request;
}

describe('createLoaderContext — browser', () => {
  it('uses document.baseURI and is not a server', () => {
    const context = createLoaderContext(null, fakeDoc('http://localhost:3000/app/'));
    expect(context).toEqual({ baseUrl: 'http://localhost:3000/app/', isServer: false });
  });

  it('never throws when the document has no baseURI', () => {
    const context = createLoaderContext(null, {} as Document);
    expect(context.isServer).toBe(false);
    expect(context.baseUrl).toBe('/');
  });
});

describe('createLoaderContext — server', () => {
  it('resolves an absolute <base href> against the request origin', () => {
    const context = createLoaderContext(
      request('http://h:4000/ar/page'),
      fakeDoc('http://localhost/', '/'),
    );
    expect(context).toEqual({ baseUrl: 'http://h:4000/', isServer: true });
  });

  it('keeps a sub-path base', () => {
    const context = createLoaderContext(
      request('http://h:4000/ar/page'),
      fakeDoc('http://localhost/', '/app/'),
    );
    expect(context.baseUrl).toBe('http://h:4000/app/');
  });

  it('mirrors the browser for a relative base (./)', () => {
    const context = createLoaderContext(
      request('http://h:4000/ar/page'),
      fakeDoc('http://localhost/', './'),
    );
    expect(context.baseUrl).toBe('http://h:4000/ar/');
  });

  it('keeps an absolute <base href> untouched', () => {
    const context = createLoaderContext(
      request('http://h:4000/ar/page'),
      fakeDoc('http://localhost/', 'https://cdn.test/i18n/'),
    );
    expect(context.baseUrl).toBe('https://cdn.test/i18n/');
  });

  it('falls back to the origin when there is no <base> element', () => {
    const context = createLoaderContext(
      request('http://h:4000/ar/page'),
      fakeDoc('http://localhost/'),
    );
    expect(context.baseUrl).toBe('http://h:4000/');
  });

  it('falls back to document.baseURI when REQUEST.url is unparsable', () => {
    const context = createLoaderContext(request('not a url'), fakeDoc('http://localhost:3000/app/'));
    expect(context.isServer).toBe(true);
    expect(context.baseUrl).toBe('http://localhost:3000/app/');
  });
});

describe('resolveLoaderUrl', () => {
  it('absolutizes a relative URL on the server', () => {
    expect(
      resolveLoaderUrl('i18n/ar.json', { baseUrl: 'http://h/app/', isServer: true }),
    ).toBe('http://h/app/i18n/ar.json');
  });

  it('leaves a relative URL untouched in the browser', () => {
    expect(
      resolveLoaderUrl('i18n/ar.json', { baseUrl: 'http://h/app/', isServer: false }),
    ).toBe('i18n/ar.json');
  });

  it('leaves an absolute URL untouched on both platforms', () => {
    expect(
      resolveLoaderUrl('https://cdn.test/i18n/ar.json', {
        baseUrl: 'http://h/app/',
        isServer: true,
      }),
    ).toBe('https://cdn.test/i18n/ar.json');
  });

  it('returns the input when no context is supplied', () => {
    expect(resolveLoaderUrl('i18n/ar.json')).toBe('i18n/ar.json');
  });

  it('returns the input when the base cannot be parsed', () => {
    expect(resolveLoaderUrl('i18n/ar.json', { baseUrl: '::', isServer: true })).toBe(
      'i18n/ar.json',
    );
  });
});

describe('createLoaderContext — a DOM that cannot report baseURI', () => {
  /**
   * Domino, the server DOM, throws `NotYetImplemented` on `baseURI` instead of
   * returning `undefined`. Reading it unguarded crashed SSR bootstrap before a
   * single byte was rendered (measured in projects/i18n-e2e), and jsdom cannot
   * reproduce it — so the platform is simulated here.
   */
  function throwingDoc(baseHref?: string): Document {
    return {
      get baseURI(): string {
        throw new Error('NotYetImplemented');
      },
      querySelector: (selector: string) =>
        baseHref !== undefined && selector.includes('base')
          ? { getAttribute: () => baseHref }
          : null,
    } as unknown as Document;
  }

  it('does not throw and falls back to "/"', () => {
    const context = createLoaderContext(null, throwingDoc());
    expect(context).toEqual({ baseUrl: '/', isServer: false });
  });

  it('still resolves the request origin through <base href>', () => {
    const context = createLoaderContext(request('http://h:4300/'), throwingDoc('/'));
    expect(context).toEqual({ baseUrl: 'http://h:4300/', isServer: true });
  });
});

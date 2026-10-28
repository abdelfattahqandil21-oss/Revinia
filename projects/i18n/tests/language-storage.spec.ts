import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageStorage } from '../src/lib/services/language-storage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = 'rv.lang=; Path=/; Max-Age=0';
});

type Ids = 'ar' | 'en' | 'fr';

const LANGS = [
  { id: 'ar', dir: 'rtl' },
  { id: 'en', dir: 'ltr' },
  { id: 'fr', dir: 'ltr' },
] as const;

function make(opts?: {
  strategy?: 'local' | 'session' | 'cookie' | 'none';
  persist?: boolean;
  detectBrowser?: boolean;
  browserLanguages?: readonly string[];
  requestCookie?: string;
  defaultLanguage?: Ids;
}) {
  return new LanguageStorage<Ids>({
    key: 'rv.lang',
    strategy: opts?.strategy ?? 'local',
    languages: () => LANGS,
    defaultLanguage: opts?.defaultLanguage ?? 'ar',
    detectBrowser: opts?.detectBrowser ?? false,
    document: document,
    request:
      opts?.requestCookie === undefined
        ? null
        : { headers: { get: (name: string) => (name === 'cookie' ? opts.requestCookie! : null) } },
    persist: opts?.persist ?? true,
    browserLanguages: () => opts?.browserLanguages,
  });
}

describe('LanguageStorage initial language', () => {
  it('prefers a stored id that is configured', () => {
    localStorage.setItem('rv.lang', 'fr');
    expect(make().resolveInitialLanguage()).toBe('fr');
  });

  it('ignores a stored id that is not configured', () => {
    localStorage.setItem('rv.lang', 'de');
    expect(make().resolveInitialLanguage()).toBe('ar');
  });

  it('detects from the browser list when asked to', () => {
    expect(
      make({ detectBrowser: true, browserLanguages: ['fr-CA', 'en-US'] }).resolveInitialLanguage(),
    ).toBe('fr');
  });

  it('keeps the stored language above browser detection', () => {
    localStorage.setItem('rv.lang', 'en');
    expect(
      make({ detectBrowser: true, browserLanguages: ['fr'] }).resolveInitialLanguage(),
    ).toBe('en');
  });

  it('falls back to the default when nothing matches', () => {
    expect(
      make({ detectBrowser: true, browserLanguages: ['de'] }).resolveInitialLanguage(),
    ).toBe('ar');
  });
});

describe('LanguageStorage write', () => {
  it('writes to localStorage for the local strategy', () => {
    make().write('en');
    expect(localStorage.getItem('rv.lang')).toBe('en');
  });

  it('writes to sessionStorage for the session strategy', () => {
    make({ strategy: 'session' }).write('fr');
    expect(sessionStorage.getItem('rv.lang')).toBe('fr');
    expect(localStorage.getItem('rv.lang')).toBeNull();
  });

  it('does nothing for the none strategy', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    make({ strategy: 'none' }).write('en');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('LanguageStorage cookies', () => {
  it('reads the browser cookie', () => {
    document.cookie = 'rv.lang=fr; Path=/';
    expect(make({ strategy: 'cookie' }).read()).toBe('fr');
    document.cookie = 'rv.lang=; Path=/; Max-Age=0';
  });

  it('reads the request header first on the server', () => {
    document.cookie = 'rv.lang=fr; Path=/';
    const storage = make({ strategy: 'cookie', requestCookie: 'rv.lang=en' });
    expect(storage.read()).toBe('en');
    document.cookie = 'rv.lang=; Path=/; Max-Age=0';
  });

  it('never writes a cookie on the server', () => {
    const before = document.cookie;
    make({ strategy: 'cookie', requestCookie: 'rv.lang=en' }).write('fr');
    expect(document.cookie).toBe(before);
  });

  it('writes a browser cookie', () => {
    make({ strategy: 'cookie' }).write('en');
    expect(document.cookie).toContain('rv.lang=en');
    document.cookie = 'rv.lang=; Path=/; Max-Age=0';
  });
});

describe('LanguageStorage persist only after an explicit change (RIV-17)', () => {
  it('skips the write when storage already holds the id', () => {
    localStorage.setItem('rv.lang', 'en');
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    make().persistAfterSwitch('en');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('writes when storage holds another id', () => {
    localStorage.setItem('rv.lang', 'ar');
    make().persistAfterSwitch('en');
    expect(localStorage.getItem('rv.lang')).toBe('en');
  });

  it('persist: false leaves every strategy untouched', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    make({ persist: false }).persistAfterSwitch('en');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

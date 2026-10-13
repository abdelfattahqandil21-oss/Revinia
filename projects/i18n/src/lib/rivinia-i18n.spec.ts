import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaI18nConfig } from './i18n-config';
import { customLoader } from './loaders';
import { provideRiviniaI18n } from './provide-i18n';
import { RiviniaI18n } from './rivinia-i18n';

const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;

function setup(config?: Partial<RiviniaI18nConfig<'ar' | 'en'>>): RiviniaI18n<'ar' | 'en'> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        // Hermetic default: tests that don't exercise loading neutralize the
        // default jsonLoader, or its fire-and-forget fetches leak across tests.
        loader: customLoader(async () => ({})),
        ...config,
      }),
    ],
  });
  return TestBed.inject(RiviniaI18n<'ar' | 'en'>);
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('RiviniaI18n init and validation', () => {
  it('starts with the default language and rtl direction', () => {
    const i18n = setup();
    expect(i18n.currentLanguage()).toBe('ar');
    expect(i18n.dir()).toBe('rtl');
    expect(i18n.isRtl()).toBe(true);
    expect(i18n.currentLanguageObject().nativeName).toBe('العربية');
  });

  it('throws on empty languages and unknown default', () => {
    expect(() =>
      setup({ languages: [], defaultLanguage: 'ar' } as unknown as RiviniaI18nConfig<'ar' | 'en'>),
    ).toThrow();
    expect(() => setup({ defaultLanguage: 'fr' as 'ar' })).toThrow();
  });

  it('restores the stored language; detection fills the gap only when enabled', () => {
    window.localStorage.setItem('rivinia.i18n.language', 'en');
    const stored = setup({ storageStrategy: 'local' });
    expect(stored.currentLanguage()).toBe('en');

    window.localStorage.clear();
    const detected = setup({
      storageStrategy: 'local',
      detectBrowser: true,
    });
    // jsdom reports en-US → base-tag fallback resolves 'en'.
    expect(detected.currentLanguage()).toBe('en');

    const off = setup({ storageStrategy: 'none' });
    expect(off.currentLanguage()).toBe('ar');
  });
});

describe('RiviniaI18n switching', () => {
  it('setLanguage/toggle/next/previous cycle correctly', () => {
    const i18n = setup({ loader: customLoader(async () => ({})) });
    i18n.setLanguage('en');
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    i18n.toggle();
    expect(i18n.currentLanguage()).toBe('ar');
    i18n.next();
    expect(i18n.currentLanguage()).toBe('en');
    i18n.previous();
    expect(i18n.currentLanguage()).toBe('ar');
    i18n.setLanguage('xx' as 'ar');
    expect(i18n.currentLanguage()).toBe('ar');
  });

  it('persists through storage strategy local', () => {
    const i18n = setup({ storageStrategy: 'local', loader: customLoader(async () => ({})) });
    i18n.setLanguage('en');
    TestBed.flushEffects();
    expect(window.localStorage.getItem('rivinia.i18n.language')).toBe('en');
  });
});

describe('RiviniaI18n translate', () => {
  it('inline objects resolve per language with first-value fallback', () => {
    const i18n = setup({ loader: customLoader(async () => ({})) });
    expect(i18n.translate({ ar: 'حفظ', en: 'Save' })).toBe('حفظ');
    i18n.setLanguage('en');
    expect(i18n.translate({ ar: 'حفظ', en: 'Save' })).toBe('Save');
  });

  it('key lookups support interpolation and ICU plurals from dictionaries', async () => {
    const i18n = setup({
      loader: customLoader(async () => ({
        greeting: 'Hello {name}',
        items: '{count, plural, one {# item} other {# items}}',
      })),
    });
    await i18n.loadTranslations('ar');
    i18n.setLanguage('ar');
    await i18n.setLanguageAsync('ar');
    expect(i18n.translate('greeting', { name: 'A' })).toBe('Hello A');
    expect(i18n.translate('items', { count: 1 })).toBe('1 item');
    expect(i18n.translate('missing.key', 'Fallback')).toBe('Fallback');
    expect(i18n.translate('missing.key')).toBe('missing.key');
  });

  it('preload-first switch awaits the dictionary (no flash)', async () => {
    let resolveLoad!: (v: Record<string, unknown>) => void;
    const gate = new Promise<Record<string, unknown>>((res) => (resolveLoad = res));
    const i18n = setup({
      loader: customLoader(() => gate),
      switchStrategy: 'preload-first',
    });
    const switching = i18n.setLanguageAsync('en');
    expect(i18n.currentLanguage()).toBe('ar');
    resolveLoad({ home: { title: 'Home' } });
    await switching;
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('home.title')).toBe('Home');
  });

  it('load errors surface on signals and call onLoadError, then fall back', async () => {
    const seen: unknown[] = [];
    const i18n = setup({
      loader: customLoader(async () => {
        throw new Error('down');
      }),
      onLoadError: (_lang, err) => seen.push(err),
    });
    await i18n.loadTranslations('ar');
    expect(i18n.loadingState()).toBe('error');
    expect(i18n.loadingError()).toBeInstanceOf(Error);
    expect(seen.length).toBe(1);
    expect(i18n.translate('k', 'fb')).toBe('fb');
  });
});

describe('RiviniaI18n default loader', () => {
  it('fetches assets/i18n/{language}.json unless the consumer overrides', async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen.push(url);
        return { ok: true, statusText: 'OK', json: async () => ({}) } as Response;
      }),
    );
    try {
      // Raw TestBed on purpose: the shared helper neutralizes the loader,
      // but this test exercises the REAL default (no loader key at all).
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRiviniaI18n({
            defaultLanguage: 'ar',
            languages: [AR, EN],
            storageStrategy: 'none',
          }),
        ],
      });
      const i18n = TestBed.inject(RiviniaI18n<'ar' | 'en'>);
      await TestBed.inject(ApplicationRef).whenStable();
      await i18n.loadTranslations('en');
      expect(seen).toEqual(['assets/i18n/ar.json', 'assets/i18n/en.json']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('inline-only apps silence network with an empty customLoader', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      const i18n = setup({ loader: customLoader(async () => ({})) });
      await i18n.loadTranslations('en');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(i18n.translate({ ar: 'حفظ', en: 'Save' })).toBe('حفظ');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('RiviniaI18n provider setup loading', () => {
  it('loads the initial language before first paint (initializer)', async () => {
    const seen: string[] = [];
    setup({
      loader: customLoader(async (lang) => {
        seen.push(lang);
        return { hello: lang === 'ar' ? 'مرحبا' : 'Hello' };
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(seen).toEqual(['ar']);
    const i18n = TestBed.inject(RiviniaI18n<'ar' | 'en'>);
    expect(i18n.translate('hello')).toBe('مرحبا');
    expect(i18n.ready()).toBe(true);
  });

  it('preload:false skips setup loading but marks ready', async () => {
    const seen: string[] = [];
    setup({
      preload: false,
      loader: customLoader(async (lang) => {
        seen.push(lang);
        return {};
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(seen).toEqual([]);
    expect(TestBed.inject(RiviniaI18n<'ar' | 'en'>).ready()).toBe(true);
  });

  it('inline dictionaries seed without network and survive load failure', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      const i18n = setup({
        translations: { ar: { hello: 'مرحبا' } },
        loader: customLoader(async () => {
          throw new Error('down');
        }),
      });
      await TestBed.inject(ApplicationRef).whenStable();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(i18n.translate('hello')).toBe('مرحبا');
      expect(i18n.ready()).toBe(true);
      expect(i18n.loadingState()).toBe('error');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('RiviniaI18n formatting and state', () => {
  it('formats numbers/dates in the current language', () => {
    const i18n = setup({ loader: customLoader(async () => ({})) });
    expect(i18n.formatNumber(1234567.89, { maximumFractionDigits: 0 })).toBe(
      new Intl.NumberFormat('ar', { maximumFractionDigits: 0 }).format(1234567.89),
    );
    i18n.setLanguage('en');
    expect(i18n.formatDate(new Date(2026, 0, 15), { dateStyle: 'full' })).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date(2026, 0, 15)),
    );
  });

  it('exposes readonly signals only', () => {
    const i18n = setup();
    expect('set' in i18n.currentLanguage).toBe(false);
    expect('set' in i18n.languages).toBe(false);
    expect(i18n.getLanguage('en')?.dir).toBe('ltr');
    expect(i18n.getLanguage('xx' as 'ar')).toBeUndefined();
  });

  it('last-request-wins on rapid switches', async () => {
    const resolvers: Array<(v: Record<string, unknown>) => void> = [];
    const i18n = setup({
      loader: customLoader(
        () =>
          new Promise<Record<string, unknown>>((res) => {
            resolvers.push(res);
          }),
      ),
    });
    const p1 = i18n.loadTranslations('ar');
    const p2 = i18n.loadTranslations('en');
    await new Promise((r) => setTimeout(r, 0)); // drain descriptor+load microtasks
    resolvers[1]({ v: 'en-dict' });
    resolvers[0]({ v: 'ar-dict' });
    await Promise.all([p1, p2]);
    expect(i18n.loadedTranslations()).toEqual({ v: 'en-dict' });
  });
});

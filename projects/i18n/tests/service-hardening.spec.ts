import { ApplicationRef, isDevMode, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import type { MissingParamEvent } from '../src/lib/models/missing-key';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const AR_EG = { id: 'ar', nativeName: 'العربية', dir: 'rtl', locale: 'ar-EG' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;
const FR = { id: 'fr', nativeName: 'Français', dir: 'ltr' } as const;

type Ids = 'ar' | 'en' | 'fr';

const STORAGE_KEY = 'rivinia.i18n.language';

function setup(config?: Partial<RiviniaI18nConfig<Ids>>): RiviniaI18n<Ids> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN, FR],
        storageStrategy: 'none',
        loader: customLoader(async () => ({})),
        warnOnMissingKey: false,
        warnOnMissingParam: false,
        ...config,
      }),
    ],
  });
  return TestBed.inject(RiviniaI18n<Ids>);
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
});

describe('RIV-09 missing message params', () => {
  it('keeps the placeholder and reports each (key, param) once', async () => {
    const events: MissingParamEvent<Ids>[] = [];
    const i18n = setup({
      preload: false,
      translations: { ar: { greeting: 'Hello {name}' } },
      onMissingParam: (event) => events.push(event),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('greeting', {})).toBe('Hello {name}');
    expect(events).toEqual([]);
    await flushMicrotasks();
    expect(events).toEqual([{ key: 'greeting', param: 'name', language: 'ar' }]);

    i18n.translate('greeting', {});
    await flushMicrotasks();
    expect(events).toHaveLength(1);

    i18n.clearMissingParams();
    i18n.translate('greeting', {});
    await flushMicrotasks();
    expect(events).toHaveLength(2);
  });

  it('reports every absent argument of plural/number/date messages', async () => {
    const events: MissingParamEvent<Ids>[] = [];
    const i18n = setup({
      preload: false,
      translations: { ar: { msg: '{a, plural, other {{b, number} {c, date}}}' } },
      onMissingParam: (event) => events.push(event),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('msg', {});
    await flushMicrotasks();
    expect(events.map((event) => event.param)).toEqual(['a', 'b', 'c']);
  });

  it('invokes the hook outside the computed, so it may write a signal', async () => {
    const sink = signal(0);
    const i18n = setup({
      preload: false,
      translations: { ar: { greeting: 'Hello {name}' } },
      onMissingParam: () => sink.set(sink() + 1),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    const text = i18n.t('greeting', {})();
    expect(text).toBe('Hello {name}');
    await flushMicrotasks();
    expect(sink()).toBe(1);
  });

  it('warns once per pair when the warn switch is on, and never when off', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup({
      preload: false,
      translations: { ar: { greeting: 'Hello {name}' } },
      warnOnMissingParam: true,
    });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('greeting', {});
    i18n.translate('greeting', {});
    await flushMicrotasks();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[rivinia/i18n]');
    expect(String(warn.mock.calls[0][0])).toContain('"name"');

    warn.mockClear();
    const off = setup({
      preload: false,
      translations: { ar: { greeting: 'Hello {name}' } },
      warnOnMissingParam: false,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    off.translate('greeting', {});
    await flushMicrotasks();
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn by default when a hook is configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup({
      preload: false,
      translations: { ar: { greeting: 'Hello {name}' } },
      onMissingParam: () => {},
    });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('greeting', {});
    await flushMicrotasks();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('ICU apostrophe quoting without params (RIV-08)', () => {
  it('collapses doubled apostrophes and quoted braces from a translation', async () => {
    const i18n = setup({
      preload: false,
      translations: { ar: { quoted: "It''s '{'x'}'", plain: "Don't" } },
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('quoted')).toBe("It's {x}");
    expect(i18n.translate('plain')).toBe("Don't");
  });
});

describe('RIV-11 <html lang> prefers the configured locale', () => {  it('uses locale when present and the id otherwise', () => {
    const i18n = setup({ languages: [AR_EG, EN, FR] });
    TestBed.flushEffects();
    expect(document.documentElement.lang).toBe('ar-EG');

    i18n.setLanguage('en');
    TestBed.flushEffects();
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('RIV-12 flat dotted keys', () => {
  it('resolves an exact flat key, and the flat key wins over the nested path', async () => {
    const i18n = setup({
      preload: false,
      translations: {
        ar: {
          'app.title': 'Flat title',
          app: { title: 'Nested title', deep: { x: 'Deep' } },
        },
      },
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('app.title')).toBe('Flat title');
    expect(i18n.translate('app.deep.x')).toBe('Deep');
  });

  it('still resolves a purely nested dictionary', async () => {
    const i18n = setup({
      preload: false,
      translations: { ar: { home: { title: 'Nested' } } },
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(i18n.translate('home.title')).toBe('Nested');
  });
});

describe('RIV-13 toggle() is a two-language flip', () => {
  it('flips only the first two languages and warns in dev mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup();

    i18n.toggle();
    expect(i18n.currentLanguage()).toBe('en');
    i18n.toggle();
    expect(i18n.currentLanguage()).toBe('ar');
    expect(i18n.currentLanguage()).not.toBe('fr');

    const messages = warn.mock.calls.map((call) => String(call[0]));
    if (isDevMode()) {
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('next()/previous()');
    } else {
      expect(messages).toHaveLength(0);
    }
  });
});

describe('RIV-17 persistence only after an explicit change', () => {
  it('sets no cookie on first load and one after the first switch', async () => {
    document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
    setup({ storageStrategy: 'cookie' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(document.cookie).not.toContain(`${STORAGE_KEY}=`);

    const i18n = TestBed.inject(RiviniaI18n<Ids>);
    i18n.setLanguage('en');
    expect(document.cookie).toContain(`${STORAGE_KEY}=en`);
  });

  it('writes nothing on first load and skips a write already reflected in storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const i18n = setup({ storageStrategy: 'local' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(setItem).not.toHaveBeenCalled();

    // Another tab persisted the target language first: no write is needed.
    window.localStorage.setItem(STORAGE_KEY, 'en');
    setItem.mockClear();
    i18n.setLanguage('en');
    expect(setItem).not.toHaveBeenCalled();
    expect(i18n.currentLanguage()).toBe('en');
  });

  it('persist: false leaves storage untouched', () => {
    document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
    const i18n = setup({ storageStrategy: 'cookie', persist: false });
    i18n.setLanguage('en');
    expect(document.cookie).not.toContain(`${STORAGE_KEY}=`);
  });
});

describe('loadingState after a cached switch (D6)', () => {
  it('leaves the error state behind when a cached dictionary is shown', async () => {
    const i18n = setup({
      fallbackLanguage: 'en',
      loader: customLoader(async (lang) => {
        if (lang === 'ar') throw new Error('offline');
        return { hello: 'Hello' };
      }),
    });

    await TestBed.inject(ApplicationRef).whenStable();
    expect(i18n.loadingState()).toBe('error');

    // `en` was cached by the background fallback load; this switch never
    // issues a request, so nothing else would reset the stale error.
    i18n.setLanguage('en');
    expect(i18n.translate('hello')).toBe('Hello');
    expect(i18n.loadingState()).toBe('idle');
    expect(i18n.loadingError()).toBeNull();
  });
});

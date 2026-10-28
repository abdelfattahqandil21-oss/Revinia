import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

/**
 * Characterization for the RIV-18 refactor: a slow background fallback that
 * settles AFTER the caller has moved on. The dictionary must reach the right
 * slot (visible vs fallback) and one fetch must serve both callers.
 *
 * `initialize()` awaits the fallback, so this window belongs to a caller that
 * does not await it (a manual `initialize()`), or to hydration where the
 * fallback arrives later than the visible language. Both are pinned here
 * because the DictionaryStore extraction must not change either.
 */
const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr', locale: 'en-GB' } as const;
const FR = { id: 'fr', nativeName: 'Français', dir: 'ltr' } as const;

type Ids = 'ar' | 'en' | 'fr';

function setup(config?: Partial<RiviniaI18nConfig<Ids>>): RiviniaI18n<Ids> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN, FR],
        fallbackLanguage: 'en',
        storageStrategy: 'none',
        warnOnMissingKey: false,
        preload: true,
        loader: customLoader(async () => ({})),
        ...config,
      }),
    ],
  });
  return TestBed.inject(RiviniaI18n<Ids>);
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('a fallback that settles after the user moved on', () => {
  it('fills the fallback slot only, leaving the switched language on screen', async () => {
    const en = deferred<Record<string, unknown>>();
    const calls: Ids[] = [];
    const i18n = setup({
      loader: customLoader(async (language) => {
        calls.push(language);
        if (language === 'en') return en.promise;
        return language === 'fr' ? { greeting: 'Bonjour' } : { greeting: 'مرحبا' };
      }),
    });

    const hydration = i18n.initialize();
    await flush();
    expect(i18n.translate('greeting')).toBe('مرحبا');
    // The fallback still holds first paint: `initialize()` awaits it.
    expect(i18n.ready()).toBe(false);

    i18n.setLanguage('fr');
    await flush();
    expect(i18n.currentLanguage()).toBe('fr');
    expect(i18n.translate('greeting')).toBe('Bonjour');

    en.resolve({
      greeting: 'Hello',
      items: '{count, plural, one {# item} other {# items}}',
    });
    await hydration;
    await flush();

    expect(i18n.ready()).toBe(true);
    expect(i18n.currentLanguage()).toBe('fr');
    // The late response is the FALLBACK, never the visible dictionary.
    expect(i18n.translate('greeting')).toBe('Bonjour');
    // Keys missing from French resolve through it, with English plural rules.
    expect(i18n.translate('items', { count: 1 })).toBe('1 item');
    expect(i18n.missingKeys()).toEqual([]);
    expect(i18n.loadingState()).toBe('idle');
    expect(calls.filter((call) => call === 'en')).toHaveLength(1);
  });

  it('lets a switch to the fallback language join the background fetch', async () => {
    const en = deferred<Record<string, unknown>>();
    const calls: Ids[] = [];
    const i18n = setup({
      loader: customLoader(async (language) => {
        calls.push(language);
        return language === 'en' ? en.promise : { greeting: 'مرحبا' };
      }),
    });

    const hydration = i18n.initialize();
    await flush();

    const swap = i18n.setLanguageAsync('en');
    await flush();
    // Preload-first: the visible language flips only after the await.
    expect(i18n.currentLanguage()).toBe('ar');

    en.resolve({ greeting: 'Hello' });
    await swap;
    await hydration;
    await flush();

    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');
    expect(i18n.loadingState()).toBe('idle');
    expect(i18n.ready()).toBe(true);
    expect(calls.filter((call) => call === 'en')).toHaveLength(1);
  });
});

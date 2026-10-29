import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

/**
 * RIV-02 — in-flight dedupe must share the FETCH, not the decision to apply.
 *
 * Expected values are derived from the requirement, not the implementation:
 * whichever caller starts a load, the dictionary belongs to the language
 * whenever that language is current when the response arrives.
 */
const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;

type Ids = 'ar' | 'en';

function setup(config?: Partial<RiviniaI18nConfig<Ids>>): RiviniaI18n<Ids> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        warnOnMissingKey: false,
        preload: false,
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

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('RIV-02 in-flight loads across callers', () => {
  it('applies a fallback dictionary when the user switches to it mid-flight', async () => {
    const en = deferred<Record<string, unknown>>();
    const i18n = setup({
      fallbackLanguage: 'en',
      preload: true,
      loader: customLoader(async (language) =>
        language === 'en' ? en.promise : { greeting: 'مرحبا' },
      ),
    });

    // The fallback is fetched in the background while `ar` is current.
    void i18n.initialize();
    await flush();
    expect(i18n.translate('greeting')).toBe('مرحبا');

    // The user taps English before the fallback request settles.
    i18n.setLanguage('en');
    await flush();

    en.resolve({ greeting: 'Hello' });
    await flush();
    await flush();

    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.loadingState()).toBe('idle');
    expect(i18n.translate('greeting')).toBe('Hello');
  });

  it('does not refetch when setLanguage joins a setLanguageAsync load', async () => {
    const en = deferred<Record<string, unknown>>();
    const calls: Ids[] = [];
    const i18n = setup({
      loader: customLoader(async (language) => {
        calls.push(language);
        return language === 'en' ? en.promise : {};
      }),
    });

    const preload = i18n.setLanguageAsync('en');
    await flush();
    // The user switches instantly while the preload-first task is still open.
    i18n.setLanguage('en');
    await flush();

    en.resolve({ greeting: 'Hello' });
    await preload;
    await flush();

    expect(calls.filter((call) => call === 'en')).toHaveLength(1);
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');
  });

  it('reports onLoadError once when several callers share a failed fetch', async () => {
    const en = deferred<Record<string, unknown>>();
    const failures: string[] = [];
    const i18n = setup({
      loader: customLoader(async (language) =>
        language === 'en' ? en.promise : {},
      ),
      onLoadError: (language) => failures.push(language),
    });

    const first = i18n.loadTranslations('en');
    const second = i18n.loadTranslations('en');
    await Promise.resolve();
    en.reject(new Error('offline'));
    await first;
    await second;

    expect(failures).toEqual(['en']);
  });

  it('discards an old response when reload() runs mid-flight', async () => {
    const slow = deferred<void>();
    let version = 1;
    const i18n = setup({
      loader: customLoader(async () => {
        if (version === 1) {
          await slow.promise;
          return { v: 'old' };
        }
        return { v: 'new' };
      }),
    });

    const stale = i18n.loadTranslations('ar');
    await flush();

    version = 2;
    const fresh = i18n.reload();
    await flush();

    slow.resolve();
    await stale;
    await fresh;

    expect(i18n.translate('v')).toBe('new');
    expect(i18n.loadingState()).toBe('idle');
  });

  it('never puts the loading state in error for a background fallback failure', async () => {
    const failures: string[] = [];
    const i18n = setup({
      fallbackLanguage: 'en',
      preload: true,
      loader: customLoader(async (language) => {
        if (language === 'en') throw new Error('offline');
        return { greeting: 'مرحبا' };
      }),
      onLoadError: (language) => failures.push(language),
    });

    void i18n.initialize();
    await flush();
    await flush();

    expect(failures).toContain('en');
    expect(i18n.loadingState()).toBe('idle');
    expect(i18n.translate('greeting')).toBe('مرحبا');
  });
});

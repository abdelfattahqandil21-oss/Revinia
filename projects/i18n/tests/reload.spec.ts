import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

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
        loader: customLoader(async () => ({})),
        warnOnMissingKey: false,
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
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('reload()', () => {
  it('refetches the current language and applies the new dictionary', async () => {
    let version = 1;
    const i18n = setup({ loader: customLoader(async () => ({ hello: `v${version}` })) });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(i18n.translate('hello')).toBe('v1');

    version = 2;
    await expect(i18n.reload()).resolves.toBe(true);
    expect(i18n.translate('hello')).toBe('v2');
  });

  it('refetches on every call — the cache never answers a reload', async () => {
    let calls = 0;
    const i18n = setup({
      loader: customLoader(async () => {
        calls++;
        return { v: String(calls) };
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(calls).toBe(1);

    await i18n.reload();
    expect(calls).toBe(2);
    await i18n.reload();
    expect(calls).toBe(3);
    expect(i18n.translate('v')).toBe('3');
  });

  it('reload(lang) refetches that language only and leaves the UI language alone', async () => {
    const calls: string[] = [];
    const i18n = setup({
      loader: customLoader(async (lang) => {
        calls.push(lang);
        return lang === 'en' ? { b: 'B' } : { a: 'A' };
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    calls.length = 0;

    await expect(i18n.reload('en')).resolves.toBe(true);
    expect(calls).toEqual(['en']);
    expect(i18n.currentLanguage()).toBe('ar');
    expect(i18n.translate('a')).toBe('A');

    i18n.setLanguage('en');
    await flush();
    expect(i18n.translate('b')).toBe('B');
  });

  it('returns false and does not fetch for an unconfigured language', async () => {
    const calls: string[] = [];
    const i18n = setup({
      loader: customLoader(async (lang) => {
        calls.push(lang);
        return {};
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    calls.length = 0;

    await expect(i18n.reload('fr' as Ids)).resolves.toBe(false);
    expect(calls).toEqual([]);
  });

  it('discards a stale response: no cache, no signal, no transfer', async () => {
    const stale = deferred<Record<string, unknown>>();
    const fresh = deferred<Record<string, unknown>>();
    let call = 0;
    const i18n = setup({
      loader: customLoader(async () => {
        call++;
        return call === 1 ? stale.promise : fresh.promise;
      }),
    });

    // Starts initialize(); the first load is gated, so do not await stability.
    TestBed.inject(ApplicationRef);
    await flush();

    const reloading = i18n.reload();
    await flush();

    stale.resolve({ v: 'stale' });
    await flush();
    expect(i18n.translate('v')).toBe('v');

    fresh.resolve({ v: 'fresh' });
    await expect(reloading).resolves.toBe(true);
    expect(i18n.translate('v')).toBe('fresh');
  });

  it('never applies a reloaded dictionary to a language the user already left', async () => {
    const arReload = deferred<Record<string, unknown>>();
    let arCalls = 0;
    const i18n = setup({
      loader: customLoader(async (lang) => {
        if (lang === 'ar') {
          arCalls++;
          return arCalls === 1 ? { v: 'ar1' } : arReload.promise;
        }
        return { v: 'en1' };
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(i18n.translate('v')).toBe('ar1');

    const reloading = i18n.reload();
    await flush();
    i18n.setLanguage('en');
    await flush();
    expect(i18n.translate('v')).toBe('en1');

    arReload.resolve({ v: 'ar2' });
    await expect(reloading).resolves.toBe(true);
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('v')).toBe('en1');

    // The fresh Arabic dictionary was cached, so switching back is instant.
    i18n.setLanguage('ar');
    await flush();
    expect(i18n.translate('v')).toBe('ar2');
  });

  it('reports a failed reload without rejecting', async () => {
    let fail = false;
    const i18n = setup({
      loader: customLoader(async () => {
        if (fail) throw new Error('down');
        return { a: 'A' };
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    fail = true;
    await expect(i18n.reload()).resolves.toBe(false);
    expect(i18n.loadingState()).toBe('error');
    expect((i18n.loadingError() as Error).message).toBe('down');
  });

  it('does not clear missingKeys', async () => {
    const i18n = setup();
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('nope');
    await flush();
    expect(i18n.missingKeys()).toEqual(['nope']);

    await i18n.reload();
    expect(i18n.missingKeys()).toEqual(['nope']);
  });
});

describe('reload() with a fallback language', () => {
  it('reload(lang) refreshes a fallback value', async () => {
    let enValue = 'v1';
    const i18n = setup({
      fallbackLanguage: 'en',
      loader: customLoader(async (lang) => (lang === 'en' ? { onlyEn: enValue } : {})),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(i18n.translate('onlyEn')).toBe('v1');

    enValue = 'v2';
    await expect(i18n.reload('en')).resolves.toBe(true);
    expect(i18n.translate('onlyEn')).toBe('v2');
  });

  it('reload() refetches the current language and the fallback', async () => {
    const calls: string[] = [];
    const i18n = setup({
      fallbackLanguage: 'en',
      loader: customLoader(async (lang) => {
        calls.push(lang);
        return {};
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();
    calls.length = 0;

    await i18n.reload();
    await flush();
    expect(calls.sort()).toEqual(['ar', 'en']);
  });

  it('a failed fallback reload never drives loadingState', async () => {
    let failFallback = false;
    const i18n = setup({
      fallbackLanguage: 'en',
      loader: customLoader(async (lang) => {
        if (lang === 'en' && failFallback) throw new Error('fallback down');
        return lang === 'en' ? { onlyEn: 'English' } : {};
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    failFallback = true;
    await expect(i18n.reload('en')).resolves.toBe(false);
    expect(i18n.loadingState()).toBe('idle');
    expect(i18n.translate('onlyEn')).toBe('English');
  });
});

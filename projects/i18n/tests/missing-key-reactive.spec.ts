import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

/**
 * RIV-05 — `t()` is a computed. Resolving a missing key must not run the
 * consumer's handler inside that computation: a handler that writes a signal
 * would throw NG0600 and hide the page's text.
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
        translations: { ar: {} },
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

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('RIV-05 missing-key callback outside the computation', () => {
  it('does not throw when the handler writes a signal', () => {
    const seen = signal(0);
    const i18n = setup({
      onMissingKey: () => seen.update((count) => count + 1),
    });

    const text = i18n.t('missing.key');
    expect(() => text()).not.toThrow();
  });

  it('delivers each key once, in lookup order, from the microtask flush', async () => {
    const events: string[] = [];
    const i18n = setup({
      onMissingKey: (event) => events.push(event.key),
    });

    const first = i18n.t('a.key');
    const second = i18n.t('b.key');
    first();
    second();
    second();
    first();

    await flush();
    expect(events).toEqual(['a.key', 'b.key']);
    expect(i18n.missingKeys()).toEqual(['a.key', 'b.key']);
  });
});

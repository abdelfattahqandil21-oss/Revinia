import { ApplicationRef, signal } from '@angular/core';
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

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('t() — signal translations', () => {
  it('returns a signal that follows the active language', async () => {
    const i18n = setup({
      loader: customLoader(async (lang) => ({
        title: lang === 'ar' ? 'عنوان' : 'Title',
      })),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    const title = i18n.t('title');
    expect(title()).toBe('عنوان');

    i18n.setLanguage('en');
    await flush();
    expect(title()).toBe('Title');

    i18n.setLanguage('ar');
    await flush();
    expect(title()).toBe('عنوان');
  });

  it('tracks signals read by a params function', () => {
    const count = signal(1);
    const i18n = setup({
      preload: false,
      translations: {
        ar: { items: '{count, plural, one {# عنصر} other {# عناصر}}' },
        en: { items: '{count, plural, one {# item} other {# items}}' },
      },
    });

    const items = i18n.t('items', () => ({ count: count() }));
    expect(items()).toBe('1 عنصر');

    count.set(3);
    expect(items()).toBe('3 عناصر');

    count.set(1);
    expect(items()).toBe('1 عنصر');
  });

  it('accepts a plain params object', () => {
    const i18n = setup({
      preload: false,
      translations: { ar: { greet: 'مرحبا {name}' } },
    });
    const greet = i18n.t('greet', { name: 'ليلى' });
    expect(greet()).toBe('مرحبا ليلى');
  });

  it('supports the defaultValue overload with and without params', () => {
    const i18n = setup({ preload: false, translations: { ar: {} } });

    expect(i18n.t('nope', 'Inline')()).toBe('Inline');
    expect(i18n.t('nope', 'Hi {name}', { name: 'A' })()).toBe('Hi A');
    expect(i18n.t('nope', 'Hi {name}', () => ({ name: 'B' }))()).toBe('Hi B');
  });

  it('uses the fallback dictionary, rendered with the fallback locale', () => {
    const i18n = setup({
      fallbackLanguage: 'en',
      preload: false,
      translations: {
        ar: {},
        en: { items: '{count, plural, one {one} two {two} other {other}}' },
      },
    });
    const items = i18n.t('items', { count: 2 });
    expect(items()).toBe('other');
  });

  it('records a missing key without writing signals inside the computed', async () => {
    const i18n = setup({ preload: false, translations: { ar: {} } });

    const missing = i18n.t('nope');
    // Reading a computed that reports a missing key must not throw NG0600
    // ("writing to signals is not allowed in a computed").
    expect(() => missing()).not.toThrow();
    expect(missing()).toBe('nope');
    expect(i18n.missingKeys()).toEqual([]);

    await flush();
    expect(i18n.missingKeys()).toEqual(['nope']);
  });

  it('keeps two computed instances for the same key independent', async () => {
    const i18n = setup({
      loader: customLoader(async (lang) => ({ title: lang === 'ar' ? 'أ' : 'B' })),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    const first = i18n.t('title');
    const second = i18n.t('title');
    expect(first()).toBe('أ');
    expect(second()).toBe('أ');

    i18n.setLanguage('en');
    await flush();
    expect(first()).toBe('B');
    expect(second()).toBe('B');
  });
});

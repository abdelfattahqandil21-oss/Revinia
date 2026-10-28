import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import type { MissingKeyEvent } from '../src/lib/models/missing-key';
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
        // Explicit everywhere so the suite never depends on `isDevMode()`.
        warnOnMissingKey: false,
        ...config,
      }),
    ],
  });
  return TestBed.inject(RiviniaI18n<Ids>);
}

/** Flushes the microtask that publishes `missingKeys`. */
function flushMissing(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('missing keys — recording', () => {
  it('records a key missing from both dictionaries once, and notifies once', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({
      fallbackLanguage: 'en',
      onMissingKey: (event) => events.push(event),
      loader: customLoader(async (lang) =>
        lang === 'ar' ? { hello: 'مرحبا' } : { onlyEn: 'English only' },
      ),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('nope')).toBe('nope');
    expect(i18n.translate('nope')).toBe('nope');

    // The signal write is deferred: `t()` is a computed and cannot write.
    expect(i18n.missingKeys()).toEqual([]);
    await flushMissing();
    expect(i18n.missingKeys()).toEqual(['nope']);
    expect(events).toEqual([{ key: 'nope', language: 'ar', fallbackLanguage: 'en' }]);
  });

  it('does not report a key that the fallback dictionary resolves', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({
      fallbackLanguage: 'en',
      onMissingKey: (event) => events.push(event),
      loader: customLoader(async (lang) => (lang === 'ar' ? {} : { onlyEn: 'English only' })),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('onlyEn')).toBe('English only');
    await flushMissing();
    expect(events).toEqual([]);
    expect(i18n.missingKeys()).toEqual([]);
  });

  it('does not report a key that supplied an explicit defaultValue', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({ onMissingKey: (event) => events.push(event) });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.translate('nope', 'Inline')).toBe('Inline');
    expect(i18n.translate('nope', 'Inline', { count: 1 })).toBe('Inline');
    await flushMissing();
    expect(events).toEqual([]);
  });

  it('does not report while the current language has no dictionary at all', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({
      onMissingKey: (event) => events.push(event),
      loader: customLoader(async () => {
        throw new Error('offline');
      }),
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(i18n.loadingState()).toBe('error');
    expect(i18n.translate('nope')).toBe('nope');
    await flushMissing();
    expect(events).toEqual([]);
    expect(i18n.missingKeys()).toEqual([]);
  });

  it('reports from an inline dictionary without any load', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({
      preload: false,
      translations: { ar: { hello: 'مرحبا' } },
      onMissingKey: (event) => events.push(event),
    });

    expect(i18n.translate('nope')).toBe('nope');
    await flushMissing();
    expect(events).toEqual([{ key: 'nope', language: 'ar' }]);
  });

  it('keeps insertion order across several keys', async () => {
    const i18n = setup();
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('b');
    i18n.translate('a');
    i18n.translate('b');
    i18n.translate('c');
    await flushMissing();
    expect(i18n.missingKeys()).toEqual(['b', 'a', 'c']);
  });

  it('clearMissingKeys empties the report and allows a re-report', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const i18n = setup({ onMissingKey: (event) => events.push(event) });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('nope');
    await flushMissing();
    expect(i18n.missingKeys()).toEqual(['nope']);

    i18n.clearMissingKeys();
    expect(i18n.missingKeys()).toEqual([]);

    i18n.translate('nope');
    await flushMissing();
    expect(i18n.missingKeys()).toEqual(['nope']);
    expect(events).toHaveLength(2);
  });
});

describe('missing keys — console warning', () => {
  it('warns once per key, prefixed with the package name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup({ warnOnMissingKey: true });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('nope');
    i18n.translate('nope');
    i18n.translate('other');
    await flushMissing();

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('[rivinia/i18n]');
    expect(warn.mock.calls[0][0]).toContain('nope');
    expect(warn.mock.calls[1][0]).toContain('other');
  });

  it('does not warn when warnOnMissingKey is false, even with no handler', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup({ warnOnMissingKey: false });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('nope');
    await flushMissing();
    expect(warn).not.toHaveBeenCalled();
    expect(i18n.missingKeys()).toEqual(['nope']);
  });

  it('does not warn by default when an onMissingKey handler is configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = setup({ onMissingKey: () => {} });
    await TestBed.inject(ApplicationRef).whenStable();

    i18n.translate('nope');
    await flushMissing();
    expect(warn).not.toHaveBeenCalled();
  });
});

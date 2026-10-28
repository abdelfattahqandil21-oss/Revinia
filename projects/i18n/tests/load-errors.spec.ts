import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaI18nConfig } from '../src/lib/models/i18n-config';
import { RiviniaLoadError } from '../src/lib/models/load-error';
import { jsonLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

/**
 * RIV-07 — error messages must survive HTTP/2, where `statusText` is empty.
 * Expected message is written from the requirement:
 * [rivinia/i18n] Failed to load 'URL' (HTTP STATUS)
 */
const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;

type Ids = 'ar' | 'en';

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RIV-07 loader errors', () => {
  it('reports the numeric status when statusText is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404, statusText: '' })),
    );

    const loader = await jsonLoader().resolve();
    const error = await loader.load('en').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RiviniaLoadError);
    expect(error).toMatchObject({
      name: 'RiviniaLoadError',
      url: 'i18n/en.json',
      status: 404,
      language: 'en',
      message: "[rivinia/i18n] Failed to load 'i18n/en.json' (HTTP 404)",
    });
  });

  it('keeps the status for a 500 as well', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));

    const loader = await jsonLoader().resolve();
    await expect(loader.load('ar')).rejects.toMatchObject({
      status: 500,
      message: "[rivinia/i18n] Failed to load 'i18n/ar.json' (HTTP 500)",
    });
  });

  it('passes the typed error to onLoadError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })));
    const failures: unknown[] = [];

    TestBed.configureTestingModule({
      providers: [
        provideRiviniaI18n({
          defaultLanguage: 'ar',
          languages: [AR, EN],
          storageStrategy: 'none',
          warnOnMissingKey: false,
          loader: jsonLoader(),
          onLoadError: (_language, error) => failures.push(error),
        }),
      ],
    });
    const i18n = TestBed.inject(RiviniaI18n<Ids>);

    await TestBed.inject(ApplicationRef).whenStable();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toBeInstanceOf(RiviniaLoadError);
    expect(failures[0]).toMatchObject({ status: 503, language: 'ar' });
    expect(i18n.loadingState()).toBe('error');
  });
});

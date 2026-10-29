import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;

type Ids = 'ar' | 'en';

function failEveryLoad(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 503 })),
  );
}

function silenceConsoleError() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

/** The `fallbackLanguage`/handler options differ per test, so each one wires its own config. */
function injectService(config: {
  fallbackLanguage?: Ids;
  warnOnLoadError?: boolean;
  onLoadError?: (language: Ids, error: unknown) => void;
}): RiviniaI18n<Ids> {
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n<Ids>({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        warnOnMissingKey: false,
        loader: jsonLoader(),
        ...config,
      }),
    ],
  });
  return TestBed.inject(RiviniaI18n<Ids>);
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('default load-error warning', () => {
  it('warns once for the failed language, with the typed error', async () => {
    failEveryLoad();
    const error = silenceConsoleError();
    injectService({});

    await TestBed.inject(ApplicationRef).whenStable();

    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('"ar"');
    expect(error.mock.calls[0][1]).toMatchObject({ name: 'RiviniaLoadError', status: 503 });
  });

  it('does not repeat the warning when the same language fails again', async () => {
    failEveryLoad();
    const error = silenceConsoleError();
    const i18n = injectService({});

    await TestBed.inject(ApplicationRef).whenStable();
    await i18n.reload();

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('warns once per language, including the fallback', async () => {
    failEveryLoad();
    const error = silenceConsoleError();
    injectService({ fallbackLanguage: 'en' });

    await TestBed.inject(ApplicationRef).whenStable();

    const messages = error.mock.calls.map((call) => String(call[0]));
    expect(messages).toHaveLength(2);
    expect(messages.some((message) => message.includes('"ar"'))).toBe(true);
    expect(messages.some((message) => message.includes('"en"'))).toBe(true);
  });

  it('stays silent when warnOnLoadError is false', async () => {
    failEveryLoad();
    const error = silenceConsoleError();
    injectService({ warnOnLoadError: false });

    await TestBed.inject(ApplicationRef).whenStable();

    expect(error).not.toHaveBeenCalled();
  });

  it('leaves reporting to the handler when onLoadError is configured', async () => {
    failEveryLoad();
    const error = silenceConsoleError();
    const handled: string[] = [];
    injectService({
      onLoadError: (language, caught) => handled.push(`${language}:${(caught as Error).name}`),
    });

    await TestBed.inject(ApplicationRef).whenStable();

    expect(handled).toEqual(['ar:RiviniaLoadError']);
    expect(error).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpLoader, jsonLoader, remoteLoader } from './loaders';

function stubFetch(body: unknown, ok = true): string[] {
  const seen: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      seen.push(url);
      return { ok, statusText: ok ? 'OK' : 'Missing', json: async () => body } as Response;
    }),
  );
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('jsonLoader', () => {
  it('defaults to assets/i18n/{language}.json unless overridden', async () => {
    const seen = stubFetch({ a: 1 });
    const loader = await jsonLoader().resolve();
    expect(await loader.load('ar')).toEqual({ a: 1 });
    expect(seen).toEqual(['assets/i18n/ar.json']);

    const custom = await jsonLoader({ path: '/my-i18n' }).resolve();
    expect(await custom.load('en')).toEqual({ a: 1 });
    expect(seen[1]).toBe('/my-i18n/en.json');
  });

  it('throws a descriptive error on missing files', async () => {
    stubFetch({}, false);
    const loader = await jsonLoader().resolve();
    await expect(loader.load('ar')).rejects.toThrow('assets/i18n/ar.json');
  });
});

describe('httpLoader and remoteLoader', () => {
  it('builds URLs from endpoint by default, custom builder wins', async () => {
    const seen = stubFetch({});
    const loader = await httpLoader({ endpoint: 'https://api.test/i18n' }).resolve();
    await loader.load('en');
    expect(seen).toEqual(['https://api.test/i18n/en']);

    const custom = await httpLoader({
      endpoint: 'https://api.test/i18n',
      buildUrl: (lang) => `https://cdn.test/${lang}.json`,
    }).resolve();
    await custom.load('ar');
    expect(seen[1]).toBe('https://cdn.test/ar.json');
  });

  it('sends custom headers for remoteLoader', async () => {
    stubFetch({});
    const loader = await remoteLoader({
      url: (lang) => `https://api.test/v2/${lang}`,
      headers: { Authorization: 'Bearer x' },
    }).resolve();
    await loader.load('ar');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer x' } });
  });
});

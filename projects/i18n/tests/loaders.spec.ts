import { afterEach, describe, expect, it, vi } from 'vitest';
import { customLoader, httpLoader, jsonLoader, remoteLoader } from '../src/lib/models/loaders';
import type { LoaderContext } from '../src/lib/models/loaders';

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
  it('defaults to i18n/{language}.json unless overridden', async () => {
    const seen = stubFetch({ a: 1 });
    const loader = await jsonLoader().resolve();
    expect(await loader.load('ar')).toEqual({ a: 1 });
    expect(seen).toEqual(['i18n/ar.json']);

    const custom = await jsonLoader({ path: '/my-i18n' }).resolve();
    expect(await custom.load('en')).toEqual({ a: 1 });
    expect(seen[1]).toBe('/my-i18n/en.json');
  });

  it('throws a descriptive error on missing files', async () => {
    stubFetch({}, false);
    const loader = await jsonLoader().resolve();
    await expect(loader.load('ar')).rejects.toThrow('i18n/ar.json');
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

describe('loaders on the server (LoaderContext)', () => {
  const SERVER: LoaderContext = { baseUrl: 'http://h:4000/app/', isServer: true };
  const BROWSER: LoaderContext = { baseUrl: 'http://h:4000/app/', isServer: false };

  it('jsonLoader resolves a relative path against the server base', async () => {
    const seen = stubFetch({});
    const loader = await jsonLoader().resolve(SERVER);
    await loader.load('ar', SERVER);
    expect(seen).toEqual(['http://h:4000/app/i18n/ar.json']);
  });

  it('jsonLoader leaves a relative path alone in the browser', async () => {
    const seen = stubFetch({});
    const loader = await jsonLoader().resolve(BROWSER);
    await loader.load('ar', BROWSER);
    expect(seen).toEqual(['i18n/ar.json']);
  });

  it('jsonLoader keeps an absolute custom path on the server', async () => {
    const seen = stubFetch({});
    const loader = await jsonLoader({ path: 'https://cdn.test/i18n' }).resolve(SERVER);
    await loader.load('en', SERVER);
    expect(seen).toEqual(['https://cdn.test/i18n/en.json']);
  });

  it('httpLoader resolves a relative endpoint on the server', async () => {
    const seen = stubFetch({});
    const loader = await httpLoader({ endpoint: '/api/i18n' }).resolve(SERVER);
    await loader.load('en', SERVER);
    expect(seen).toEqual(['http://h:4000/api/i18n/en']);
  });

  it('remoteLoader resolves a relative url on the server', async () => {
    const seen = stubFetch({});
    const loader = await remoteLoader({ url: (lang) => `dictionaries/${lang}.json` }).resolve(
      SERVER,
    );
    await loader.load('ar', SERVER);
    expect(seen).toEqual(['http://h:4000/app/dictionaries/ar.json']);
  });

  it('customLoader receives the context as its second argument', async () => {
    const received: Array<LoaderContext | undefined> = [];
    const loader = await customLoader(async (_lang, context) => {
      received.push(context);
      return {};
    }).resolve(SERVER);
    await loader.load('ar', SERVER);
    await loader.load('en');
    expect(received).toEqual([SERVER, undefined]);
  });
});

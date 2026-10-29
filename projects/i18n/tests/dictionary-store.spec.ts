import { describe, expect, it, vi } from 'vitest';
import { DictionaryStore } from '../src/lib/services/dictionary-store';

type Ids = 'ar' | 'en' | 'fr';
type Dict = Record<string, unknown>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function make(opts?: {
  current?: Ids;
  fallback?: Ids | null;
  inline?: Partial<Record<Ids, Dict>>;
  load?: (language: Ids) => Promise<Dict>;
  request?: boolean;
  onLoadError?: (language: Ids, error: unknown) => void;
}) {
  const current = { value: opts?.current ?? ('ar' as Ids) };
  const calls: Ids[] = [];
  const inline = opts?.inline ?? {};
  const load =
    opts?.load ??
    (async (language: Ids) => {
      calls.push(language);
      return { [`${language}.key`]: language };
    });
  const transferStore = new Map<string, unknown>();
  const store = new DictionaryStore<Ids>({
    loader: async () => ({ load }),
    loaderContext: { baseUrl: '/', isServer: false },
    request: opts?.request ? { headers: { get: () => null } } : null,
    transfer: {
      hasKey: (key: string) => transferStore.has(key),
      get: (key: string) => transferStore.get(key) ?? null,
      remove: (key: string) => void transferStore.delete(key),
      set: (key: string, value: unknown) => void transferStore.set(key, value),
    } as never,
    onLoadError: opts?.onLoadError,
    currentLanguage: () => current.value,
    fallbackLanguage: opts?.fallback ?? null,
    languageIds: () => ['ar', 'en', 'fr'],
    hasInline: (language) => inline[language] !== undefined,
  });
  return { store, current, calls, transferStore };
}

describe('DictionaryStore load', () => {
  it('caches and applies the current language', async () => {
    const { store } = make();
    const result = await store.load('ar');
    expect(result).toEqual({ data: { 'ar.key': 'ar' }, ok: true });
    expect(store.visible()).toEqual({ 'ar.key': 'ar' });
    expect(store.loadingState()).toBe('idle');
  });

  it('keeps a dictionary for another language out of the visible slot', async () => {
    const { store } = make({ current: 'en' });
    await store.load('ar');
    expect(store.visible()).toEqual({});
    expect(store.has('ar')).toBe(true);
  });

  it('fills the fallback slot instead of the visible one', async () => {
    const { store } = make({ current: 'ar', fallback: 'en' });
    await store.load('en', { background: true });
    expect(store.fallback()).toEqual({ 'en.key': 'en' });
    expect(store.visible()).toEqual({});
    expect(store.loadingState()).toBe('idle');
  });

  it('reports loading only for non-background loads', async () => {
    const gate = deferred<Dict>();
    const { store } = make({ load: () => gate.promise });
    const pending = store.load('ar');
    expect(store.loadingState()).toBe('loading');
    gate.resolve({ a: 'b' });
    await pending;
    expect(store.loadingState()).toBe('idle');
  });

  it('background failures never reach loadingState/loadingError', async () => {
    const { store } = make({
      fallback: 'en',
      load: async () => {
        throw new Error('nope');
      },
    });
    const result = await store.load('en', { background: true });
    expect(result.ok).toBe(false);
    expect(store.loadingState()).toBe('idle');
    expect(store.loadingError()).toBeNull();
  });

  it('surfaces an error only when it belongs to the current language', async () => {
    const onLoadError = vi.fn();
    const { store } = make({
      load: async () => {
        throw new Error('boom');
      },
      onLoadError,
    });
    const result = await store.load('ar');
    expect(result.ok).toBe(false);
    expect(store.loadingState()).toBe('error');
    expect(store.loadingError()).toBeInstanceOf(Error);
    expect(onLoadError).toHaveBeenCalledOnce();
  });

  it('a cached switch clears a stale error (no load runs its finally)', async () => {
    let fail = false;
    const { store, current } = make({
      current: 'ar',
      load: async (language) => {
        if (fail) throw new Error('boom');
        return { [language]: 'v' };
      },
    });
    await store.load('en'); // cached, not visible (current is still ar)
    fail = true;
    await store.load('ar');
    expect(store.loadingState()).toBe('error');

    current.value = 'en';
    await store.load('en'); // cache hit, no load, no finally
    expect(store.visible()).toEqual({ en: 'v' });
    expect(store.loadingState()).toBe('idle');
    expect(store.loadingError()).toBeNull();
  });
});

describe('DictionaryStore sharing and generations (RIV-02)', () => {
  it('shares one fetch between a background load and an explicit one', async () => {
    const gate = deferred<Dict>();
    let calls = 0;
    const { store } = make({
      fallback: 'en',
      load: () => {
        calls++;
        return gate.promise;
      },
    });
    const background = store.load('en', { background: true });
    const explicit = store.load('en');
    expect(store.loadingState()).toBe('loading');
    gate.resolve({ 'en.key': 'en' });
    const [a, b] = await Promise.all([background, explicit]);
    expect(calls).toBe(1);
    expect(a.ok && b.ok).toBe(true);
    expect(store.fallback()).toEqual({ 'en.key': 'en' });
  });

  it('drops a response that a reload superseded', async () => {
    const first = deferred<Dict>();
    let call = 0;
    const { store } = make({
      load: () => {
        call++;
        if (call === 1) return first.promise;
        return Promise.resolve({ fresh: 'yes' } as Dict);
      },
    });
    const slow = store.load('ar');
    const reloaded = store.reload('ar');
    first.resolve({ stale: 'no' });
    await slow;
    await reloaded;
    expect(store.has('ar')).toBe(true);
    expect(store.visible()).toEqual({ fresh: 'yes' });
  });

  it('reload() refreshes the current and the fallback, dropping others', async () => {
    const { store, calls } = make({ current: 'ar', fallback: 'en' });
    await store.load('fr');
    await store.reload();
    expect(calls).toEqual(['fr', 'ar', 'en']);
  });

  it('reload(lang) resolves false for an unknown language', async () => {
    const { store, calls } = make();
    expect(await store.reload('de' as Ids)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('DictionaryStore fallback and transfer', () => {
  it('ensureFallback loads once and stays quiet when already cached', async () => {
    const { store, calls } = make({ current: 'ar', fallback: 'en' });
    store.ensureFallback();
    store.ensureFallback();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual(['en']);
    store.ensureFallback();
    await Promise.resolve();
    expect(calls).toEqual(['en']);
  });

  it('ensureFallback does nothing without a fallback or on the current language', async () => {
    const none = make();
    none.store.ensureFallback();
    const same = make({ current: 'en', fallback: 'en' });
    same.store.ensureFallback();
    await Promise.resolve();
    expect(none.calls).toEqual([]);
    expect(same.calls).toEqual([]);
  });

  it('consumes a transferred dictionary exactly once', async () => {
    const { store, transferStore, calls } = make();
    transferStore.set('rivinia.i18n.dict.ar', { seeded: 'yes' });
    const transferred = store.consumeTransfer('ar');
    expect(transferred).toEqual({ seeded: 'yes' });
    expect(store.consumeTransfer('ar')).toBeNull();
    expect(calls).toEqual([]);
  });

  it('writes transfer state only on the server', async () => {
    const client = make();
    await client.store.load('ar');
    expect(client.transferStore.has('rivinia.i18n.dict.ar')).toBe(false);

    const server = make({ request: true });
    await server.store.load('ar');
    expect(server.transferStore.get('rivinia.i18n.dict.ar')).toEqual({ 'ar.key': 'ar' });
  });

  it('has() counts inline dictionaries', () => {
    const { store } = make({ inline: { ar: { a: 'b' } } });
    expect(store.has('ar')).toBe(true);
    expect(store.has('en')).toBe(false);
  });

  it('adoptTransferred caches and applies to the right slot', () => {
    const { store } = make({ current: 'ar', fallback: 'en' });
    store.adoptTransferred('ar', { visible: 'yes' });
    store.adoptTransferred('en', { fallback: 'yes' });
    expect(store.visible()).toEqual({ visible: 'yes' });
    expect(store.fallback()).toEqual({ fallback: 'yes' });
    expect(store.has('ar') && store.has('en')).toBe(true);
  });
});

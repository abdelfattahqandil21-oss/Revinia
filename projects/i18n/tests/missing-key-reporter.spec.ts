import { computed, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MissingKeyReporter } from '../src/lib/services/missing-key-reporter';
import type { MissingKeyEvent, MissingParamEvent } from '../src/lib/models/missing-key';

type Ids = 'ar' | 'en';

function make(opts?: {
  language?: () => Ids;
  fallbackLanguage?: Ids | null;
  hasDictionary?: (id: Ids) => boolean;
  onMissingKey?: (event: MissingKeyEvent<Ids>) => void;
  onMissingParam?: (event: MissingParamEvent<Ids>) => void;
  warnOnMissingKey?: boolean;
  warnOnMissingParam?: boolean;
}) {
  const language = opts?.language ?? (() => 'ar' as const);
  const hasDictionary = opts?.hasDictionary ?? (() => true);
  return new MissingKeyReporter<Ids>({
    language,
    fallbackLanguage: opts?.fallbackLanguage ?? null,
    hasDictionary,
    onMissingKey: opts?.onMissingKey,
    onMissingParam: opts?.onMissingParam,
    warnOnMissingKey: opts?.warnOnMissingKey ?? false,
    warnOnMissingParam: opts?.warnOnMissingParam ?? false,
  });
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('MissingKeyReporter keys', () => {
  it('publishes a key in a microtask, not synchronously', async () => {
    const r = make();
    r.reportKey('a.b');
    expect(r.missingKeys()).toEqual([]);
    await tick();
    expect(r.missingKeys()).toEqual(['a.b']);
  });

  it('reports each key once per session', async () => {
    const r = make();
    r.reportKey('a.b');
    r.reportKey('a.b');
    r.reportKey('c.d');
    await tick();
    expect(r.missingKeys()).toEqual(['a.b', 'c.d']);
  });

  it('stays quiet until the language has a dictionary', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    let ready = false;
    const r = make({ hasDictionary: () => ready, onMissingKey: (e) => events.push(e) });
    r.reportKey('a.b');
    await tick();
    expect(r.missingKeys()).toEqual([]);
    ready = true;
    r.reportKey('a.b');
    await tick();
    expect(r.missingKeys()).toEqual(['a.b']);
    expect(events).toEqual([{ key: 'a.b', language: 'ar' }]);
  });

  it('carries the fallback id in the event when one is configured', async () => {
    const events: MissingKeyEvent<Ids>[] = [];
    const r = make({ fallbackLanguage: 'en', onMissingKey: (e) => events.push(e) });
    r.reportKey('x');
    await tick();
    expect(events).toEqual([{ key: 'x', language: 'ar', fallbackLanguage: 'en' }]);
  });

  it('warns through console when asked to', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = make({ fallbackLanguage: 'en', warnOnMissingKey: true });
    r.reportKey('x');
    expect(warn).toHaveBeenCalledWith(
      '[rivinia/i18n] Missing key "x" for language "ar" (fallback "en" has no value either).',
    );
    warn.mockRestore();
  });

  it('accepts a callback that writes a signal, even when reported inside a computed', async () => {
    const writes = signal(0);
    const r = make({ onMissingKey: () => writes.update((n) => n + 1) });
    const value = computed(() => {
      r.reportKey('a.b');
      return 'rendered';
    });
    expect(value()).toBe('rendered');
    await tick();
    expect(writes()).toBe(1);
  });

  it('clearKeys resets the report and the dedupe', async () => {
    const r = make();
    r.reportKey('a.b');
    await tick();
    r.clearKeys();
    expect(r.missingKeys()).toEqual([]);
    r.reportKey('a.b');
    await tick();
    expect(r.missingKeys()).toEqual(['a.b']);
  });
});

describe('MissingKeyReporter params', () => {
  it('dedupes per (key, param) pair and defers the callback', async () => {
    const events: MissingParamEvent<Ids>[] = [];
    const r = make({ onMissingParam: (e) => events.push(e) });
    r.reportParam('items', 'count');
    r.reportParam('items', 'count');
    r.reportParam('items', 'total');
    expect(events).toEqual([]);
    await tick();
    expect(events).toEqual([
      { key: 'items', param: 'count', language: 'ar' },
      { key: 'items', param: 'total', language: 'ar' },
    ]);
  });

  it('keeps distinct pairs distinct instead of joining them into one string', async () => {
    const events: MissingParamEvent<Ids>[] = [];
    const r = make({ onMissingParam: (e) => events.push(e) });
    r.reportParam('a', 'bc');
    r.reportParam('ab', 'c');
    await tick();
    expect(events).toHaveLength(2);
  });

  it('clearParams allows the same pair to be reported again', async () => {
    const events: MissingParamEvent<Ids>[] = [];
    const r = make({ onMissingParam: (e) => events.push(e) });
    r.reportParam('items', 'count');
    await tick();
    r.clearParams();
    r.reportParam('items', 'count');
    await tick();
    expect(events).toHaveLength(2);
  });

  it('warns through console when asked to', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = make({ warnOnMissingParam: true });
    r.reportParam('items', 'count');
    expect(warn).toHaveBeenCalledWith(
      '[rivinia/i18n] Missing parameter "count" for key "items" and language "ar"; the placeholder was kept.',
    );
    warn.mockRestore();
  });
});

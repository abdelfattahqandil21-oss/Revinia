import {
  signal,
  makeStateKey,
  type Signal,
  type StateKey,
  type TransferState,
} from '@angular/core';
import type { LoaderContext, TranslationLoader } from '../models/loaders';

export interface DictionaryStoreDeps<L extends string> {
  /** Resolves the configured loader, or the conventional JSON one. */
  readonly loader: (context: LoaderContext) => Promise<TranslationLoader<L>>;
  readonly loaderContext: LoaderContext;
  /** Present only on the server: transfer state is written there alone. */
  readonly request: { readonly headers: { get(name: string): string | null } } | null;
  readonly transfer: TransferState | null;
  readonly onLoadError?: (languageId: L, error: unknown) => void;
  /** The intended language right now; decides where a response lands. */
  readonly currentLanguage: () => L;
  readonly fallbackLanguage: L | null;
  readonly languageIds: () => readonly L[];
  /** A dictionary supplied inline in the config counts as present. */
  readonly hasInline: (languageId: L) => boolean;
}

interface LoadResult {
  data: Record<string, unknown>;
  ok: boolean;
  error?: unknown;
}

/**
 * Owns every dictionary: the cache, the shared in-flight request, reload
 * generations, TransferState, the loading counter, and the visible and
 * fallback slots. RIV-02 lives here: one fetch serves every caller, and each
 * caller decides whether to APPLY after the await, against current state.
 */
export class DictionaryStore<L extends string> {
  private readonly _visible = signal<Record<string, unknown>>({});
  /**
   * The fallback dictionary, kept separate from `_visible` (which always
   * mirrors the VISIBLE language). A signal so `t()`'s computed re-evaluates
   * when the fallback arrives.
   */
  private readonly _fallbackDict = signal<Record<string, unknown> | null>(null);
  private readonly _loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  private readonly _loadingError = signal<unknown>(null);

  private readonly _cache = new Map<L, Record<string, unknown>>();
  /**
   * Per-language generation, bumped by `reload()`. A load captures the
   * generation before its request and discards the response when it moved:
   * a stale dictionary can never reach the cache or the signals.
   */
  private readonly _generations = new Map<L, number>();
  private readonly _inflight = new Map<L, Promise<LoadResult>>();
  /** Non-background loads in flight; `loadingState` follows this count. */
  private _loadingCount = 0;
  private _resolvedLoader: TranslationLoader<L> | null = null;

  readonly visible: Signal<Record<string, unknown>> = this._visible.asReadonly();
  readonly fallback: Signal<Record<string, unknown> | null> = this._fallbackDict.asReadonly();
  readonly loadingState: Signal<'idle' | 'loading' | 'error'> = this._loadingState.asReadonly();
  readonly loadingError: Signal<unknown> = this._loadingError.asReadonly();

  constructor(private readonly _deps: DictionaryStoreDeps<L>) {}

  has(languageId: L): boolean {
    return this._cache.has(languageId) || this._deps.hasInline(languageId);
  }

  /** Marks the language visible without caching (the inline seed). */
  seedVisible(data: Record<string, unknown>): void {
    this._visible.set(data);
  }

  /** A transferred dictionary: it belongs in the cache and in its slot. */
  adoptTransferred(languageId: L, data: Record<string, unknown>): void {
    this._cache.set(languageId, data);
    this._apply(languageId, data);
  }

  consumeTransfer(languageId: L): Record<string, unknown> | null {
    const transfer = this._deps.transfer;
    if (!transfer) return null;
    const key = this._transferKey(languageId);
    if (!transfer.hasKey(key)) return null;
    const dict = transfer.get(key, null);
    transfer.remove(key);
    return dict;
  }

  async load(
    languageId: L,
    opts?: { silent?: boolean; background?: boolean; force?: boolean },
  ): Promise<{ data: Record<string, unknown>; ok: boolean }> {
    // Background loads (the fallback dictionary) must never drive
    // `loadingState`/`loadingError`: the visible language is what the UI needs.
    const background = opts?.background === true;

    // `force` is the reload path: the cache must not answer it, and a load
    // already in flight for the same language is superseded, not joined.
    if (!opts?.force) {
      const cached = this._cache.get(languageId);
      if (cached) {
        this._apply(languageId, cached);
        return { data: cached, ok: true };
      }
    }

    // One FETCH is shared by every caller; the decision to APPLY is made by
    // each caller after the await, against the state at resolution time. A
    // caller must never inherit another caller's `silent`/`background` flags
    // (RIV-02: a background fallback load joined by an explicit switch).
    let task = opts?.force ? undefined : this._inflight.get(languageId);
    if (!task) {
      // Captured before the request: `reload()` bumps it, which makes this
      // response stale even if it arrives later.
      task = this._fetch(languageId, this._generationOf(languageId));
      this._inflight.set(languageId, task);
    }

    if (!background) {
      this._loadingCount++;
      this._loadingState.set('loading');
    }

    try {
      const result = await task;
      if (result.ok) {
        this._apply(languageId, result.data);
      } else if (
        !background &&
        result.error !== undefined &&
        languageId === this._deps.currentLanguage()
      ) {
        this._loadingError.set(result.error);
        this._loadingState.set('error');
      }
      return { data: result.data, ok: result.ok };
    } finally {
      if (!background) {
        this._loadingCount = Math.max(0, this._loadingCount - 1);
        if (this._loadingCount === 0 && this._loadingState() === 'loading') {
          this._loadingState.set('idle');
        }
      }
    }
  }

  /**
   * Invalidates cached dictionaries and reloads them from the loader.
   *
   * - `reload()` — refreshes the current language (and the fallback, when
   *   configured) and drops every OTHER cached dictionary, so the next switch
   *   refetches. Resolves `true` when the current language loaded.
   * - `reload(lang)` — refreshes one language. If it is the current one it is
   *   applied; otherwise it is only re-cached (and refreshed in the fallback
   *   slot when it is the fallback).
   *
   * The visible dictionary stays on screen until the fresh one arrives
   * (stale-while-revalidate), so a reload never flashes raw keys.
   */
  reload(languageId?: L): Promise<boolean> {
    if (languageId !== undefined) {
      if (!this._deps.languageIds().includes(languageId)) {
        return Promise.resolve(false);
      }
      this._invalidate(languageId);
      return this._reloadOne(languageId);
    }

    const currentId = this._deps.currentLanguage();
    const fallbackId = this._deps.fallbackLanguage;

    for (const cachedId of [...this._cache.keys()]) {
      if (cachedId !== currentId && cachedId !== fallbackId) {
        this._cache.delete(cachedId);
      }
    }
    // Every language is superseded, so any response already in flight for a
    // dictionary this reload does not refetch is dropped instead of cached.
    for (const language of this._deps.languageIds()) {
      this._invalidate(language);
    }

    const currentLoad = this._reloadOne(currentId);
    if (fallbackId !== null && fallbackId !== currentId) {
      void this._reloadOne(fallbackId);
    }
    return currentLoad;
  }

  /** Loads the fallback in the background when it is not cached yet. */
  ensureFallback(): void {
    const fallbackId = this._deps.fallbackLanguage;
    if (fallbackId === null || fallbackId === this._deps.currentLanguage()) return;
    if (this.has(fallbackId)) return;
    void this.load(fallbackId, { silent: true, background: true });
  }

  private _reloadOne(languageId: L): Promise<boolean> {
    return this.load(languageId, {
      force: true,
      // A dictionary that is not on screen must not drive loadingState.
      background: languageId !== this._deps.currentLanguage(),
    }).then((result) => result.ok);
  }

  /**
   * A dictionary reaches the visible signals only when its language is
   * current at resolution time; a fallback dictionary fills the fallback slot.
   * Everything else stays cached for the next switch.
   */
  private _apply(languageId: L, data: Record<string, unknown>): void {
    if (languageId === this._deps.currentLanguage()) {
      this._visible.set(data);
      this._loadingError.set(null);
      // A cached dictionary answers without a load, so the `finally` that
      // normally clears `loading` never runs. Without this, switching away
      // from a failed language to a cached one leaves loadingState 'error'
      // even though the UI is fully translated.
      if (this._loadingCount === 0 && this._loadingState() === 'error') {
        this._loadingState.set('idle');
      }
    }
    if (languageId === this._deps.fallbackLanguage) {
      this._fallbackDict.set(data);
    }
  }

  /** Fetch + cache + transfer. Shared by every caller; never applies. */
  private _fetch(languageId: L, generation: number): Promise<LoadResult> {
    let task!: Promise<LoadResult>;
    task = (async () => {
      const stale = (): boolean => this._generationOf(languageId) !== generation;
      try {
        if (!this._resolvedLoader) {
          this._resolvedLoader = await this._deps.loader(this._deps.loaderContext);
        }
        const translations = await this._resolvedLoader.load(languageId, this._deps.loaderContext);

        // A superseded response touches nothing: no cache, no transfer state,
        // no signals, no error reporting.
        if (stale()) return { data: {}, ok: false };

        this._cache.set(languageId, translations);
        this._writeTransfer(languageId, translations);
        return { data: translations, ok: true };
      } catch (error) {
        if (stale()) return { data: {}, ok: false };
        // Once per failed fetch, however many callers joined it.
        this._deps.onLoadError?.(languageId, error);
        return { data: {}, ok: false, error };
      } finally {
        // Only the owner of the in-flight slot may clear it (a reload may have
        // replaced this entry with a newer request).
        if (this._inflight.get(languageId) === task) {
          this._inflight.delete(languageId);
        }
      }
    })();
    return task;
  }

  private _generationOf(languageId: L): number {
    return this._generations.get(languageId) ?? 0;
  }

  private _invalidate(languageId: L): void {
    this._generations.set(languageId, this._generationOf(languageId) + 1);
  }

  private _transferKey(languageId: L): StateKey<Record<string, unknown>> {
    return makeStateKey<Record<string, unknown>>(`rivinia.i18n.dict.${languageId}`);
  }

  /** Stores freshly loaded dictionaries for hydration (server only). */
  private _writeTransfer(languageId: L, dict: Record<string, unknown>): void {
    if (!this._deps.request) return;
    this._deps.transfer?.set(this._transferKey(languageId), dict);
  }
}

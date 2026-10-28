import {
  DOCUMENT,
  PendingTasks,
  REQUEST,
  Service,
  TransferState,
  computed,
  effect,
  inject,
  isDevMode,
  makeStateKey,
  signal,
  untracked,
  type Signal,
  type StateKey,
} from '@angular/core';
import {
  DEFAULT_AUTO_APPLY_DIRECTION,
  DEFAULT_STORAGE_KEY,
  DEFAULT_STORAGE_STRATEGY,
  RIVINIA_I18N_CONFIG,
  type RiviniaI18nConfig,
} from '../models/i18n-config';
import type { Direction } from '../models/i18n-types';
import type { Language } from '../models/i18n-types';
import type { StorageStrategy } from '../models/i18n-types';
import type { TranslateParams } from '../models/i18n-types';
import type { Translation } from '../models/i18n-types';
import type { TranslationLoader } from '../models/loaders';
import type { LoaderContext } from '../models/loaders';
import type { MissingKeyEvent } from '../models/missing-key';
import type { RegisteredI18nKey } from '../models/typed-keys';
import { jsonLoader } from '../models/loaders';
import { createLoaderContext } from '../utils/loader-context';
import { browserLanguages, detectBrowserLanguage, safeGetItem, safeSetItem } from '../utils/i18n-utils';
import { parseCookie, serializeCookie, shouldSecureCookie } from '../utils/cookies';
import { formatIcu } from '../utils/icu';
import { ViewTransitionService } from './view-transition.service';

/**
 * Headless language owner. State (signals, readonly): current language,
 * direction, loader status, dictionaries. Changes only via the methods below.
 * Side effects (persistence + `<html dir/lang>`) run in effects; everything
 * SSR-guarded. No components, no pipes, no styles inside.
 */
@Service()
export class RiviniaI18n<L extends string = string> {
  private readonly _config = inject<RiviniaI18nConfig<L>>(RIVINIA_I18N_CONFIG);
  private readonly _viewTransition = inject(ViewTransitionService, { optional: true });
  private readonly _storageKey = this._config.storageKey ?? DEFAULT_STORAGE_KEY;
  private readonly _storageStrategy: StorageStrategy =
    this._config.storageStrategy ?? DEFAULT_STORAGE_STRATEGY;
  private readonly _autoApplyDirection: boolean =
    this._config.autoApplyDirection ?? DEFAULT_AUTO_APPLY_DIRECTION;
  /** Validated once; `null` means no fallback chain. */
  private readonly _fallbackId: L | null = this._config.fallbackLanguage ?? null;
  /**
   * Injected (not global) document: the dir/lang effect renders on the
   * server too, avoiding an RTL first-paint shift on hydration.
   * Declared before any field initializer that reads storage.
   */
  private readonly _doc = inject(DOCUMENT);
  /** Present only on the server: used for cookie reads + transfer writes. */
  private readonly _request = inject(REQUEST, { optional: true });
  private readonly _transfer = inject(TransferState, { optional: true });

  /**
   * Platform facts for loaders, built once: `REQUEST` + `<base href>` on the
   * server, `document.baseURI` in the browser. This is what makes the default
   * loader work under SSR instead of fetching a relative URL Node cannot parse.
   */
  readonly loaderContext: LoaderContext = createLoaderContext(this._request ?? null, this._doc);

  private readonly _currentLanguageId = signal<L>(this._resolveInitialLanguage());
  private readonly _languages = signal<readonly Language<L>[]>(this._config.languages);
  private readonly _loadedTranslations = signal<Record<string, unknown>>({});
  /**
   * The fallback dictionary, kept separate from `_loadedTranslations` (which
   * always mirrors the VISIBLE language). A signal so `t()`'s computed
   * re-evaluates when the fallback arrives.
   */
  private readonly _fallbackDict = signal<Record<string, unknown> | null>(null);
  /**
   * Explicit loader wins; otherwise the conventional JSON layout
   * (`i18n/{language}.json` — files in `public/i18n/`, served from the site
   * root — unless the consumer overrides the path).
   * The descriptor still code-splits: the fetch implementation loads only on
   * first resolve.
   */
  private readonly _getLoader = (
    context: LoaderContext,
  ): Promise<TranslationLoader<L>> =>
    this._config.loader
      ? this._config.loader.resolve(context)
      : (jsonLoader().resolve(context) as Promise<TranslationLoader<L>>);
  private _resolvedLoader: TranslationLoader<L> | null = null;
  private readonly _translationsCache = new Map<L, Record<string, unknown>>();
  /**
   * Per-language generation, bumped by `reload()`. A load captures the
   * generation before its request and discards the response when it moved:
   * a stale dictionary can never reach the cache or the signals.
   */
  private readonly _generations = new Map<L, number>();
  private readonly _inflight = new Map<
    L,
    Promise<{ data: Record<string, unknown>; ok: boolean; error?: unknown }>
  >();
  /** Non-background loads in flight; `loadingState` follows this count. */
  private _loadingCount = 0;
  /**
   * Out-of-order safety: a response reaches the visible signals only when it
   * belongs to the currently intended language (`_currentLanguageId()`).
   * Everything else stays cached. (A monotonic request token used to guard
   * this, but it over-constrained legitimate same-language loads.)
   */
  private _applyCount = 0;
  private _initialized = false;
  private readonly _tasks = inject(PendingTasks, { optional: true });

  readonly languageChanged = computed<L>(() => this._currentLanguageId());
  readonly languages = this._languages.asReadonly();
  readonly currentLanguage = this._currentLanguageId.asReadonly();

  readonly currentLanguageObject = computed<Language<L>>(() => {
    const id = this._currentLanguageId();
    return this._languages().find((l) => l.id === id) ?? this._languages()[0];
  });

  readonly dir = computed<Direction>(() => this.currentLanguageObject().dir);
  readonly isRtl = computed<boolean>(() => this.dir() === 'rtl');

  private readonly _loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  private readonly _loadingError = signal<unknown>(null);

  /** Loader state for skeletons/spinners. */
  readonly loadingState = this._loadingState.asReadonly();
  readonly loadingError = this._loadingError.asReadonly();
  readonly isLoading = computed(() => this._loadingState() === 'loading');

  private readonly _ready = signal(false);
  /**
   * True once the initial language content is available (inline seed and/or
   * initial load settled) — or immediately when `preload: false` skips setup
   * loading. Gate first-paint skeletons on this, not on `isLoading`.
   */
  readonly ready = this._ready.asReadonly();

  /**
   * Missing-key reporting. `warnOnMissingKey` defaults to dev-mode warnings
   * unless the consumer supplied a handler (then the handler owns reporting).
   */
  private readonly _warnOnMissingKey: boolean =
    this._config.warnOnMissingKey ??
    (isDevMode() && this._config.onMissingKey === undefined);
  private readonly _missingKeys = signal<readonly string[]>([]);
  private readonly _reportedMissingKeys = new Set<string>();
  private readonly _pendingMissingKeys: string[] = [];
  private readonly _pendingMissingEvents: MissingKeyEvent<L>[] = [];
  private _missingFlushQueued = false;

  /**
   * Keys that could not be resolved from the current dictionary, the fallback
   * dictionary, or a `defaultValue`, in the order they were first looked up.
   * Published in a microtask because `t()` is a `computed` and Angular forbids
   * signal writes inside a computation.
   */
  readonly missingKeys = this._missingKeys.asReadonly();

  /** Resets the report (and the once-per-key dedupe), e.g. after a fix. */
  clearMissingKeys(): void {
    this._reportedMissingKeys.clear();
    this._pendingMissingKeys.length = 0;
    this._pendingMissingEvents.length = 0;
    this._missingKeys.set([]);
  }

  constructor() {
    if (this._config.languages.length === 0) {
      throw new Error(
        '[rivinia/i18n] At least one language must be provided in the languages array.',
      );
    }
    if (!this._config.languages.some((l) => l.id === this._config.defaultLanguage)) {
      throw new Error(
        `[rivinia/i18n] defaultLanguage "${this._config.defaultLanguage}" must be one of the configured language IDs.`,
      );
    }
    if (this._fallbackId !== null && !this._config.languages.some((l) => l.id === this._fallbackId)) {
      throw new Error(
        `[rivinia/i18n] fallbackLanguage "${this._fallbackId}" must be one of the configured language IDs.`,
      );
    }

    effect(() => {
      const id = this._currentLanguageId();
      this._writeStored(id);
    });

    if (this._autoApplyDirection) {
      effect(() => {
        const lang = this.currentLanguageObject();
        const root = this._doc.documentElement;
        if (!root) return;
        root.dir = lang.dir;
        root.lang = lang.id;
      });
    }
  }

  getLanguage(id: L): Language<L> | undefined {
    return this._languages().find((l) => l.id === id);
  }

  /**
   * Runs the provider-setup loading: seeds inline dictionaries, then loads
   * the initial language (unless `preload: false`). Called automatically by
   * the `provideRiviniaI18n` app initializer; call manually only when driving
   * setup yourself. Idempotent. Never rejects (load failures land on
   * `loadingError`/`onLoadError`, inline seeds are preserved).
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    const done = this._tasks?.add();
    try {
      const current = this._currentLanguageId();
      const fallback = this._fallbackId;
      const hasFallback = fallback !== null && fallback !== current;
      const preload = this._config.preload ?? true;

      const transferred = this.readTransfer(current);
      if (transferred) {
        this._translationsCache.set(current, transferred);
        this._loadedTranslations.set(transferred);
      } else {
        const inline = this._config.translations?.[current];
        if (inline) {
          // Instant paint without touching the cache: the refresh below still
          // runs, so a successful loader response wins; on failure the seed
          // stays visible and the error surfaces on loadingState/onLoadError.
          this._loadedTranslations.set(inline);
        }
      }

      let fallbackTransferred: Record<string, unknown> | null = null;
      if (hasFallback) {
        fallbackTransferred = this.readTransfer(fallback);
        if (fallbackTransferred) {
          this._translationsCache.set(fallback, fallbackTransferred);
          this._fallbackDict.set(fallbackTransferred);
        }
      }

      const loads: Array<Promise<unknown>> = [];
      if (!transferred && preload) {
        loads.push(this._loadTranslations(current));
      }
      if (hasFallback && !fallbackTransferred && preload) {
        loads.push(this._loadTranslations(fallback, { silent: true, background: true }));
      }
      await Promise.all(loads);
    } finally {
      this._ready.set(true);
      done?.();
    }
  }

  translate(key: RegisteredI18nKey, defaultValue?: string, params?: TranslateParams): string;
  translate(key: RegisteredI18nKey, params?: TranslateParams): string;
  translate(translations: Translation<L>): string;

  translate(
    keyOrTranslations: RegisteredI18nKey | Translation<L>,
    defaultValueOrParams?: string | TranslateParams,
    maybeParams?: TranslateParams,
  ): string {
    if (typeof keyOrTranslations === 'string') {
      const { defaultValue, params } = normalizeKeyArgs(defaultValueOrParams, maybeParams);
      return this._resolveKeyText(keyOrTranslations, defaultValue, params);
    }
    const currentId = this._currentLanguageId();
    const fallbackId = this._fallbackId;
    return (
      keyOrTranslations[currentId] ??
      (fallbackId !== null ? keyOrTranslations[fallbackId] : undefined) ??
      Object.values(keyOrTranslations)[0] ??
      ''
    );
  }

  /**
   * A `computed` over the same resolution chain as `translate()` — for
   * component fields (`readonly title = i18n.t('home.title')`), not for
   * calling from a template expression on every change detection.
   *
   * A function `params` is invoked inside the computation, so the signals it
   * reads are tracked and a change re-renders the text.
   */
  t(key: RegisteredI18nKey): Signal<string>;
  t(key: RegisteredI18nKey, params: TranslateParams | (() => TranslateParams)): Signal<string>;
  t(
    key: RegisteredI18nKey,
    defaultValue: string,
    params?: TranslateParams | (() => TranslateParams),
  ): Signal<string>;
  t(
    key: RegisteredI18nKey,
    defaultValueOrParams?: string | TranslateParams | (() => TranslateParams),
    maybeParams?: TranslateParams | (() => TranslateParams),
  ): Signal<string> {
    const defaultValue =
      typeof defaultValueOrParams === 'string' ? defaultValueOrParams : undefined;
    const paramsSource =
      typeof defaultValueOrParams === 'string' ? maybeParams : defaultValueOrParams;
    return computed(() => {
      const params = typeof paramsSource === 'function' ? paramsSource() : paramsSource;
      return this._resolveKeyText(key, defaultValue, params);
    });
  }

  private _resolveKeyText(
    key: RegisteredI18nKey,
    defaultValue: string | undefined,
    params: TranslateParams | undefined,
  ): string {
    const resolved = this._lookupKey(key);
    if (resolved !== undefined) {
      return this.render(resolved.text, params, resolved.locale);
    }
    if (defaultValue === undefined) {
      // Reporting reads language signals; keep those reads out of `t()`'s
      // dependency set (the dictionary/locale reads above already track it).
      untracked(() => this._reportMissingKey(key));
    }
    const fallback = defaultValue ?? key;
    return params ? this.render(fallback, params, this.locale()) : fallback;
  }

  loadedTranslations = this._loadedTranslations.asReadonly();

  /** Preload without switching (use in `APP_INITIALIZER` / route guards). */
  async loadTranslations(
    languageId: L,
    opts?: { silent?: boolean },
  ): Promise<Record<string, unknown>> {
    return (await this._loadTranslations(languageId, opts)).data;
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
   *
   * Never rejects: failures land on `loadingState`, `loadingError` and
   * `onLoadError` exactly like `loadTranslations`.
   */
  reload(languageId?: L): Promise<boolean> {
    if (languageId !== undefined) {
      if (!this._languages().some((l) => l.id === languageId)) {
        return Promise.resolve(false);
      }
      this._invalidate(languageId);
      return this._reloadOne(languageId);
    }

    const currentId = this._currentLanguageId();
    const fallbackId = this._fallbackId;

    for (const cachedId of [...this._translationsCache.keys()]) {
      if (cachedId !== currentId && cachedId !== fallbackId) {
        this._translationsCache.delete(cachedId);
      }
    }
    // Every language is superseded, so any response already in flight for a
    // dictionary this reload does not refetch is dropped instead of cached.
    for (const language of this._languages()) {
      this._invalidate(language.id);
    }

    const currentLoad = this._reloadOne(currentId);
    if (fallbackId !== null && fallbackId !== currentId) {
      void this._reloadOne(fallbackId);
    }
    return currentLoad;
  }

  private _reloadOne(languageId: L): Promise<boolean> {
    return this._loadTranslations(languageId, {
      force: true,
      // A dictionary that is not on screen must not drive loadingState.
      background: languageId !== this._currentLanguageId(),
    }).then((result) => result.ok);
  }

  private _generationOf(languageId: L): number {
    return this._generations.get(languageId) ?? 0;
  }

  private _invalidate(languageId: L): void {
    this._generations.set(languageId, this._generationOf(languageId) + 1);
  }

  toggle(): void {
    const langs = this._languages();
    if (langs.length < 2) return;
    const currentId = this._currentLanguageId();
    const newId = currentId === langs[0].id ? langs[1].id : langs[0].id;
    this.applyLanguage(newId);
  }

  next(): void {
    const langs = this._languages();
    if (langs.length < 2) return;
    const currentIdx = langs.findIndex((l) => l.id === this._currentLanguageId());
    const nextIdx = (currentIdx + 1) % langs.length;
    this.applyLanguage(langs[nextIdx].id);
  }

  previous(): void {
    const langs = this._languages();
    if (langs.length < 2) return;
    const currentIdx = langs.findIndex((l) => l.id === this._currentLanguageId());
    const prevIdx = (currentIdx - 1 + langs.length) % langs.length;
    this.applyLanguage(langs[prevIdx].id);
  }

  setLanguage(id: L): void {
    if (this._config.switchStrategy === 'preload-first') {
      void this.setLanguageAsync(id);
      return;
    }
    this.applyLanguage(id);
  }

  /** Preload-first switch: await the dictionary, then flip — no raw-key flash.
   * A failed load aborts: language, direction and dictionary stay untouched. */
  async setLanguageAsync(id: L): Promise<void> {
    if (id === this._currentLanguageId()) return;
    if (!this._languages().some((l) => l.id === id)) return;
    const { ok } = await this._loadTranslations(id, { silent: true });
    if (!ok) return;
    this.applyLanguage(id);
  }

  /** Number formatting bound to the current language locale (cached Intl). */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.numberFormatter(options).format(value);
  }

  /** Date/time formatting bound to the current language locale (cached Intl). */
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this.dateTimeFormatter(options).format(value);
  }

  /** BCP-47 locale driving Intl + ICU plural rules (falls back to the id). */
  readonly locale = computed<string>(() => {
    return this.currentLanguageObject().locale ?? this._currentLanguageId();
  });

  private readonly _formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

  private numberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `n|${this.locale()}|${JSON.stringify(options ?? null)}`;
    let formatter = this._formatters.get(key) as Intl.NumberFormat | undefined;
    if (!formatter) {
      formatter = new Intl.NumberFormat(this.locale(), options);
      this._formatters.set(key, formatter);
    }
    return formatter;
  }

  private dateTimeFormatter(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `d|${this.locale()}|${JSON.stringify(options ?? null)}`;
    let formatter = this._formatters.get(key) as Intl.DateTimeFormat | undefined;
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(this.locale(), options);
      this._formatters.set(key, formatter);
    }
    return formatter;
  }

  private applyLanguage(id: L, opts?: { skipLoad?: boolean }): void {
    if (id === this._currentLanguageId()) return;

    const lang = this._languages().find((l) => l.id === id);
    if (!lang) return;

    this._applyCount++;

    const apply = () => this._currentLanguageId.set(id);
    const vt = this._config.viewTransition;
    const useTransition =
      vt?.enabled &&
      (!vt.skipInitialTransition || this._applyCount > 1) &&
      this._viewTransition != null;

    if (useTransition) {
      vt!.onViewTransitionCreated?.({ language: id, direction: lang.dir });
      this._viewTransition!.run(apply);
    } else {
      apply();
    }

    if (!opts?.skipLoad) {
      void this._loadTranslations(id);
      this._ensureFallback();
    }
  }

  private render(template: string, params: TranslateParams | undefined, locale: string): string {
    if (!params) return template;
    if (!template.includes('{')) return template;
    try {
      return formatIcu(template, params, locale);
    } catch {
      return template;
    }
  }

  /**
   * Current dictionary first, then the fallback dictionary. The returned
   * locale belongs to the dictionary the text came from: an English plural
   * template borrowed by an Arabic UI must use English plural rules.
   */
  private _lookupKey(key: string): { text: string; locale: string } | undefined {
    const currentValue = this._resolveKey(this._loadedTranslations(), key);
    if (currentValue !== undefined) {
      return { text: currentValue, locale: this.locale() };
    }
    const fallbackId = this._fallbackId;
    if (fallbackId === null || fallbackId === this._currentLanguageId()) return undefined;
    const fallbackDict =
      this._fallbackDict() ?? this._config.translations?.[fallbackId] ?? null;
    if (!fallbackDict) return undefined;
    const fallbackValue = this._resolveKey(fallbackDict, key);
    if (fallbackValue === undefined) return undefined;
    return { text: fallbackValue, locale: this._localeOf(fallbackId) };
  }

  private _localeOf(languageId: L): string {
    return this._languages().find((l) => l.id === languageId)?.locale ?? languageId;
  }

  /** Loads the fallback in the background when it is not cached yet. */
  private _ensureFallback(): void {
    const fallbackId = this._fallbackId;
    if (fallbackId === null || fallbackId === this._currentLanguageId()) return;
    if (this._hasDictionary(fallbackId)) return;
    void this._loadTranslations(fallbackId, { silent: true, background: true });
  }

  private _hasDictionary(languageId: L): boolean {
    return (
      this._translationsCache.has(languageId) ||
      this._config.translations?.[languageId] !== undefined
    );
  }

  /**
   * Records a key no dictionary could resolve. Once per key per session; the
   * signal write is deferred to a microtask so `t()` can stay a pure
   * `computed` (Angular forbids signal writes inside a computation).
   */
  private _reportMissingKey(key: string): void {
    // Before the current language has a dictionary, every key would be a false
    // positive — the load is still in flight, or it failed and there is
    // nothing to look a key up in.
    if (!this._hasDictionary(this._currentLanguageId())) return;
    if (this._reportedMissingKeys.has(key)) return;
    this._reportedMissingKeys.add(key);

    const language = this._currentLanguageId();
    const fallbackLanguage = this._fallbackId;
    const event: MissingKeyEvent<L> =
      fallbackLanguage === null ? { key, language } : { key, language, fallbackLanguage };

    this._pendingMissingKeys.push(key);
    this._pendingMissingEvents.push(event);
    this._queueMissingFlush();

    if (this._warnOnMissingKey) {
      console.warn(
        `[rivinia/i18n] Missing key "${key}" for language "${language}"` +
          (fallbackLanguage === null
            ? '.'
            : ` (fallback "${fallbackLanguage}" has no value either).`),
      );
    }
  }

  private _queueMissingFlush(): void {
    if (this._missingFlushQueued) return;
    this._missingFlushQueued = true;
    queueMicrotask(() => {
      this._missingFlushQueued = false;
      const pending = this._pendingMissingKeys.splice(0);
      if (pending.length === 0) return;
      this._missingKeys.update((current) => [...current, ...pending]);
      // The handler runs here, not inside `t()`'s computation: it may write a
      // signal, and a signal write inside a computed throws NG0600.
      const events = this._pendingMissingEvents.splice(0);
      for (const event of events) this._config.onMissingKey?.(event);
    });
  }

  private async _loadTranslations(
    languageId: L,
    opts?: { silent?: boolean; background?: boolean; force?: boolean },
  ): Promise<{ data: Record<string, unknown>; ok: boolean }> {
    // Background loads (the fallback dictionary) must never drive
    // `loadingState`/`loadingError`: the visible language is what the UI needs.
    const background = opts?.background === true;

    // `force` is the reload path: the cache must not answer it, and a load
    // already in flight for the same language is superseded, not joined.
    if (!opts?.force) {
      const cached = this._translationsCache.get(languageId);
      if (cached) {
        this._applyDictionary(languageId, cached);
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
      task = this._fetchDictionary(languageId, this._generationOf(languageId));
      this._inflight.set(languageId, task);
    }

    if (!background) {
      this._loadingCount++;
      this._loadingState.set('loading');
    }

    try {
      const result = await task;
      if (result.ok) {
        this._applyDictionary(languageId, result.data);
      } else if (
        !background &&
        result.error !== undefined &&
        languageId === this._currentLanguageId()
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
   * A dictionary reaches the visible signals only when its language is
   * current at resolution time; a fallback dictionary fills the fallback slot.
   * Everything else stays cached for the next switch.
   */
  private _applyDictionary(languageId: L, data: Record<string, unknown>): void {
    if (languageId === this._currentLanguageId()) {
      this._loadedTranslations.set(data);
      this._loadingError.set(null);
    }
    if (languageId === this._fallbackId) {
      this._fallbackDict.set(data);
    }
  }

  /** Fetch + cache + transfer. Shared by every caller; never applies. */
  private _fetchDictionary(
    languageId: L,
    generation: number,
  ): Promise<{ data: Record<string, unknown>; ok: boolean; error?: unknown }> {
    let task!: Promise<{ data: Record<string, unknown>; ok: boolean; error?: unknown }>;
    task = (async () => {
      const stale = (): boolean => this._generationOf(languageId) !== generation;
      try {
        if (!this._resolvedLoader) {
          this._resolvedLoader = await this._getLoader(this.loaderContext);
        }
        const translations = await this._resolvedLoader.load(languageId, this.loaderContext);

        // A superseded response touches nothing: no cache, no transfer state,
        // no signals, no error reporting.
        if (stale()) return { data: {}, ok: false };

        this._translationsCache.set(languageId, translations);
        this.writeTransfer(languageId, translations);
        return { data: translations, ok: true };
      } catch (error) {
        if (stale()) return { data: {}, ok: false };
        // Once per failed fetch, however many callers joined it.
        this._config.onLoadError?.(languageId, error);
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

  /**
   * Reads the persisted language. Cookie strategy: server reads the request
   * `Cookie` header (no hydration mismatch), browser reads `document.cookie`.
   * Everything else delegates to the SSR-safe storage helpers.
   */
  private _readStored(): string | null {
    if (this._storageStrategy === 'cookie') {
      const header = this._request?.headers.get('cookie') ?? null;
      if (header !== null) return parseCookie(header, this._storageKey);
      try {
        return parseCookie(this._doc.cookie, this._storageKey);
      } catch {
        return null;
      }
    }
    return safeGetItem(this._storageKey, this._storageStrategy);
  }

  /** Persists the language. Server never writes (response cookies are app-owned). */
  private _writeStored(id: L): void {
    if (this._storageStrategy === 'cookie') {
      if (this._request) return;
      try {
        const location = (
          this._doc as unknown as { location?: { protocol?: string; hostname?: string } }
        )?.location;
        this._doc.cookie = serializeCookie(this._storageKey, id, {
          secure: shouldSecureCookie(location),
        });
      } catch {
        // Best-effort persistence.
      }
      return;
    }
    safeSetItem(this._storageKey, id, this._storageStrategy);
  }

  private transferKey(languageId: L): StateKey<Record<string, unknown>> {
    return makeStateKey<Record<string, unknown>>(`rivinia.i18n.dict.${languageId}`);
  }

  /** Consumes server-rendered dictionaries so the client never refetches. */
  private readTransfer(languageId: L): Record<string, unknown> | null {
    const transfer = this._transfer;
    if (!transfer) return null;
    const key = this.transferKey(languageId);
    if (!transfer.hasKey(key)) return null;
    const dict = transfer.get(key, null);
    transfer.remove(key);
    return dict;
  }

  /** Stores freshly loaded dictionaries for hydration (server only). */
  private writeTransfer(languageId: L, dict: Record<string, unknown>): void {
    if (!this._request) return;
    this._transfer?.set(this.transferKey(languageId), dict);
  }

  private _resolveKey(obj: Record<string, unknown>, path: string): string | undefined {
    const value = path
      .split('.')
      .reduce<unknown>(
        (acc, segment) =>
          acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[segment] : undefined,
        obj,
      );
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
  }

  private _resolveInitialLanguage(): L {
    const stored = this._readStored();
    if (stored && this._config.languages.some((l) => l.id === stored)) {
      return stored as L;
    }
    if (this._config.detectBrowser) {
      const detected = detectBrowserLanguage(
        this._config.languages.map((l) => l.id),
        browserLanguages(),
      );
      if (detected) return detected;
    }
    return this._config.defaultLanguage;
  }
}

function normalizeKeyArgs(
  second?: string | TranslateParams,
  third?: TranslateParams,
): { defaultValue?: string; params?: TranslateParams } {
  if (second && typeof second === 'object') {
    return { params: second };
  }
  return { defaultValue: second, params: third };
}

import {
  DOCUMENT,
  PendingTasks,
  REQUEST,
  Service,
  TransferState,
  computed,
  inject,
  isDevMode,
  signal,
  untracked,
  type Signal,
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
import type { TranslateParams } from '../models/i18n-types';
import type { Translation } from '../models/i18n-types';
import type { TranslationLoader } from '../models/loaders';
import type { LoaderContext } from '../models/loaders';
import type { MissingKeyEvent, MissingParamEvent } from '../models/missing-key';
import type { RegisteredI18nKey } from '../models/typed-keys';
import { jsonLoader } from '../models/loaders';
import { createLoaderContext } from '../utils/loader-context';
import { browserLanguages } from '../utils/i18n-utils';
import { DocumentDirectionApplier } from './document-direction-applier';
import { DictionaryStore } from './dictionary-store';
import { LanguageStorage } from './language-storage';
import { MissingKeyReporter } from './missing-key-reporter';
import { MessageFormatter } from './message-formatter';
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

  private readonly _direction = new DocumentDirectionApplier<L>({
    document: this._doc,
    viewTransition: this._viewTransition,
    config: this._config.viewTransition,
  });

  /**
   * Platform facts for loaders, built once: `REQUEST` + `<base href>` on the
   * server, `document.baseURI` in the browser. This is what makes the default
   * loader work under SSR instead of fetching a relative URL Node cannot parse.
   */
  readonly loaderContext: LoaderContext = createLoaderContext(this._request ?? null, this._doc);

  /** Declared before the storage collaborator: it reads this during setup. */
  private readonly _languages = signal<readonly Language<L>[]>(this._config.languages);

  private readonly _languageStorage = new LanguageStorage<L>({
    key: this._config.storageKey ?? DEFAULT_STORAGE_KEY,
    strategy: this._config.storageStrategy ?? DEFAULT_STORAGE_STRATEGY,
    languages: () => this._languages(),
    defaultLanguage: this._config.defaultLanguage,
    detectBrowser: this._config.detectBrowser ?? false,
    document: this._doc,
    request: this._request ?? null,
    // Writes reach storage/cookies only after an explicit switch (RIV-17).
    persist: this._config.persist ?? true,
    browserLanguages,
  });

  private readonly _currentLanguageId = signal<L>(
    this._languageStorage.resolveInitialLanguage(),
  );

  private readonly _store = new DictionaryStore<L>({
    // Explicit loader wins; otherwise the conventional JSON layout
    // (`i18n/{language}.json`, served from the site root) unless the consumer
    // overrides the path. The descriptor still code-splits: the fetch
    // implementation loads only on first resolve.
    loader: (context) =>
      this._config.loader
        ? this._config.loader.resolve(context)
        : (jsonLoader().resolve(context) as Promise<TranslationLoader<L>>),
    loaderContext: this.loaderContext,
    request: this._request ?? null,
    transfer: this._transfer,
    onLoadError: this._config.onLoadError,
    currentLanguage: () => this._currentLanguageId(),
    fallbackLanguage: this._fallbackId,
    languageIds: () => this._languages().map((l) => l.id),
    hasInline: (languageId) => this._config.translations?.[languageId] !== undefined,
  });

  private _initialized = false;
  private readonly _tasks = inject(PendingTasks, { optional: true });

  readonly languages = this._languages.asReadonly();
  readonly currentLanguage = this._currentLanguageId.asReadonly();

  readonly currentLanguageObject = computed<Language<L>>(() => {
    const id = this._currentLanguageId();
    return this._languages().find((l) => l.id === id) ?? this._languages()[0];
  });

  readonly dir = computed<Direction>(() => this.currentLanguageObject().dir);
  readonly isRtl = computed<boolean>(() => this.dir() === 'rtl');

  /** Loader state for skeletons/spinners. */
  readonly loadingState = this._store.loadingState;
  readonly loadingError = this._store.loadingError;
  readonly isLoading = computed(() => this._store.loadingState() === 'loading');

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
  private readonly _missingKeyReporter = new MissingKeyReporter<L>({
    language: () => this._currentLanguageId(),
    fallbackLanguage: this._fallbackId,
    hasDictionary: (language) => this._hasDictionary(language),
    onMissingKey: this._config.onMissingKey,
    onMissingParam: this._config.onMissingParam,
    warnOnMissingKey:
      this._config.warnOnMissingKey ??
      (isDevMode() && this._config.onMissingKey === undefined),
    warnOnMissingParam:
      this._config.warnOnMissingParam ??
      (isDevMode() && this._config.onMissingParam === undefined),
  });

  /**
   * Keys that could not be resolved from the current dictionary, the fallback
   * dictionary, or a `defaultValue`, in the order they were first looked up.
   * Published in a microtask because `t()` is a `computed` and Angular forbids
   * signal writes inside a computation.
   */
  readonly missingKeys = this._missingKeyReporter.missingKeys;

  /** Resets the report (and the once-per-key dedupe), e.g. after a fix. */
  clearMissingKeys(): void {
    this._missingKeyReporter.clearKeys();
  }

  /** Resets the missing-parameter dedupe, e.g. after adding the argument. */
  clearMissingParams(): void {
    this._missingKeyReporter.clearParams();
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

    if (this._autoApplyDirection) {
      this._direction.install(() => this.currentLanguageObject());
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

      const transferred = this._store.consumeTransfer(current);
      if (transferred) {
        this._store.adoptTransferred(current, transferred);
      } else {
        const inline = this._config.translations?.[current];
        if (inline) {
          // Instant paint without touching the cache: the refresh below still
          // runs, so a successful loader response wins; on failure the seed
          // stays visible and the error surfaces on loadingState/onLoadError.
          this._store.seedVisible(inline);
        }
      }

      let fallbackTransferred: Record<string, unknown> | null = null;
      if (hasFallback) {
        fallbackTransferred = this._store.consumeTransfer(fallback);
        if (fallbackTransferred) {
          this._store.adoptTransferred(fallback, fallbackTransferred);
        }
      }

      const loads: Array<Promise<unknown>> = [];
      if (!transferred && preload) {
        loads.push(this._store.load(current));
      }
      if (hasFallback && !fallbackTransferred && preload) {
        loads.push(this._store.load(fallback, { background: true }));
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
      return this.render(resolved.text, params, resolved.locale, key);
    }
    if (defaultValue === undefined) {
      // Reporting reads language signals; keep those reads out of `t()`'s
      // dependency set (the dictionary/locale reads above already track it).
      untracked(() => this._reportMissingKey(key));
    }
    const fallback = defaultValue ?? key;
    return params ? this.render(fallback, params, this.locale(), key) : fallback;
  }

  readonly loadedTranslations = this._store.visible;

  /** Preload without switching (use in `APP_INITIALIZER` / route guards). */
  async loadTranslations(languageId: L): Promise<Record<string, unknown>> {
    return (await this._store.load(languageId)).data;
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
    return this._store.reload(languageId);
  }

  /**
   * Flips between the first two configured languages. Documentation and
   * templates commonly place it next to `next()`/`previous()`, so it warns in
   * dev mode when more than two languages are configured — use the cycling
   * methods there.
   */
  toggle(): void {
    const langs = this._languages();
    if (langs.length < 2) return;
    if (langs.length > 2 && isDevMode()) {
      console.warn(
        '[rivinia/i18n] toggle() only flips the first two languages; ' +
          'use next()/previous() when more than two are configured.',
      );
    }
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
    const { ok } = await this._store.load(id);
    if (!ok) return;
    this.applyLanguage(id);
  }

  /** Number formatting bound to the current language locale (cached Intl). */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this._messageFormatter.formatNumber(value, options);
  }

  /** Date/time formatting bound to the current language locale (cached Intl). */
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this._messageFormatter.formatDate(value, options);
  }

  /** BCP-47 locale driving Intl + ICU plural rules (falls back to the id). */
  readonly locale = computed<string>(() => {
    return this.currentLanguageObject().locale ?? this._currentLanguageId();
  });

  private readonly _messageFormatter = new MessageFormatter({
    locale: () => this.locale(),
    onMissingParam: (key, name) => untracked(() => this._reportMissingParam(key, name)),
  });

  private applyLanguage(id: L, opts?: { skipLoad?: boolean }): void {
    if (id === this._currentLanguageId()) return;

    const lang = this._languages().find((l) => l.id === id);
    if (!lang) return;

    this._direction.apply(lang, () => this._currentLanguageId.set(id));

    if (!opts?.skipLoad) {
      void this._store.load(id);
      this._store.ensureFallback();
    }

    // Explicit switch only (RIV-17): the initial language is never written.
    this._languageStorage.persistAfterSwitch(id);
  }

  private render(
    template: string,
    params: TranslateParams | undefined,
    locale: string,
    key: string,
  ): string {
    return this._messageFormatter.render(template, params, locale, key);
  }

  /**
   * Current dictionary first, then the fallback dictionary. The returned
   * locale belongs to the dictionary the text came from: an English plural
   * template borrowed by an Arabic UI must use English plural rules.
   */
  private _lookupKey(key: string): { text: string; locale: string } | undefined {
    const currentValue = this._resolveKey(this._store.visible(), key);
    if (currentValue !== undefined) {
      return { text: currentValue, locale: this.locale() };
    }
    const fallbackId = this._fallbackId;
    if (fallbackId === null || fallbackId === this._currentLanguageId()) return undefined;
    const fallbackDict =
      this._store.fallback() ?? this._config.translations?.[fallbackId] ?? null;
    if (!fallbackDict) return undefined;
    const fallbackValue = this._resolveKey(fallbackDict, key);
    if (fallbackValue === undefined) return undefined;
    return { text: fallbackValue, locale: this._localeOf(fallbackId) };
  }

  private _localeOf(languageId: L): string {
    return this._languages().find((l) => l.id === languageId)?.locale ?? languageId;
  }

  private _hasDictionary(languageId: L): boolean {
    return this._store.has(languageId);
  }

  /**
   * Records a key no dictionary could resolve. Once per key per session; the
   * reporter defers the signal write so `t()` can stay a pure `computed`.
   */
  private _reportMissingKey(key: string): void {
    this._missingKeyReporter.reportKey(key);
  }

  /**
   * Mirrors `_reportMissingKey` for absent message arguments. The output keeps
   * the placeholder; this only records/warns, once per (key, param) pair. The
   * hook is deferred to a microtask for the same NG0600 reason.
   */
  private _reportMissingParam(key: string, param: string): void {
    this._missingKeyReporter.reportParam(key, param);
  }

  /**
   * Exact key first, then the nested walk. Exports from some tools keep the
   * dot in the key (`{ "app.title": "x" }`); on a collision the flat key wins.
   */
  private _resolveKey(obj: Record<string, unknown>, path: string): string | undefined {
    const value = Object.prototype.hasOwnProperty.call(obj, path)
      ? obj[path]
      : path
          .split('.')
          .reduce<unknown>(
            (acc, segment) =>
              acc && typeof acc === 'object'
                ? (acc as Record<string, unknown>)[segment]
                : undefined,
            obj,
          );
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
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

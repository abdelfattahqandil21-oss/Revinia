import {
  DOCUMENT,
  PendingTasks,
  REQUEST,
  Service,
  TransferState,
  computed,
  effect,
  inject,
  makeStateKey,
  signal,
  type StateKey,
} from '@angular/core';
import {
  DEFAULT_AUTO_APPLY_DIRECTION,
  DEFAULT_STORAGE_KEY,
  DEFAULT_STORAGE_STRATEGY,
  RIVINIA_I18N_CONFIG,
  type RiviniaI18nConfig,
} from './i18n-config';
import type { Direction } from './i18n-types';
import type { Language } from './i18n-types';
import type { StorageStrategy } from './i18n-types';
import type { TranslateParams } from './i18n-types';
import type { Translation } from './i18n-types';
import type { TranslationLoader } from './loaders';
import { jsonLoader } from './loaders';
import { browserLanguages, detectBrowserLanguage, safeGetItem, safeSetItem } from './i18n-utils';
import { parseCookie, serializeCookie } from './cookies';
import { formatIcu } from './icu';
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
  /**
   * Injected (not global) document: the dir/lang effect renders on the
   * server too, avoiding an RTL first-paint shift on hydration.
   * Declared before any field initializer that reads storage.
   */
  private readonly _doc = inject(DOCUMENT);
  /** Present only on the server: used for cookie reads + transfer writes. */
  private readonly _request = inject(REQUEST, { optional: true });
  private readonly _transfer = inject(TransferState, { optional: true });

  private readonly _currentLanguageId = signal<L>(this._resolveInitialLanguage());
  private readonly _languages = signal<readonly Language<L>[]>(this._config.languages);
  private readonly _loadedTranslations = signal<Record<string, unknown>>({});
  /**
   * Explicit loader wins; otherwise the conventional JSON layout
   * (`i18n/{language}.json` — files in `public/i18n/`, served from the site
   * root — unless the consumer overrides the path).
   * The descriptor still code-splits: the fetch implementation loads only on
   * first resolve.
   */
  private readonly _getLoader: () => Promise<TranslationLoader<L>> =
    this._config.loader?.resolve ?? (() => jsonLoader().resolve() as Promise<TranslationLoader<L>>);
  private _resolvedLoader: TranslationLoader<L> | null = null;
  private readonly _translationsCache = new Map<L, Record<string, unknown>>();
  private readonly _inflight = new Map<L, Promise<{ data: Record<string, unknown>; ok: boolean }>>();
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

  constructor() {
    if (this._config.languages.length === 0) {
      throw new Error('[rivinia/i18n] At least one language must be provided in the languages array.');
    }
    if (!this._config.languages.some((l) => l.id === this._config.defaultLanguage)) {
      throw new Error(
        `[rivinia/i18n] defaultLanguage "${this._config.defaultLanguage}" must be one of the configured language IDs.`,
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
        if (this._config.preload ?? true) {
          await this._loadTranslations(current);
        }
      }
    } finally {
      this._ready.set(true);
      done?.();
    }
  }

  translate(key: string, defaultValue?: string, params?: TranslateParams): string;
  translate(key: string, params?: TranslateParams): string;
  translate(translations: Translation<L>): string;

  translate(
    keyOrTranslations: string | Translation<L>,
    defaultValueOrParams?: string | TranslateParams,
    maybeParams?: TranslateParams,
  ): string {
    if (typeof keyOrTranslations === 'string') {
      const { defaultValue, params } = normalizeKeyArgs(defaultValueOrParams, maybeParams);
      const loaded = this._loadedTranslations();
      const resolved = this._resolveKey(loaded, keyOrTranslations);
      if (resolved !== undefined) {
        return this.render(resolved, params);
      }
      const fallback = defaultValue ?? keyOrTranslations;
      return params ? this.render(fallback, params) : fallback;
    }
    const currentId = this._currentLanguageId();
    return keyOrTranslations[currentId] ?? Object.values(keyOrTranslations)[0] ?? '';
  }

  loadedTranslations = this._loadedTranslations.asReadonly();

  /** Preload without switching (use in `APP_INITIALIZER` / route guards). */
  async loadTranslations(
    languageId: L,
    opts?: { silent?: boolean },
  ): Promise<Record<string, unknown>> {
    return (await this._loadTranslations(languageId, opts)).data;
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
    }
  }

  private render(template: string, params?: TranslateParams): string {
    if (!params) return template;
    if (!template.includes('{')) return template;
    try {
      return formatIcu(template, params, this.locale());
    } catch {
      return template;
    }
  }

  private async _loadTranslations(
    languageId: L,
    opts?: { silent?: boolean },
  ): Promise<{ data: Record<string, unknown>; ok: boolean }> {
    // A dictionary only ever reaches the visible signals when it belongs to
    // the currently intended language. Anything else (slow out-of-order
    // responses, explicit preloads of other languages) stays cached.
    const current = (): boolean => languageId === this._currentLanguageId();
    const cached = this._translationsCache.get(languageId);
    if (cached) {
      if (!opts?.silent && current()) {
        this._loadedTranslations.set(cached);
      }
      return { data: cached, ok: true };
    }

    const inflight = this._inflight.get(languageId);
    if (inflight) return inflight;

    this._loadingState.set('loading');

    const task: Promise<{ data: Record<string, unknown>; ok: boolean }> = (async () => {
      try {
        if (!this._resolvedLoader) {
          this._resolvedLoader = await this._getLoader!();
        }
        const translations = await this._resolvedLoader.load(languageId);

        this._translationsCache.set(languageId, translations);
        this.writeTransfer(languageId, translations);

        if (!opts?.silent && current()) {
          this._loadedTranslations.set(translations);
          this._loadingError.set(null);
          this._loadingState.set('idle');
        }

        return { data: translations, ok: true };
      } catch (error) {
        if (current()) {
          this._loadingError.set(error);
          this._loadingState.set('error');
        }
        this._config.onLoadError?.(languageId, error);
        return { data: {}, ok: false };
      } finally {
        this._inflight.delete(languageId);
        if (this._inflight.size === 0 && this._loadingState() === 'loading') {
          this._loadingState.set('idle');
        }
      }
    })();

    this._inflight.set(languageId, task);
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
        this._doc.cookie = serializeCookie(this._storageKey, id);
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
    const value = path.split('.').reduce<unknown>(
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

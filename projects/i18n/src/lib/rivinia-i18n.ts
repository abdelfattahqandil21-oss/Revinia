import { Service, computed, effect, inject, signal } from '@angular/core';
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

  private readonly _currentLanguageId = signal<L>(this._resolveInitialLanguage());
  private readonly _languages = signal<readonly Language<L>[]>(this._config.languages);
  private readonly _loadedTranslations = signal<Record<string, unknown>>({});
  /**
   * Explicit loader wins; otherwise the conventional JSON layout
   * (`assets/i18n/{language}.json` unless the consumer overrides the path).
   * The descriptor still code-splits: the fetch implementation loads only on
   * first resolve.
   */
  private readonly _getLoader: () => Promise<TranslationLoader<L>> =
    this._config.loader?.resolve ?? (() => jsonLoader().resolve() as Promise<TranslationLoader<L>>);
  private _resolvedLoader: TranslationLoader<L> | null = null;
  private readonly _translationsCache = new Map<L, Record<string, unknown>>();
  private readonly _inflight = new Map<L, Promise<Record<string, unknown>>>();
  /**
   * Last-request-wins guard for rapid switches: each load captures a token;
   * stale out-of-order responses stay cached but never overwrite the signal.
   */
  private _requestToken = 0;
  private _applyCount = 0;

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
      safeSetItem(this._storageKey, id, this._storageStrategy);
    });

    if (this._autoApplyDirection) {
      effect(() => {
        if (typeof document === 'undefined') {
          return;
        }
        const lang = this.currentLanguageObject();
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = lang.id;
      });
    }
  }

  getLanguage(id: L): Language<L> | undefined {
    return this._languages().find((l) => l.id === id);
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
    return this._loadTranslations(languageId, opts);
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

  /** Preload-first switch: await the dictionary, then flip — no raw-key flash. */
  async setLanguageAsync(id: L): Promise<void> {
    if (id === this._currentLanguageId()) return;
    if (!this._languages().some((l) => l.id === id)) return;
    await this._loadTranslations(id, { silent: true });
    this.applyLanguage(id);
  }

  /** Number formatting bound to the current language (pure Intl wrapper). */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this._currentLanguageId(), options).format(value);
  }

  /** Date/time formatting bound to the current language (pure Intl wrapper). */
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this._currentLanguageId(), options).format(value);
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
      return formatIcu(template, params, this._currentLanguageId());
    } catch {
      return template;
    }
  }

  private async _loadTranslations(
    languageId: L,
    opts?: { silent?: boolean },
  ): Promise<Record<string, unknown>> {
    const cached = this._translationsCache.get(languageId);
    if (cached) {
      if (!opts?.silent) {
        this._loadedTranslations.set(cached);
      }
      return cached;
    }

    const inflight = this._inflight.get(languageId);
    if (inflight) return inflight;

    const myToken = ++this._requestToken;
    this._loadingState.set('loading');

    const task = (async () => {
      try {
        if (!this._resolvedLoader) {
          this._resolvedLoader = await this._getLoader!();
        }
        const translations = await this._resolvedLoader.load(languageId);

        this._translationsCache.set(languageId, translations);

        if (myToken === this._requestToken && !opts?.silent) {
          this._loadedTranslations.set(translations);
          this._loadingError.set(null);
          this._loadingState.set('idle');
        }

        return translations;
      } catch (error) {
        if (myToken === this._requestToken) {
          this._loadingError.set(error);
          this._loadingState.set('error');
        }
        this._config.onLoadError?.(languageId, error);
        return {};
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
    const stored = safeGetItem(this._storageKey, this._storageStrategy);
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

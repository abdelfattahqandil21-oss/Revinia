import { signal, type Signal } from '@angular/core';
import type { MissingKeyEvent, MissingParamEvent } from '../models/missing-key';

export interface MissingKeyReporterDeps<L extends string> {
  /** Read when the event is created; the facade supplies it untracked. */
  readonly language: () => L;
  readonly fallbackLanguage: L | null;
  /** A key is not "missing" while its language has no dictionary yet. */
  readonly hasDictionary: (language: L) => boolean;
  readonly onMissingKey?: (event: MissingKeyEvent<L>) => void;
  readonly onMissingParam?: (event: MissingParamEvent<L>) => void;
  readonly warnOnMissingKey: boolean;
  readonly warnOnMissingParam: boolean;
}

/**
 * Records unresolved keys and absent message arguments once per session and
 * publishes them from a microtask: `t()` is a `computed`, and both the signal
 * write and the user callback must stay outside the computation (RIV-05).
 */
export class MissingKeyReporter<L extends string> {
  private readonly _missingKeys = signal<readonly string[]>([]);
  private readonly _reportedKeys = new Set<string>();
  private readonly _pendingKeys: string[] = [];
  private readonly _pendingKeyEvents: MissingKeyEvent<L>[] = [];
  private _keyFlushQueued = false;

  /** Dedupe key: `key` + NUL + `param`, so neither part can collide. */
  private readonly _reportedParams = new Set<string>();
  private readonly _pendingParamEvents: MissingParamEvent<L>[] = [];
  private _paramFlushQueued = false;

  readonly missingKeys: Signal<readonly string[]> = this._missingKeys.asReadonly();

  constructor(private readonly _deps: MissingKeyReporterDeps<L>) {}

  reportKey(key: string): void {
    // Before the current language has a dictionary, every key would be a false
    // positive — the load is still in flight, or it failed and there is
    // nothing to look a key up in.
    if (!this._deps.hasDictionary(this._deps.language())) return;
    if (this._reportedKeys.has(key)) return;
    this._reportedKeys.add(key);

    const language = this._deps.language();
    const fallbackLanguage = this._deps.fallbackLanguage;
    this._pendingKeys.push(key);
    this._pendingKeyEvents.push(
      fallbackLanguage === null ? { key, language } : { key, language, fallbackLanguage },
    );
    this._queueKeyFlush();

    if (this._deps.warnOnMissingKey) {
      console.warn(
        `[rivinia/i18n] Missing key "${key}" for language "${language}"` +
          (fallbackLanguage === null
            ? '.'
            : ` (fallback "${fallbackLanguage}" has no value either).`),
      );
    }
  }

  reportParam(key: string, param: string): void {
    const dedupe = `${key}\u0000${param}`;
    if (this._reportedParams.has(dedupe)) return;
    this._reportedParams.add(dedupe);

    const language = this._deps.language();
    this._pendingParamEvents.push({ key, param, language });
    this._queueParamFlush();

    if (this._deps.warnOnMissingParam) {
      console.warn(
        `[rivinia/i18n] Missing parameter "${param}" for key "${key}" ` +
          `and language "${language}"; the placeholder was kept.`,
      );
    }
  }

  /** Resets the report (and the once-per-key dedupe), e.g. after a fix. */
  clearKeys(): void {
    this._reportedKeys.clear();
    this._pendingKeys.length = 0;
    this._pendingKeyEvents.length = 0;
    this._missingKeys.set([]);
  }

  /** Resets the missing-parameter dedupe, e.g. after adding the argument. */
  clearParams(): void {
    this._reportedParams.clear();
    this._pendingParamEvents.length = 0;
  }

  private _queueKeyFlush(): void {
    if (this._keyFlushQueued) return;
    this._keyFlushQueued = true;
    queueMicrotask(() => {
      this._keyFlushQueued = false;
      const pending = this._pendingKeys.splice(0);
      if (pending.length === 0) return;
      this._missingKeys.update((current) => [...current, ...pending]);
      // The handler runs here, not inside `t()`'s computation: it may write a
      // signal, and a signal write inside a computed throws NG0600.
      const events = this._pendingKeyEvents.splice(0);
      for (const event of events) this._deps.onMissingKey?.(event);
    });
  }

  private _queueParamFlush(): void {
    if (this._paramFlushQueued) return;
    this._paramFlushQueued = true;
    queueMicrotask(() => {
      this._paramFlushQueued = false;
      const events = this._pendingParamEvents.splice(0);
      for (const event of events) this._deps.onMissingParam?.(event);
    });
  }
}

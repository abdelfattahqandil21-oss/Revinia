import { effect } from '@angular/core';
import type { Language, ViewTransitionConfig, ViewTransitionInfo } from '../models/i18n-types';
import type { ViewTransitionService } from './view-transition.service';

export interface DocumentDirectionApplierDeps {
  readonly document: Document;
  readonly viewTransition: ViewTransitionService | null;
  readonly config: ViewTransitionConfig | undefined;
}

/**
 * Keeps `<html dir/lang>` in step with the language and optionally wraps the
 * switch in a view transition. The document is the injected one, so this runs
 * on the server too (RIV-11: `locale ?? id`, ids are not valid tags).
 */
export class DocumentDirectionApplier<L extends string = string> {
  private _applyCount = 0;

  constructor(private readonly _deps: DocumentDirectionApplierDeps) {}

  /** Must be called from an injection context (the facade's constructor). */
  install(language: () => Language<L>): void {
    effect(() => this.applyDirection(language()));
  }

  applyDirection(language: Language<L>): void {
    const root = this._deps.document.documentElement;
    if (!root) return;
    root.dir = language.dir;
    root.lang = language.locale ?? language.id;
  }

  /** The transition is skipped until the second switch when asked to. */
  apply(language: Language<L>, callback: () => void): void {
    const config = this._deps.config;
    const service = this._deps.viewTransition;
    this._applyCount++;
    const useTransition =
      config?.enabled && (!config.skipInitialTransition || this._applyCount > 1) && service != null;

    if (!useTransition) {
      callback();
      return;
    }
    const info: ViewTransitionInfo = { language: language.id, direction: language.dir };
    config.onViewTransitionCreated?.(info);
    service.run(callback);
  }
}

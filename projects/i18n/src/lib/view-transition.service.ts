import { DOCUMENT, Service, inject } from '@angular/core';

/** Progressive-enhancement wrapper around the View Transition API. */
@Service()
export class ViewTransitionService {
  private readonly _doc = inject(DOCUMENT);

  private get _supported(): boolean {
    try {
      const doc = this._doc as Document & {
        startViewTransition?: (callback: () => void) => unknown;
      };
      return typeof doc.startViewTransition === 'function';
    } catch {
      return false;
    }
  }

  run(callback: () => void): void {
    const doc = this._doc as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(callback);
    } else {
      callback();
    }
  }
}

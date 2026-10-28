import { DOCUMENT, Service, inject } from '@angular/core';

/**
 * Progressive-enhancement wrapper around the View Transition API.
 * @internal Driven by `RiviniaI18n`; consumers configure
 * `viewTransition` instead of injecting this service.
 */
@Service()
export class ViewTransitionService {
  private readonly _doc = inject(DOCUMENT);

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

import { Service } from '@angular/core';

/** Progressive-enhancement wrapper around the View Transition API. */
@Service()
export class ViewTransitionService {
  private readonly _supported =
    typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

  run(callback: () => void): void {
    if (this._supported) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  }
}

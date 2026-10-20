import { InjectionToken } from '@angular/core';
import type { ModalContext } from './modal-types';

/**
 * Injection token providing the `ModalContext` of the enclosing modal to
 * dynamically created components. Template content receives the same object
 * as `let-modal="modal"`. Never global — one value per modal instance.
 */
export const RIVINIA_MODAL_CONTEXT = new InjectionToken<ModalContext<unknown>>(
  'RIVINIA_MODAL_CONTEXT',
);

/**
 * Whether a dialog hides the ones below it.
 *
 * The flag is set when the dialog is OPENED, so it lives in the instance's
 * metadata — the same place the title lives, and the same place the host
 * already reads from.
 */

import type { ModalInstance } from '@rivinia/modal';

/** The metadata key the flag is stored under. */
export const MODAL_COVERS = 'coversOthers';

/**
 * Whether this dialog covers the ones below it.
 *
 * @param instance The instance to inspect.
 */
export function covers(instance: ModalInstance<unknown>): boolean {
  return instance.metadata?.[MODAL_COVERS] === true;
}

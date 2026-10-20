import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { RIVINIA_MODAL_CONFIG, type RiviniaModalConfig } from '../models/modal-config';
import { RiviniaModal } from '../services/rivinia-modal';

/**
 * Configures `@rivinia/modal`. The manager is a root singleton; call once at
 * bootstrap. Per-open options always win over these globals. No styling,
 * positions, or icons here — ever.
 *
 * @example
 * ```ts
 * provideRiviniaModal({ strategy: 'stack', maxVisible: 3 })
 * ```
 */
export function provideRiviniaModal(config: RiviniaModalConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: RIVINIA_MODAL_CONFIG, useValue: config }]);
}

/** Shorthand for `inject(RiviniaModal)`. */
export function injectRiviniaModal(): RiviniaModal {
  return inject(RiviniaModal);
}

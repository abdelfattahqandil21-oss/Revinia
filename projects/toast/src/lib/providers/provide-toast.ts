import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { RIVINIA_TOAST_CONFIG, type RiviniaToastConfig } from '../models/toast-config';
import { RiviniaToast } from '../services/rivinia-toast';

/**
 * Configures `@rivinia/toast`. The queue is a root singleton; call once at
 * bootstrap. Presentation (outlet component, position, styles, icons,
 * translations) stays app-owned — a future `@rivinia/toast/ui` entry point
 * will consume the same `RiviniaToast` state.
 *
 * @example
 * ```ts
 * provideRiviniaToast({ duration: 5000, maxVisible: 5 })
 * ```
 */
export function provideRiviniaToast(config: RiviniaToastConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: RIVINIA_TOAST_CONFIG, useValue: config }]);
}

/** Shorthand for `inject(RiviniaToast)`. */
export function injectRiviniaToast(): RiviniaToast {
  return inject(RiviniaToast);
}

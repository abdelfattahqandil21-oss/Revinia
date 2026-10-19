/**
 * Dependency-injection support for the headless controller.
 *
 * A controller is per-select state, so a root singleton would be wrong — but
 * `new RiviniaSelect('multi')` in a component is opaque to Angular: it cannot
 * be overridden in a test, and it is invisible to the injector graph.
 *
 * The provider form keeps both: the consumer declares the controller in
 * `providers`, and Angular creates it.
 *
 * ```ts
 * @Component({
 *   providers: [provideRiviniaSelect('multi')],
 *   template: `<rv-select [options]="options" />`,
 * })
 * export class TagPicker {
 *   readonly controller = injectRiviniaSelect();
 *   readonly options = signal<readonly RiviniaSelectOption[]>([]);
 * }
 * ```
 *
 * A test replaces it without touching the component:
 *
 * ```ts
 * TestBed.configureTestingModule({
 *   providers: [{ provide: RIVINIA_SELECT, useValue: fakeController }],
 * });
 * ```
 */

import { InjectionToken, inject } from '@angular/core';

import { RiviniaSelect } from './rivinia-select';
import type { RiviniaSelectController, RiviniaSelectMode } from './select-types';

/**
 * The injection token for a select controller.
 *
 * Typed as the structural {@link RiviniaSelectController} rather than the
 * class, so a consumer may provide a partial implementation — the same
 * dual-realm rule the other Rivinia packages follow.
 */
export const RIVINIA_SELECT = new InjectionToken<RiviniaSelectController>(
  'RIVINIA_SELECT',
);

/**
 * Provides a select controller for the current injector.
 *
 * @param mode `'single'` or `'multi'`. Fixed at construction.
 */
export function provideRiviniaSelect(mode: RiviniaSelectMode = 'single') {
  return {
    provide: RIVINIA_SELECT,
    useFactory: () => new RiviniaSelect(mode),
  };
}

/**
 * The select controller provided for the current injector.
 *
 * Throws when nothing is provided — the alternative is a silent `undefined`
 * that fails much later, somewhere unrelated.
 */
export function injectRiviniaSelect(): RiviniaSelectController {
  const controller = inject(RIVINIA_SELECT, { optional: true });
  if (!controller) {
    throw new Error(
      'No select controller provided. Add `providers: [provideRiviniaSelect()]` to the component, or provide `RIVINIA_SELECT` yourself.',
    );
  }
  return controller;
}

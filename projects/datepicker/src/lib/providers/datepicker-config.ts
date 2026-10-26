import { InjectionToken } from '@angular/core';
import type { RiviniaDatepickerConfig } from '../models/date-types';

/**
 * Application-wide datepicker defaults. Provided by `provideRiviniaDatepicker`;
 * an absent provider yields an empty configuration (not an error), so the
 * components work with zero setup.
 */
export const DATE_PICKER_CONFIG = new InjectionToken<RiviniaDatepickerConfig>(
  'RIVINIA_DATEPICKER_CONFIG',
  { factory: () => ({}) },
);

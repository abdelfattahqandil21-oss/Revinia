import { inject, makeEnvironmentProviders } from '@angular/core';
import type { EnvironmentProviders } from '@angular/core';
import type { RiviniaDatepickerConfig } from '../models/date-types';
import { RiviniaCalendar } from '../services/rivinia-calendar';
import { DATE_PICKER_CONFIG } from './datepicker-config';

/**
 * Application-wide defaults: the language, the week start, the display
 * format, the range, the labels.
 *
 * It also registers `RiviniaCalendar` at this injector level so a headless
 * consumer can `injectRiviniaDatepicker()` without extra wiring. `rv-datepicker`
 * provides its OWN instance, so several pickers never share state; if you build
 * a custom UI and render two calendars, provide `RiviniaCalendar` where each
 * one's state lives instead of relying on the root instance.
 */
export function provideRiviniaDatepicker(
  config: RiviniaDatepickerConfig = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: DATE_PICKER_CONFIG, useValue: config },
    RiviniaCalendar,
  ]);
}

/** The calendar state of the nearest scope (a picker, or your own provider). */
export function injectRiviniaDatepicker(): RiviniaCalendar {
  return inject(RiviniaCalendar);
}

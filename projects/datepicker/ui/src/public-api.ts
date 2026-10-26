/*
 * `@rivinia/datepicker/ui` — the rendered calendar and the datepicker trigger.
 *
 * The components hold no state: they render a `RiviniaCalendar` (from the
 * primary entry point), which is what lets a consumer reuse the same rendering
 * inside their own popover, dialog or page.
 */
export { RiviniaCalendarComponent } from './lib/components/calendar/calendar';
export { RiviniaDatepickerComponent } from './lib/components/datepicker/datepicker';
export { RiviniaDatetimepickerComponent } from './lib/components/datetimepicker/datetimepicker';
export { RiviniaTimeRowComponent } from './lib/components/time-row/time-row';

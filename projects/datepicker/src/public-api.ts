/*
 * @rivinia/datepicker — headless Gregorian calendar behaviour for Angular.
 *
 * The primary entry point is the headless core: date math, locale week start,
 * formatting (styles and patterns), the month grid, keyboard intent, the
 * calendar service and its providers. Rendering lives in `@rivinia/datepicker/ui`.
 */

// ── Models ────────────────────────────────────────────────────────────────────
export {
  DATE_STYLES,
  DATEPICKER_LABELS_AR,
  DATEPICKER_LABELS_EN,
  DATEPICKER_THEMES,
  DEFAULT_DATE_FORMAT,
  datepickerLabelsFor,
  isDateStyle,
} from './lib/models/date-types';
export type {
  RiviniaCalendarView,
  RiviniaDateFormat,
  RiviniaDatepickerConfig,
  RiviniaDatepickerLabels,
  RiviniaDatepickerTheme,
  RiviniaDateStyle,
  RiviniaDate,
  RiviniaTextDirection,
  RiviniaWeekday,
} from './lib/models/date-types';

export {
  DEFAULT_TIME_FORMAT,
  TIME_STYLES,
  isTimeStyle,
} from './lib/models/time-types';
export type {
  RiviniaDateTime,
  RiviniaDateTimeResolution,
  RiviniaHour12,
  RiviniaHourCycle,
  RiviniaTime,
  RiviniaTimeFormat,
  RiviniaTimeStyle,
  RiviniaTimeZoneAlternative,
  RiviniaTimeZoneDisambiguation,
  RiviniaTimeZoneResolution,
  RiviniaTimeZoneResolutionKind,
} from './lib/models/time-types';

export type {
  RiviniaBuildMonthInput,
  RiviniaCalendarAction,
  RiviniaCalendarCell,
  RiviniaCalendarKeyInput,
  RiviniaCalendarMonth,
  RiviniaCalendarMonthOption,
  RiviniaCalendarResult,
  RiviniaCalendarWeek,
  RiviniaCalendarYearOption,
  RiviniaWeekdayName,
  RiviniaWeekInfo,
} from './lib/models/calendar-types';

// ── Pure date math ────────────────────────────────────────────────────────────
export {
  addDays,
  addMonths,
  addYears,
  compare,
  daysInMonth,
  endOfWeek,
  fromIso,
  isLeapYear,
  isSameDay,
  isValidDate,
  parseDate,
  startOfWeek,
  toIso,
  toLocalDate,
  todayDate,
  weekdayOf,
} from './lib/utils/date-math';

// ── Locale facts ──────────────────────────────────────────────────────────────
export { firstDayOf, weekInfo } from './lib/utils/week-info';

// ── Formatting ────────────────────────────────────────────────────────────────
export { gregorianLocale } from './lib/utils/intl';
export {
  formatDate,
  formatDayNumber,
  formatFullDate,
  formatMonthName,
  formatMonthYear,
  formatViewHeading,
  formatWithStyle,
  formatYear,
  weekdaysOf,
} from './lib/utils/date-format';
export { formatWithPattern, parseDatePattern } from './lib/utils/date-pattern';
export type {
  RiviniaDatePatternPart,
  RiviniaPatternToken,
} from './lib/utils/date-pattern';

// ── Time ──────────────────────────────────────────────────────────────────────
export {
  addMinutes,
  addSeconds,
  civilToEpochMs,
  compareDateTime,
  compareTime,
  dateTimeToIso,
  displayHour,
  fromSeconds,
  hourCycleOf,
  isSameDateTime,
  isValidDateTime,
  isValidTime,
  normalizeTime,
  nowDateTime,
  nowTime,
  parseDateTime,
  parseTime,
  timeToSeconds,
  to24Hour,
  uses12HourClock,
} from './lib/utils/time-math';
export {
  dayPeriodOf,
  dayPeriodsOf,
  formatTimeUnit,
  formatTimeWithPattern,
  formatUnitValue,
  parseTimePattern,
} from './lib/utils/time-pattern';
export type {
  RiviniaTimePatternPart,
  RiviniaTimePatternToken,
} from './lib/utils/time-pattern';
export {
  formatDateTime,
  formatTime,
  formatTimeZoneName,
} from './lib/utils/time-format';
export type {
  RiviniaTimeFormatOptions,
  RiviniaTimeZoneNameStyle,
} from './lib/utils/time-format';
export {
  getTimeZoneOffsetMinutes,
  isValidTimeZone,
  listTimeZones,
  nowInTimeZone,
  resolveWallTime,
  todayInTimeZone,
  wallTimeInTimeZone,
} from './lib/utils/time-zone';

// ── Grid + keyboard ───────────────────────────────────────────────────────────
export { buildMonth } from './lib/utils/calendar-month';
export { resolveCalendarKey } from './lib/utils/calendar-key';

// ── State ─────────────────────────────────────────────────────────────────────
export { RiviniaCalendar } from './lib/services/rivinia-calendar';

// ── Providers ─────────────────────────────────────────────────────────────────
export { DATE_PICKER_CONFIG } from './lib/providers/datepicker-config';
export {
  injectRiviniaDatepicker,
  provideRiviniaDatepicker,
} from './lib/providers/rivinia-datepicker';

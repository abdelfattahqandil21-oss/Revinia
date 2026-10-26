import type { RiviniaHour12, RiviniaTimeFormat } from './time-types';

/**
 * A calendar day, with no time and no time zone.
 *
 * Deliberately NOT a `Date`: a `Date` carries an instant, and an instant is
 * the wrong model for "the 25th of October" — it shifts by a day when the
 * value crosses a time zone. Every operation in this package is integer
 * arithmetic on these three fields.
 */
export interface RiviniaDate {
  readonly year: number;
  /** 1 = January … 12 = December. */
  readonly month: number;
  /** 1 … 31. */
  readonly day: number;
}

/** ISO-8601 weekday number: 1 = Monday … 7 = Sunday. */
export type RiviniaWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RiviniaCalendarView = 'day' | 'month' | 'year';

export type RiviniaTextDirection = 'ltr' | 'rtl';

/**
 * The colour scheme a picker renders in.
 *
 * - `auto` (the default) inherits the page's `color-scheme`: the picker follows
 *   whatever the application (or the operating system, when the page declares
 *   `color-scheme: light dark`) already decided;
 * - `light` and `dark` pin the scheme for THIS picker only.
 *
 * The built-in palette is written with `light-dark()`, and the picker never
 * declares a colour token on its own host — so your own `--rv-*` tokens still
 * win in every scheme (D52).
 */
export type RiviniaDatepickerTheme = 'auto' | 'light' | 'dark';

export const DATEPICKER_THEMES = ['auto', 'light', 'dark'] as const;

/** The four `Intl.DateTimeFormat` date styles. All four are date-only. */
export const DATE_STYLES = ['short', 'medium', 'long', 'full'] as const;

export type RiviniaDateStyle = (typeof DATE_STYLES)[number];

/**
 * Either a style keyword (`'short' | 'medium' | 'long' | 'full'`) or a
 * date-only pattern (`'dd/MM/yyyy'`, `'MM-dd-yy'`, …).
 *
 * The `string & {}` arm keeps editor autocomplete for the four keywords while
 * still accepting any pattern.
 */
export type RiviniaDateFormat = RiviniaDateStyle | (string & {});

/** The default display format: locale order, four-digit year, no time. */
export const DEFAULT_DATE_FORMAT: RiviniaDateStyle = 'medium';

export function isDateStyle(value: string): value is RiviniaDateStyle {
  return (DATE_STYLES as readonly string[]).includes(value);
}

/**
 * Every user-visible string in the picker. All of them are overridable, per
 * language or per application, because "Choose date" is not a translation the
 * library should insist on.
 */
export interface RiviniaDatepickerLabels {
  /** Trigger text when empty, and the accessible name of the trigger. */
  readonly chooseDate: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly previousYear: string;
  readonly nextYear: string;
  readonly switchToMonthView: string;
  readonly switchToYearView: string;
  /** Accessible name of the clear button (`[clearable]`). */
  readonly clearDate: string;
  /** Empty trigger of the date + time picker. */
  readonly chooseDateTime: string;
  /** Clear button of the date + time picker. */
  readonly clearDateTime: string;
  /** Accessible name of the time row. */
  readonly time: string;
  /**
   * Accessible name of the button that opens the pointer-friendly time tray.
   * Optional so an existing label object keeps compiling; the row falls back
   * to `time` when it is absent.
   */
  readonly chooseTime?: string;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
  /** Accessible name of the AM/PM group. */
  readonly meridiem: string;
  readonly now: string;
  readonly ok: string;
  readonly timeZone: string;
  readonly invalidTime: string;
  readonly invalidTimeZone: string;
  readonly dstGap: string;
  readonly dstOverlap: string;
  /** Prefix of the button that adopts the suggested gap time. */
  readonly useSuggestedTime: string;
  /** Screen-reader instructions for the grid (referenced by aria-describedby). */
  readonly instructions: string;
}

export const DATEPICKER_LABELS_EN: RiviniaDatepickerLabels = {
  chooseDate: 'Choose date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  switchToMonthView: 'Switch to month view',
  switchToYearView: 'Switch to year view',
  clearDate: 'Clear date',
  chooseDateTime: 'Choose date and time',
  clearDateTime: 'Clear date and time',
  time: 'Time',
  chooseTime: 'Choose time',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  meridiem: 'AM or PM',
  now: 'Now',
  ok: 'OK',
  timeZone: 'Time zone',
  invalidTime: 'Enter a valid time.',
  invalidTimeZone: 'Unknown time zone.',
  dstGap:
    'This time does not exist in the selected time zone because the clock jumps forward.',
  dstOverlap:
    'This time occurs twice in the selected time zone. Choose which one you mean.',
  useSuggestedTime: 'Use',
  instructions:
    'Use the arrow keys to move by day, Home and End to reach the ends of the week, ' +
    'Page Up and Page Down to move by month, and Shift with Page Up or Page Down to move ' +
    'by year. Press Enter to choose the focused date, or Escape to close without choosing.',
};

export const DATEPICKER_LABELS_AR: RiviniaDatepickerLabels = {
  chooseDate: 'اختر التاريخ',
  previousMonth: 'الشهر السابق',
  nextMonth: 'الشهر التالي',
  previousYear: 'السنة السابقة',
  nextYear: 'السنة التالية',
  switchToMonthView: 'التبديل إلى عرض الشهور',
  switchToYearView: 'التبديل إلى عرض السنوات',
  clearDate: 'مسح التاريخ',
  chooseDateTime: 'اختر التاريخ والوقت',
  clearDateTime: 'مسح التاريخ والوقت',
  time: 'الوقت',
  chooseTime: 'اختر الوقت',
  hour: 'الساعة',
  minute: 'الدقيقة',
  second: 'الثانية',
  meridiem: 'صباحًا أو مساءً',
  now: 'الآن',
  ok: 'موافق',
  timeZone: 'المنطقة الزمنية',
  invalidTime: 'أدخل وقتًا صحيحًا.',
  invalidTimeZone: 'منطقة زمنية غير معروفة.',
  dstGap: 'هذا الوقت غير موجود في المنطقة الزمنية المحددة لأن الساعة تتقدم.',
  dstOverlap: 'هذا الوقت يتكرر مرتين في المنطقة الزمنية المحددة. اختر أيّهما تقصد.',
  useSuggestedTime: 'استخدم',
  instructions:
    'استخدم أسهم لوحة المفاتيح للتنقل يومًا بيوم، و Home و End للوصول إلى طرفي الأسبوع، ' +
    'و Page Up و Page Down للتنقل شهرًا، مع Shift للتنقل سنة. اضغط Enter لاختيار التاريخ ' +
    'المحدد، أو Escape للإغلاق دون اختيار.',
};

/** Arabic for `ar`, everything else English. */
export function datepickerLabelsFor(locale: string): RiviniaDatepickerLabels {
  return /^ar(\b|-)/i.test(locale) ? DATEPICKER_LABELS_AR : DATEPICKER_LABELS_EN;
}

/**
 * Application-wide defaults. Per-instance inputs win over these.
 *
 * Dates may be given as `RiviniaDate` or as an ISO `YYYY-MM-DD` string.
 */
export interface RiviniaDatepickerConfig {
  readonly locale?: string;
  readonly firstDay?: RiviniaWeekday;
  readonly format?: RiviniaDateFormat;
  readonly selected?: RiviniaDate | string | null;
  readonly min?: RiviniaDate | string | null;
  readonly max?: RiviniaDate | string | null;
  /**
   * The date considered "today". The default is the local clock; an explicit
   * value is what keeps a server-rendered page and its hydration in agreement
   * when the render crosses midnight.
   */
  readonly today?: RiviniaDate | string | null;
  readonly labels?: Partial<RiviniaDatepickerLabels>;
  readonly view?: RiviniaCalendarView;
  /** The colour scheme; `auto` (the default) inherits the page's `color-scheme`. */
  readonly theme?: RiviniaDatepickerTheme;
  /** Show the clear button when the picker holds a value. Default `false`. */
  readonly clearable?: boolean;
  /** Display format of the time half (`short`, `medium`, or a pattern). */
  readonly timeFormat?: RiviniaTimeFormat;
  /** Show the seconds field and accept seconds. Default `false`. */
  readonly showSeconds?: boolean;
  /** Step of the minute/second spinbuttons. Default `1`. */
  readonly minuteStep?: number;
  /** `'auto'` follows the locale's clock; `true`/`false` pin it. */
  readonly hour12?: RiviniaHour12;
  /** IANA zone used to show the offset and validate DST. Unset = no zone. */
  readonly timeZone?: string;
}

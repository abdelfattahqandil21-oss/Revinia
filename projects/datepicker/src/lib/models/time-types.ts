import type { RiviniaDate } from './date-types';

/**
 * A civil time of day, with no date and no time zone.
 *
 * Seconds are always present. A picker configured for minutes simply keeps
 * the seconds the value already had (usually zero); dropping the field would
 * make `{ hour: 9, minute: 30 }` and `{ hour: 9, minute: 30, second: 0 }` two
 * incompatible shapes for the same fact.
 */
export interface RiviniaTime {
  /** 0 … 23. */
  readonly hour: number;
  /** 0 … 59. */
  readonly minute: number;
  /** 0 … 59. */
  readonly second: number;
}

/**
 * A civil date and time, still with no time zone.
 *
 * This is the value a `rv-datetimepicker` emits. It describes what the user
 * read on the wall, not an instant; converting it to an instant needs a time
 * zone and is deliberately the application's step (see `resolveWallTime`).
 */
export interface RiviniaDateTime {
  readonly date: RiviniaDate;
  readonly time: RiviniaTime;
}

/** The two `Intl.DateTimeFormat` time styles. Both are time-only. */
export const TIME_STYLES = ['short', 'medium'] as const;

export type RiviniaTimeStyle = (typeof TIME_STYLES)[number];

/**
 * Either a style keyword (`'short' | 'medium'`) or a time-only pattern
 * (`'HH:mm'`, `'hh:mm a'`, `'HH:mm:ss'`, …).
 *
 * The `string & {}` arm keeps editor autocomplete for the two keywords while
 * still accepting any pattern.
 */
export type RiviniaTimeFormat = RiviniaTimeStyle | (string & {});

/** Locale order, hour and minute; `medium` adds seconds. */
export const DEFAULT_TIME_FORMAT: RiviniaTimeStyle = 'short';

export function isTimeStyle(value: string): value is RiviniaTimeStyle {
  return (TIME_STYLES as readonly string[]).includes(value);
}

/**
 * `'auto'` follows the locale's preferred clock (12-hour in `en-US` and
 * `ar-EG`, 24-hour in `en-GB`); `true` and `false` pin it.
 */
export type RiviniaHour12 = boolean | 'auto';

/** The clock a locale prefers, as `Intl` reports it. */
export type RiviniaHourCycle = 'h11' | 'h12' | 'h23' | 'h24';

/**
 * What to do when a wall time is ambiguous (the clock falls back) or does not
 * exist (the clock jumps forward):
 *
 * - `compatible` (the default): overlap → the earlier instant, gap → the
 *   later wall time. This is the rule `Temporal` calls `compatible` and the
 *   behaviour users expect from a clock;
 * - `earlier` / `later`: pick that side explicitly;
 * - `reject`: throw instead of guessing, for an application that must never
 *   silently move a value.
 */
export type RiviniaTimeZoneDisambiguation =
  | 'compatible'
  | 'earlier'
  | 'later'
  | 'reject';

export type RiviniaTimeZoneResolutionKind =
  | 'unique'
  | 'ambiguous'
  | 'nonexistent';

/** One real instant a wall time can mean, with the wall time it shows. */
export interface RiviniaTimeZoneAlternative {
  /** Milliseconds since the Unix epoch. */
  readonly instant: number;
  /** Offset east of UTC, in minutes (Cairo summer = 180). */
  readonly offsetMinutes: number;
  /**
   * The wall time this instant actually shows in the zone. For an overlap it
   * equals the requested time; for a gap it is the shifted suggestion.
   */
  readonly dateTime: RiviniaDateTime;
}

/**
 * The answer to "what instant is this wall time in this zone?".
 *
 * `dateTime` is the requested value for `unique` and `ambiguous`, and the
 * suggested wall time for `nonexistent`. `alternatives` holds the real
 * candidates: two offsets for an overlap, the two sides of the gap for a
 * nonexistent time, one entry otherwise. They are sorted by instant.
 */
export interface RiviniaTimeZoneResolution {
  readonly kind: RiviniaTimeZoneResolutionKind;
  readonly requested: RiviniaDateTime;
  readonly instant: number;
  readonly offsetMinutes: number;
  readonly dateTime: RiviniaDateTime;
  readonly alternatives: readonly RiviniaTimeZoneAlternative[];
}

/** Emitted by the picker when a zoned value is committed. */
export interface RiviniaDateTimeResolution {
  readonly value: RiviniaDateTime;
  readonly timeZone: string;
  readonly resolution: RiviniaTimeZoneResolution;
}

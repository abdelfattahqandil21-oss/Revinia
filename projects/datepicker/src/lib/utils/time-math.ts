import type { RiviniaDate } from '../models/date-types';
import type {
  RiviniaDateTime,
  RiviniaHourCycle,
  RiviniaTime,
} from '../models/time-types';
import { isValidDate, parseDate, toIso } from './date-math';

/**
 * Pure time-of-day arithmetic. No `Date`, no time zone, no DST: a time here is
 * a reading on a wall clock, and moving it must never consult the machine's
 * zone (that is `time-zone.ts`, and it is a separate, explicit step).
 */

export function isValidTime(value: unknown): value is RiviniaTime {
  if (!value || typeof value !== 'object') return false;
  const { hour, minute, second } = value as RiviniaTime;
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    Number.isInteger(second) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** A valid copy of a time, clamping each field into its range. */
export function normalizeTime(value: RiviniaTime): RiviniaTime {
  return {
    hour: clampInteger(value.hour, 0, 23),
    minute: clampInteger(value.minute, 0, 59),
    second: clampInteger(value.second, 0, 59),
  };
}

export function timeToSeconds(value: RiviniaTime): number {
  const time = normalizeTime(value);
  return time.hour * 3600 + time.minute * 60 + time.second;
}

/** Clamped to `00:00:00 … 23:59:59`; it never rolls into another day. */
export function fromSeconds(total: number): RiviniaTime {
  const seconds = clampInteger(total, 0, 86399);
  return {
    hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60),
    second: seconds % 60,
  };
}

export function addSeconds(value: RiviniaTime, delta: number): RiviniaTime {
  return fromSeconds(timeToSeconds(value) + Math.trunc(delta));
}

export function addMinutes(value: RiviniaTime, delta: number): RiviniaTime {
  return addSeconds(value, Math.trunc(delta) * 60);
}

export function compareTime(a: RiviniaTime, b: RiviniaTime): -1 | 0 | 1 {
  const left = timeToSeconds(a);
  const right = timeToSeconds(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** `HH:mm` or `HH:mm:ss`, 24-hour, ASCII digits. */
export function parseTime(value: RiviniaTime | string | null | undefined): RiviniaTime | null {
  if (!value) return null;
  if (typeof value === 'object') return isValidTime(value) ? normalizeTime(value) : null;

  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const time: RiviniaTime = {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] ?? 0),
  };
  return isValidTime(time) ? time : null;
}

export function isValidDateTime(value: unknown): value is RiviniaDateTime {
  if (!value || typeof value !== 'object') return false;
  const { date, time } = value as RiviniaDateTime;
  return isValidDate(date) && isValidTime(time);
}

/**
 * A date-time value or an ISO `YYYY-MM-DDTHH:mm[:ss]` string (a space instead
 * of `T` is accepted too). The string has NO offset: an offset would describe
 * an instant, and this package stores civil values.
 */
export function parseDateTime(
  value: RiviniaDateTime | string | null | undefined,
): RiviniaDateTime | null {
  if (!value) return null;
  if (typeof value === 'object') {
    if (!isValidDateTime(value)) return null;
    return {
      date: { ...value.date },
      time: normalizeTime(value.time),
    };
  }

  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)$/.exec(value.trim());
  if (!match) return null;
  const date = parseDate(match[1]);
  const time = parseTime(match[2]);
  return date && time ? { date, time } : null;
}

/** `YYYY-MM-DDTHH:mm:ss` — lossless, and unambiguously civil (no offset). */
export function dateTimeToIso(value: RiviniaDateTime): string {
  const time = normalizeTime(value.time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toIso(value.date)}T${pad(time.hour)}:${pad(time.minute)}:${pad(time.second)}`;
}

export function compareDateTime(a: RiviniaDateTime, b: RiviniaDateTime): -1 | 0 | 1 {
  const left = `${toIso(a.date)}T${String(timeToSeconds(a.time)).padStart(5, '0')}`;
  const right = `${toIso(b.date)}T${String(timeToSeconds(b.time)).padStart(5, '0')}`;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isSameDateTime(
  a: RiviniaDateTime | null | undefined,
  b: RiviniaDateTime | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  return compareDateTime(a, b) === 0;
}

/** The browser's local clock as civil fields. */
export function nowTime(now: Date = new Date()): RiviniaTime {
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
}

export function nowDateTime(now: Date = new Date()): RiviniaDateTime {
  return {
    date: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
    time: nowTime(now),
  };
}

/**
 * The locale's preferred clock. `Intl.Locale#getHourCycles` is the primary
 * source; `resolvedOptions()` is the fallback for engines that lack it.
 */
export function hourCycleOf(locale: string): RiviniaHourCycle {
  try {
    const parsed = new Intl.Locale(locale);
    const getter = (parsed as unknown as { getHourCycles?: () => string[] }).getHourCycles;
    const cycles = typeof getter === 'function' ? getter.call(parsed) : undefined;
    const first = cycles?.[0];
    if (first === 'h11' || first === 'h12' || first === 'h23' || first === 'h24') {
      return first;
    }
  } catch {
    // fall through
  }

  try {
    const options = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    const cycle = options.hourCycle;
    if (cycle === 'h11' || cycle === 'h12' || cycle === 'h23' || cycle === 'h24') {
      return cycle;
    }
    if (options.hour12 === true) return 'h12';
    if (options.hour12 === false) return 'h23';
  } catch {
    // fall through
  }

  return 'h23';
}

export function uses12HourClock(locale: string): boolean {
  const cycle = hourCycleOf(locale);
  return cycle === 'h11' || cycle === 'h12';
}

/** The hour as a wall-clock display: 0 → 12 AM, 13 → 1 PM. */
export function displayHour(hour: number, hour12: boolean): number {
  const h = clampInteger(hour, 0, 23);
  if (!hour12) return h;
  return h % 12 === 0 ? 12 : h % 12;
}

/** The 0–23 hour for a 12-hour display plus a meridiem. */
export function to24Hour(display: number, pm: boolean): number {
  const h = clampInteger(display, 1, 12);
  return (h % 12) + (pm ? 12 : 0);
}

/** A deterministic instant for a civil date/time, interpreted as UTC. */
export function civilToEpochMs(value: RiviniaDateTime): number {
  const { date, time } = value;
  const result = new Date(
    Date.UTC(2000, date.month - 1, date.day, time.hour, time.minute, time.second),
  );
  result.setUTCFullYear(date.year);
  return result.getTime();
}

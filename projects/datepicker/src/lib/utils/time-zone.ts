import type { RiviniaDate } from '../models/date-types';
import type {
  RiviniaDateTime,
  RiviniaTimeZoneAlternative,
  RiviniaTimeZoneDisambiguation,
  RiviniaTimeZoneResolution,
} from '../models/time-types';
import { addDays } from './date-math';
import { intlFormatter } from './intl';
import {
  civilToEpochMs,
  dateTimeToIso,
  isValidDateTime,
  nowDateTime,
} from './time-math';

/**
 * Wall time ↔ instant, with `Intl` as the only source of zone rules.
 *
 * There is no DST table in this package and no Temporal dependency: the
 * installed ICU already knows every IANA zone (418 of them in the verified
 * environment). The algorithm is the standard offset probe:
 *
 *   1. read the offset around the requested wall time;
 *   2. turn each candidate offset into an instant and check that the instant
 *      really displays the requested wall time;
 *   3. no candidate = the clock jumped forward; two candidates = the clock
 *      fell back.
 *
 * The chosen rule matches `Temporal`'s `compatible`: overlap → earlier,
 * gap → the later wall time.
 */

const DAY_MS = 86_400_000;
const PROBE_MS = 2 * DAY_MS;
const VALID_ZONE_CACHE = new Map<string, boolean>();
const VALID_ZONE_CACHE_LIMIT = 100;

export function isValidTimeZone(timeZone: string | null | undefined): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  const cached = VALID_ZONE_CACHE.get(timeZone);
  if (cached !== undefined) return cached;

  let valid = true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
  } catch {
    valid = false;
  }

  if (VALID_ZONE_CACHE.size >= VALID_ZONE_CACHE_LIMIT) {
    const oldest = VALID_ZONE_CACHE.keys().next().value;
    if (oldest !== undefined) VALID_ZONE_CACHE.delete(oldest);
  }
  VALID_ZONE_CACHE.set(timeZone, valid);
  return valid;
}

/** Every zone the installed ICU knows. Empty when the engine has no list. */
export function listTimeZones(): readonly string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    const zones = typeof supported === 'function' ? supported.call(Intl, 'timeZone') : [];
    return [...zones].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function wallTimeParts(
  timeZone: string,
  instant: number,
): { date: RiviniaDate; hour: number; minute: number; second: number } | null {
  try {
    const parts = intlFormatter('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));

    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const year = Number(value('year'));
    const month = Number(value('month'));
    const day = Number(value('day'));
    const hour = Number(value('hour'));
    const minute = Number(value('minute'));
    const second = Number(value('second'));

    if (![year, month, day, hour, minute, second].every(Number.isInteger)) {
      return null;
    }

    // A few ICU builds still answer 24 for midnight despite h23. Normalise it
    // rather than producing an invalid time.
    if (hour === 24) {
      return { date: addDays({ year, month, day }, 1), hour: 0, minute, second };
    }
    return { date: { year, month, day }, hour, minute, second };
  } catch {
    return null;
  }
}

/** The wall clock in `timeZone` at an instant, or `null` for an invalid zone. */
export function wallTimeInTimeZone(
  timeZone: string,
  instant: number,
): RiviniaDateTime | null {
  const parts = wallTimeParts(timeZone, instant);
  if (!parts) return null;
  return {
    date: parts.date,
    time: { hour: parts.hour, minute: parts.minute, second: parts.second },
  };
}

/**
 * Offset east of UTC in minutes (Cairo summer = 180, New York = -240).
 * `null` when the zone is invalid.
 */
export function getTimeZoneOffsetMinutes(
  timeZone: string,
  instant: number,
): number | null {
  const wall = wallTimeInTimeZone(timeZone, instant);
  if (!wall) return null;
  return Math.round((civilToEpochMs(wall) - instant) / 60_000);
}

function sameWall(a: RiviniaDateTime, b: RiviniaDateTime): boolean {
  return (
    a.date.year === b.date.year &&
    a.date.month === b.date.month &&
    a.date.day === b.date.day &&
    a.time.hour === b.time.hour &&
    a.time.minute === b.time.minute &&
    a.time.second === b.time.second
  );
}

interface Candidate {
  readonly instant: number;
  readonly offsetMinutes: number;
}

export function resolveWallTime(
  value: RiviniaDateTime,
  timeZone: string,
  disambiguation: RiviniaTimeZoneDisambiguation = 'compatible',
): RiviniaTimeZoneResolution | null {
  if (!isValidDateTime(value) || !isValidTimeZone(timeZone)) return null;

  const requested: RiviniaDateTime = {
    date: { ...value.date },
    time: { ...value.time },
  };
  const guess = civilToEpochMs(requested);

  const offsets = new Set<number>();
  for (const delta of [-PROBE_MS, 0, PROBE_MS]) {
    const offset = getTimeZoneOffsetMinutes(timeZone, guess + delta);
    if (offset !== null) offsets.add(offset);
  }

  const candidates: Candidate[] = [];
  for (const offsetMinutes of offsets) {
    const instant = guess - offsetMinutes * 60_000;
    const actualOffset = getTimeZoneOffsetMinutes(timeZone, instant);
    const wall = wallTimeInTimeZone(timeZone, instant);
    if (actualOffset === offsetMinutes && wall && sameWall(wall, requested)) {
      if (!candidates.some((candidate) => candidate.instant === instant)) {
        candidates.push({ instant, offsetMinutes });
      }
    }
  }
  candidates.sort((a, b) => a.instant - b.instant);

  if (candidates.length === 1) {
    const only = candidates[0];
    return {
      kind: 'unique',
      requested,
      instant: only.instant,
      offsetMinutes: only.offsetMinutes,
      dateTime: requested,
      alternatives: [
        { instant: only.instant, offsetMinutes: only.offsetMinutes, dateTime: requested },
      ],
    };
  }

  if (candidates.length > 1) {
    if (disambiguation === 'reject') {
      throw new RangeError(
        `The wall time ${dateTimeToIso(requested)} occurs twice in ${timeZone}. ` +
          `Choose "earlier" or "later" explicitly.`,
      );
    }
    const chosen = disambiguation === 'later' ? candidates[candidates.length - 1] : candidates[0];
    return {
      kind: 'ambiguous',
      requested,
      instant: chosen.instant,
      offsetMinutes: chosen.offsetMinutes,
      dateTime: requested,
      alternatives: candidates.map((candidate) => ({
        instant: candidate.instant,
        offsetMinutes: candidate.offsetMinutes,
        dateTime: requested,
      })),
    };
  }

  // No candidate: the clock jumps forward. The two sides of the gap are the
  // post-transition offset applied to the earlier instant and the
  // pre-transition offset applied to the later one.
  const before = getTimeZoneOffsetMinutes(timeZone, guess - PROBE_MS);
  const after = getTimeZoneOffsetMinutes(timeZone, guess + PROBE_MS);
  if (before === null || after === null) return null;

  const earlierInstant = guess - after * 60_000;
  const laterInstant = guess - before * 60_000;
  const earlierWall = wallTimeInTimeZone(timeZone, earlierInstant);
  const laterWall = wallTimeInTimeZone(timeZone, laterInstant);
  if (!earlierWall || !laterWall) return null;

  const alternatives: RiviniaTimeZoneAlternative[] = [
    { instant: earlierInstant, offsetMinutes: before, dateTime: earlierWall },
    { instant: laterInstant, offsetMinutes: after, dateTime: laterWall },
  ];

  if (disambiguation === 'reject') {
    throw new RangeError(
      `The wall time ${dateTimeToIso(requested)} does not exist in ${timeZone}; ` +
        `the clock jumps forward.`,
    );
  }

  const chosen = disambiguation === 'earlier' ? alternatives[0] : alternatives[1];
  return {
    kind: 'nonexistent',
    requested,
    instant: chosen.instant,
    offsetMinutes: chosen.offsetMinutes,
    dateTime: chosen.dateTime,
    alternatives,
  };
}

/** The current date and time in a zone, or the browser's local clock if invalid. */
export function nowInTimeZone(timeZone: string, now: number = Date.now()): RiviniaDateTime {
  return wallTimeInTimeZone(timeZone, now) ?? nowDateTime(new Date(now));
}

export function todayInTimeZone(timeZone: string, now: number = Date.now()): RiviniaDate {
  return nowInTimeZone(timeZone, now).date;
}

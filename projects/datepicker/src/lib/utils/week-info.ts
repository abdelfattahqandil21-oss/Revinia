import type { RiviniaWeekday } from '../models/date-types';
import type { RiviniaWeekInfo } from '../models/calendar-types';

/*
 * The week start is a locale fact (Egypt starts on Saturday, the US on Sunday,
 * the UK on Monday), and CLDR already knows it. `Intl.Locale.prototype.getWeekInfo`
 * is the standard accessor; the older engines expose the same object as the
 * `weekInfo` property, and a third group has neither.
 *
 * The fallback is ISO-8601 (Monday), because a *wrong guess* that is at least
 * consistent is better than a thrown exception inside a render.
 */

const ISO_WEEK_INFO: RiviniaWeekInfo = { firstDay: 1, weekend: [6, 7] };

const isWeekday = (value: unknown): value is RiviniaWeekday =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;

function normalize(raw: unknown): RiviniaWeekInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as {
    firstDay?: unknown;
    weekend?: unknown;
    minimalDays?: unknown;
  };
  if (!isWeekday(candidate.firstDay)) return null;

  const weekend = Array.isArray(candidate.weekend)
    ? candidate.weekend.filter(isWeekday)
    : [];
  const minimalDays = Number.isInteger(candidate.minimalDays)
    ? (candidate.minimalDays as number)
    : undefined;

  return {
    firstDay: candidate.firstDay,
    weekend: weekend.length > 0 ? weekend : ISO_WEEK_INFO.weekend,
    ...(minimalDays !== undefined ? { minimalDays } : {}),
  };
}

export function weekInfo(locale: string): RiviniaWeekInfo {
  try {
    const api = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => unknown;
      weekInfo?: unknown;
    };
    // `getWeekInfo()` where it exists, then the legacy accessor.
    const raw =
      typeof api.getWeekInfo === 'function'
        ? api.getWeekInfo()
        : typeof api.weekInfo === 'object'
          ? api.weekInfo
          : undefined;
    return normalize(raw) ?? ISO_WEEK_INFO;
  } catch {
    // An invalid tag must not break a render.
    return ISO_WEEK_INFO;
  }
}

export function firstDayOf(locale: string): RiviniaWeekday {
  return weekInfo(locale).firstDay;
}

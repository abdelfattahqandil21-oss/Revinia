import type { RiviniaTime } from '../models/time-types';
import { intlFormatter, intlNumberFormatter } from './intl';
import { displayHour } from './time-math';

/**
 * Time patterns, following the same syntax rules as the date patterns:
 * case-sensitive letters, the run width selects the form, quoted text is a
 * literal, `''` is one quote. The supported letters are the ones a time-only
 * display needs, and nothing else — a timezone letter is rejected because the
 * zone is a separate, explicit concept in this package.
 *
 *   H / HH   0–23, padded when repeated
 *   h / hh   1–12, padded when repeated
 *   m / mm   minutes
 *   s / ss   seconds
 *   a        the locale's day period (AM / PM / ص / م)
 *
 * `M`, `S`, `A`, `k`, `K` and the date letters are rejected with a message
 * instead of being silently reinterpreted: `HH:MM` is a month in the date
 * language, and guessing would be worse than an error.
 */
export type RiviniaTimePatternToken =
  | 'H'
  | 'HH'
  | 'h'
  | 'hh'
  | 'm'
  | 'mm'
  | 's'
  | 'ss'
  | 'a';

export interface RiviniaTimePatternPart {
  /** `null` for a literal run. */
  readonly token: RiviniaTimePatternToken | null;
  /** The source text of the token, or the literal text. */
  readonly value: string;
}

const DATE_LETTERS = new Set(['y', 'd', 'E', 'G', 'Q', 'w', 'D', 'F', 'W']);
const UNSUPPORTED = new Set(['M', 'S', 'A', 'k', 'K', 'X', 'Z', 'z', 'O', 'v', 'V', 'b', 'B', 'T']);

export function parseTimePattern(pattern: string): readonly RiviniaTimePatternPart[] {
  const parts: RiviniaTimePatternPart[] = [];
  let literal = '';

  const flush = () => {
    if (literal) {
      parts.push({ token: null, value: literal });
      literal = '';
    }
  };

  for (let index = 0; index < pattern.length; ) {
    const char = pattern[index];

    if (char === "'") {
      if (pattern[index + 1] === "'") {
        literal += "'";
        index += 2;
        continue;
      }
      const end = pattern.indexOf("'", index + 1);
      if (end === -1) {
        throw new RangeError(`Unterminated quote in time pattern "${pattern}".`);
      }
      literal += pattern.slice(index + 1, end);
      index = end + 1;
      continue;
    }

    if (!/[A-Za-z]/.test(char)) {
      literal += char;
      index++;
      continue;
    }

    if (DATE_LETTERS.has(char)) {
      throw new RangeError(
        `"${char}" is a date letter; a time pattern cannot contain dates. ` +
          `Use the date picker's format for the date half.`,
      );
    }
    if (UNSUPPORTED.has(char)) {
      const hint = char === 'M' ? ' Use "m" for minutes.' : '';
      throw new RangeError(`"${char}" is not supported in a time pattern.${hint}`);
    }

    let run = char;
    let cursor = index + 1;
    while (pattern[cursor] === char) {
      run += char;
      cursor++;
    }

    let token: RiviniaTimePatternToken;
    switch (char) {
      case 'H':
        if (run.length > 2) throw new RangeError(`"${run}" is not a valid hour token.`);
        token = run.length === 2 ? 'HH' : 'H';
        break;
      case 'h':
        if (run.length > 2) throw new RangeError(`"${run}" is not a valid hour token.`);
        token = run.length === 2 ? 'hh' : 'h';
        break;
      case 'm':
        if (run.length > 2) throw new RangeError(`"${run}" is not a valid minute token.`);
        token = run.length === 2 ? 'mm' : 'm';
        break;
      case 's':
        if (run.length > 2) throw new RangeError(`"${run}" is not a valid second token.`);
        token = run.length === 2 ? 'ss' : 's';
        break;
      case 'a':
        if (run.length > 1) throw new RangeError(`"${run}" is not a valid day-period token.`);
        token = 'a';
        break;
      default:
        throw new RangeError(`"${char}" is not supported in a time pattern.`);
    }

    flush();
    parts.push({ token, value: run });
    index = cursor;
  }

  flush();

  const tokens = new Set(parts.filter((part) => part.token).map((part) => part.token));
  const has24 = tokens.has('H') || tokens.has('HH');
  const has12 = tokens.has('h') || tokens.has('hh');

  if (has24 && (has12 || tokens.has('a'))) {
    throw new RangeError(
      `Time pattern "${pattern}" mixes a 24-hour token with a 12-hour token or AM/PM. ` +
        `Use H/HH, or h/hh with a.`,
    );
  }

  return parts;
}

/**
 * The locale's day period for a time. `Intl` is the only source of "ص" and
 * "م"; hardcoding AM/PM would be an English assumption in an Arabic UI.
 */
export function dayPeriodOf(locale: string, time: RiviniaTime): string {
  const reference = new Date(Date.UTC(2000, 0, 1, time.hour, time.minute, time.second));
  try {
    const parts = intlFormatter(locale, {
      hour: 'numeric',
      hour12: true,
      timeZone: 'UTC',
    }).formatToParts(reference);
    const period = parts.find((part) => part.type === 'dayPeriod')?.value;
    if (period) return period;
  } catch {
    // fall through
  }
  return time.hour < 12 ? 'AM' : 'PM';
}

export function dayPeriodsOf(locale: string): { readonly am: string; readonly pm: string } {
  return {
    am: dayPeriodOf(locale, { hour: 9, minute: 0, second: 0 }),
    pm: dayPeriodOf(locale, { hour: 21, minute: 0, second: 0 }),
  };
}

/** A localized number with an optional zero pad, using the locale's digits. */
export function formatTimeUnit(
  locale: string,
  value: number,
  minimumIntegerDigits = 2,
): string {
  return intlNumberFormatter(locale, {
    useGrouping: false,
    minimumIntegerDigits,
  }).format(value);
}

/**
 * A unit-formatted value for `aria-valuetext`: "30 minutes" / "٣٠ دقيقة".
 * `Intl` supplies both the digits and the unit name.
 */
export function formatUnitValue(
  locale: string,
  value: number,
  unit: 'minute' | 'second',
): string {
  try {
    return intlNumberFormatter(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
    }).format(value);
  } catch {
    return `${value} ${unit}`;
  }
}

export function formatTimeWithPattern(
  locale: string,
  time: RiviniaTime,
  pattern: string,
): string {
  const parts = parseTimePattern(pattern);
  return parts
    .map((part) => {
      if (part.token === null) return part.value;
      switch (part.token) {
        case 'H':
          return formatTimeUnit(locale, time.hour, 1);
        case 'HH':
          return formatTimeUnit(locale, time.hour, 2);
        case 'h':
          return formatTimeUnit(locale, displayHour(time.hour, true), 1);
        case 'hh':
          return formatTimeUnit(locale, displayHour(time.hour, true), 2);
        case 'm':
          return formatTimeUnit(locale, time.minute, 1);
        case 'mm':
          return formatTimeUnit(locale, time.minute, 2);
        case 's':
          return formatTimeUnit(locale, time.second, 1);
        case 'ss':
          return formatTimeUnit(locale, time.second, 2);
        case 'a':
          return dayPeriodOf(locale, time);
      }
    })
    .join('');
}

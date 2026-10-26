import type { RiviniaDate } from '../models/date-types';
import { intlFormatter } from './intl';
import { toLocalDate } from './date-math';

/*
 * A small, date-only pattern language.
 *
 *   yyyy  the year            yy     two-digit year
 *   MMMM  the month's name    MMM    abbreviated month name
 *   MM    two-digit month     M      month number
 *   dd    two-digit day       d      day number
 *   EEEE  weekday name        EEE    abbreviated weekday      EEEEE  narrow
 *   'text'  a literal, '' for a literal quote
 *
 * Tokens are CASE-INSENSITIVE (mm and MM are both the month), because in a
 * date-only field there are no minutes, so the familiar date-fns trap cannot
 * apply — and refusing the user's own examples (mm-dd-yyyy) would be pedantry.
 * Time tokens are rejected with a message that says why.
 */

export type RiviniaPatternToken =
  | 'yyyy'
  | 'yy'
  | 'MMMM'
  | 'MMM'
  | 'MM'
  | 'M'
  | 'dd'
  | 'd'
  | 'EEEE'
  | 'EEE'
  | 'EEEEE';

export interface RiviniaDatePatternPart {
  /** `null` for a literal run. */
  readonly token: RiviniaPatternToken | null;
  /** The source text of the token, or the literal text. */
  readonly value: string;
}

const SUPPORTED = 'yyyy, yy, MMMM, MMM, MM, M, dd, d, EEEE, EEE, EEEEE';

const TIME_LETTERS = new Set([
  'h',
  'H',
  'k',
  'K',
  's',
  'S',
  'a',
  'A',
  'X',
  'Z',
  'z',
  'O',
  'v',
  'V',
  'b',
  'B',
]);

const MAX_WIDTH: Record<string, number> = { y: 4, m: 4, d: 2, e: 5 };

function tokenFor(letter: string, run: string, pattern: string): RiviniaPatternToken {
  const width = run.length;
  switch (letter) {
    case 'y':
      return width === 2 ? 'yy' : 'yyyy';
    case 'm':
      return width === 1 ? 'M' : width === 2 ? 'MM' : width === 3 ? 'MMM' : 'MMMM';
    case 'd':
      return width === 1 ? 'd' : 'dd';
    case 'e':
      return width >= 5 ? 'EEEEE' : width === 4 ? 'EEEE' : 'EEE';
    default:
      throw new RangeError(
        `Unknown token "${run}" in date pattern "${pattern}". Supported tokens: ${SUPPORTED}.`,
      );
  }
}

/**
 * Turn a pattern into parts. Throws a `RangeError` with an actionable message
 * for anything this package cannot honestly render (a time token, an unknown
 * letter, a token that is too wide, an unterminated quote).
 */
export function parseDatePattern(pattern: string): readonly RiviniaDatePatternPart[] {
  if (!pattern) {
    throw new RangeError('Date pattern is empty.');
  }

  const parts: RiviniaDatePatternPart[] = [];
  let literal = '';

  const flush = (): void => {
    if (literal) {
      parts.push({ token: null, value: literal });
      literal = '';
    }
  };

  let index = 0;
  while (index < pattern.length) {
    const char = pattern[index];

    if (char === "'") {
      index++;
      let text = '';
      let closed = false;
      while (index < pattern.length) {
        if (pattern[index] === "'") {
          if (pattern[index + 1] === "'") {
            text += "'";
            index += 2;
            continue;
          }
          index++;
          closed = true;
          break;
        }
        text += pattern[index++];
      }
      if (!closed) {
        throw new RangeError(
          `Unterminated quote in date pattern "${pattern}" — close it with a second '.`,
        );
      }
      literal += text;
      continue;
    }

    const isLetter = /[A-Za-z]/.test(char);
    if (!isLetter) {
      literal += char;
      index++;
      continue;
    }

    // A run of the same letter, case-insensitively: `MmmM` is one token.
    const letter = char.toLowerCase();
    let width = 0;
    while (index < pattern.length && pattern[index].toLowerCase() === letter) {
      width++;
      index++;
    }
    const run = pattern.slice(index - width, index);

    if (TIME_LETTERS.has(char)) {
      throw new RangeError(
        `Date-only pattern: "${run}" is a time token. @rivinia/datepicker has no time ` +
          `component — use y, M, d or E.`,
      );
    }

    if (!'ymde'.includes(letter)) {
      throw new RangeError(
        `Unknown token "${run}" in date pattern "${pattern}". Supported tokens: ${SUPPORTED}.`,
      );
    }

    const max = MAX_WIDTH[letter];
    if (letter === 'd' && width === 3) {
      throw new RangeError(
        `Token "${run}" is not supported — "d" is the day of the month. Use EEEE, EEE or ` +
          `EEEEE for the weekday.`,
      );
    }
    if (width > max) {
      throw new RangeError(
        `Token "${run}" is too wide in date pattern "${pattern}" — "${letter}" accepts at ` +
          `most ${max} characters.`,
      );
    }

    flush();
    parts.push({ token: tokenFor(letter, run, pattern), value: run });
  }

  flush();
  return parts;
}

const TOKEN_OPTIONS: Record<RiviniaPatternToken, Intl.DateTimeFormatOptions> = {
  yyyy: { year: 'numeric' },
  yy: { year: '2-digit' },
  MMMM: { month: 'long' },
  MMM: { month: 'short' },
  MM: { month: '2-digit' },
  M: { month: 'numeric' },
  dd: { day: '2-digit' },
  d: { day: 'numeric' },
  EEEE: { weekday: 'long' },
  EEE: { weekday: 'short' },
  EEEEE: { weekday: 'narrow' },
};

/**
 * Format a day with a pattern: the CONSUMER owns the order and the separators,
 * the LOCALE owns the names and the digits.
 *
 *   formatWithPattern('en-GB', oct25, 'MM/dd/yyyy') === '10/25/2026'
 *   formatWithPattern('ar-EG', oct25, 'dd/MM/yyyy') === '٢٥/١٠/٢٠٢٦'
 *
 * The Arabic output carries no invisible bidi marks: we own the separators,
 * unlike `dateStyle`, whose pattern belongs to ICU.
 */
export function formatWithPattern(
  locale: string,
  date: RiviniaDate,
  pattern: string,
): string {
  const parts = parseDatePattern(pattern);
  const moment = toLocalDate(date);
  const formatters = new Map<RiviniaPatternToken, Intl.DateTimeFormat>();

  return parts
    .map((part) => {
      if (part.token === null) return part.value;
      let formatter = formatters.get(part.token);
      if (!formatter) {
        formatter = intlFormatter(locale, TOKEN_OPTIONS[part.token]);
        formatters.set(part.token, formatter);
      }
      return formatter.format(moment);
    })
    .join('');
}

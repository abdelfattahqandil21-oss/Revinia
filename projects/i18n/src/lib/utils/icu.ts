import type { TranslateParams } from '../models/i18n-types';

/**
 * Minimal ICU MessageFormat (MF1) subset: `{name}` interpolation,
 * `{n, plural, …}` (with `offset:`), `{n, selectordinal, …}`, `{x, select, …}`,
 * `#` inside plural-style arguments, `{n, number[, style]}`, `{d, date[, style]}`,
 * and nesting. Categories resolve via the native `Intl.PluralRules(locale)` —
 * Arabic gets all six forms (zero/one/two/few/many/other) with zero extra
 * dependencies.
 *
 * Supported (and ONLY these — documented subset, translators beware):
 * - `{count, plural, =0 {none} one {# item} other {# items}}`
 * - `{count, plural, offset:1 =0 {none} one {you and # other} other {you and # others}}`
 * - `{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`
 * - `{gender, select, male {He} female {She} other {They}}`
 * - `{amount, number}`, `{ratio, number, percent}`, `{count, number, integer}`,
 *   `{price, number, ::currency/USD}`
 * - `{day, date}`, `{day, date, short|medium|long|full}`
 * - `{name}` plain interpolation (missing params keep the placeholder)
 *
 * Offset semantics follow ICU (ICU4J `PluralFormat`): an explicit `=N` matches
 * the RAW argument value, the plural category is selected with
 * `value - offset`, and `#` renders `value - offset` in the locale's digits.
 *
 * Unsupported or malformed constructs never throw: the raw `{…}` segment is
 * returned as-is and parsing continues after it.
 */
export function formatIcu(
  template: string,
  params: TranslateParams,
  locale: string,
): string {
  return parseMessage(template, 0, template.length, params, locale, null).text;
}

interface Parsed {
  text: string;
  /** Index of the closing `}` (or `end` when the level ran out). */
  next: number;
  ok: boolean;
}

/** The nearest plural-style argument, for `#`. */
interface PluralScope {
  readonly value: number;
  readonly offset: number;
}

function parseMessage(
  src: string,
  start: number,
  end: number,
  params: TranslateParams,
  locale: string,
  plural: PluralScope | null,
): Parsed {
  let out = '';
  let i = start;
  while (i < end) {
    const ch = src[i];
    if (ch === '{') {
      const arg = parseArgument(src, i, end, params, locale, plural);
      if (!arg.ok) return { text: out + src.slice(i, end), next: end, ok: true };
      out += arg.text;
      i = arg.next;
    } else if (ch === '}') {
      return { text: out, next: i, ok: true };
    } else if (ch === '#' && plural !== null) {
      out += formatNumberValue(plural.value - plural.offset, locale, undefined) ?? '#';
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return { text: out, next: i, ok: true };
}

function parseArgument(
  src: string,
  start: number,
  end: number,
  params: TranslateParams,
  locale: string,
  outerPlural: PluralScope | null,
): Parsed {
  let i = skipSpaces(src, start + 1, end);
  const name = readWord(src, i, end);
  i = skipSpaces(src, name.next, end);
  if (i >= end) return { text: src.slice(start, end), next: end, ok: true };
  if (src[i] === '}') {
    const value = params[name.word];
    const rendered =
      value === undefined || value === null || name.word === ''
        ? src.slice(start, i + 1)
        : String(value);
    return { text: rendered, next: i + 1, ok: true };
  }
  if (src[i] !== ',' || name.word === '') {
    return { text: src.slice(start, end), next: end, ok: true };
  }
  i = skipSpaces(src, i + 1, end);
  const type = readWord(src, i, end);
  i = skipSpaces(src, type.next, end);

  if (type.word === 'number' || type.word === 'date') {
    const formatted = formatTypedArgument(src, start, i, end, type.word, params[name.word], locale);
    return formatted ?? rawSegment(src, start, end);
  }

  if (i >= end || src[i] !== ',') return { text: src.slice(start, end), next: end, ok: true };
  if (
    type.word !== 'plural' &&
    type.word !== 'selectordinal' &&
    type.word !== 'select'
  ) {
    return rawSegment(src, start, end);
  }
  i++;
  const numeric = type.word === 'select' ? null : toFiniteNumber(params[name.word]);
  const ordinal = type.word === 'selectordinal';
  const branches = new Map<string, string>();
  let offset = 0;
  i = skipSpaces(src, i, end);
  let closed = false;
  while (i < end) {
    i = skipSpaces(src, i, end);
    if (i < end && src[i] === '}') {
      closed = true;
      break;
    }
    if (type.word !== 'select') {
      const offsetClause = readOffset(src, i, end);
      if (offsetClause) {
        offset = offsetClause.value;
        i = offsetClause.next;
        continue;
      }
    }
    const sel = readSelector(src, i, end);
    if (sel.selector === null) return rawSegment(src, start, end);
    i = skipSpaces(src, sel.next, end);
    if (i >= end || src[i] !== '{') {
      return rawSegment(src, start, end);
    }
    // Bodies render immediately: '#' binds to THIS plural's number, or to an
    // outer plural when nested (select inherits, nested plural overrides).
    const scope: PluralScope | null =
      numeric !== null ? { value: numeric, offset } : outerPlural;
    const body = parseMessage(src, i + 1, end, params, locale, scope);
    branches.set(sel.selector, body.text);
    i = body.next + 1;
  }
  if (!closed) return { text: src.slice(start, end), next: end, ok: true };
  if (type.word === 'select') {
    const raw = params[name.word];
    const key = raw === undefined || raw === null ? '' : String(raw);
    return { text: branches.get(key) ?? branches.get('other') ?? '', next: i + 1, ok: true };
  }
  if (numeric === null) return { text: branches.get('other') ?? '', next: i + 1, ok: true };
  // Explicit `=N` matches the RAW value; the category sees `value - offset`.
  const exact = branches.get(`=${numeric}`);
  if (exact !== undefined) return { text: exact, next: i + 1, ok: true };
  let category: string;
  try {
    category = pluralRules(locale, ordinal).select(numeric - offset);
  } catch {
    category = 'other';
  }
  return { text: branches.get(category) ?? branches.get('other') ?? '', next: i + 1, ok: true };
}

/**
 * `{n, number[, style]}` and `{d, date[, style]}`. Returns `null` when the
 * construct is unsupported (missing/invalid value, unknown style), so the
 * caller can emit the raw segment.
 */
function formatTypedArgument(
  src: string,
  start: number,
  i: number,
  end: number,
  kind: 'number' | 'date',
  value: unknown,
  locale: string,
): Parsed | null {
  let style: string | undefined;
  if (i < end && src[i] === '}') {
    style = undefined;
  } else if (i < end && src[i] === ',') {
    const word = readWord(src, i + 1, end);
    const after = skipSpaces(src, word.next, end);
    if (after >= end || src[after] !== '}') return null;
    style = word.word;
    i = after;
  } else {
    return null;
  }

  const text =
    kind === 'number'
      ? formatNumberValue(value, locale, style)
      : formatDateValue(value, locale, style);
  if (text === null) return null;
  return { text, next: i + 1, ok: true };
}

/**
 * Reads `offset:<number>`. Only plural-style arguments accept it (ICU grammar:
 * before the selectors).
 */
function readOffset(
  src: string,
  i: number,
  end: number,
): { value: number; next: number } | null {
  const start = skipSpaces(src, i, end);
  if (!src.startsWith('offset:', start)) return null;
  let j = start + 'offset:'.length;
  const digits = j;
  while (j < end && /[0-9]/.test(src[j])) j++;
  if (j === digits) return null;
  const value = Number(src.slice(digits, j));
  if (!Number.isFinite(value)) return null;
  return { value, next: j };
}

function toFiniteNumber(value: string | number | boolean | Date | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function skipSpaces(src: string, i: number, end: number): number {
  while (i < end && /\s/.test(src[i])) i++;
  return i;
}

function readWord(src: string, i: number, end: number): { word: string; next: number } {
  const start = skipSpaces(src, i, end);
  let j = start;
  while (j < end && /[^\s,}]+/.test(src[j])) j++;
  return { word: src.slice(start, j), next: j };
}

function readSelector(
  src: string,
  i: number,
  end: number,
): { selector: string | null; next: number } {
  i = skipSpaces(src, i, end);
  if (i < end && src[i] === '=') {
    let j = i + 1;
    if (j < end && src[j] === '-') j++;
    const digits = j;
    while (j < end && /[0-9]/.test(src[j])) j++;
    if (j < end && src[j] === '.' && j + 1 < end && /[0-9]/.test(src[j + 1])) {
      j++;
      while (j < end && /[0-9]/.test(src[j])) j++;
    }
    if (j === digits) return { selector: null, next: i };
    return { selector: src.slice(i, j), next: j };
  }
  const word = readWord(src, i, end);
  if (!word.word) return { selector: null, next: i };
  return { selector: word.word, next: word.next };
}

/** The raw `{…}` segment (balanced braces), so parsing can continue after it. */
function rawSegment(src: string, start: number, end: number): Parsed {
  let depth = 0;
  let i = start;
  while (i < end) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { text: src.slice(start, i + 1), next: i + 1, ok: true };
    }
    i++;
  }
  return { text: src.slice(start, end), next: end, ok: true };
}

// ---------------------------------------------------------------------------
// Intl caching. The parser runs on every render, so formatter construction is
// memoized; the maps are bounded so a long-lived app cannot grow without limit.
// ---------------------------------------------------------------------------

const CACHE_LIMIT = 40;
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const pluralRulesByLocale = new Map<string, Intl.PluralRules>();

function memo<T>(map: Map<string, T>, key: string, create: () => T): T {
  const hit = map.get(key);
  if (hit !== undefined) return hit;
  const created = create();
  if (map.size >= CACHE_LIMIT) map.clear();
  map.set(key, created);
  return created;
}

function pluralRules(locale: string, ordinal: boolean): Intl.PluralRules {
  const key = `${ordinal ? 'o' : 'c'}|${locale}`;
  return memo(pluralRulesByLocale, key, () =>
    new Intl.PluralRules(locale, ordinal ? { type: 'ordinal' } : undefined),
  );
}

function formatNumberValue(
  value: unknown,
  locale: string,
  style: string | undefined,
): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const options = numberOptions(style);
  if (options === null) return null;
  try {
    const key = `${locale}|${JSON.stringify(options)}`;
    return memo(numberFormats, key, () => new Intl.NumberFormat(locale, options)).format(value);
  } catch {
    return null;
  }
}

function numberOptions(style: string | undefined): Intl.NumberFormatOptions | null {
  if (style === undefined) return {};
  if (style === 'percent') return { style: 'percent' };
  if (style === 'integer') return { maximumFractionDigits: 0 };
  if (style.startsWith('::currency/')) {
    const code = style.slice('::currency/'.length);
    if (/^[A-Za-z]{3}$/.test(code)) {
      return { style: 'currency', currency: code.toUpperCase() };
    }
  }
  return null;
}

const DATE_STYLES = new Set(['short', 'medium', 'long', 'full']);

function formatDateValue(
  value: unknown,
  locale: string,
  style: string | undefined,
): string | null {
  const date = toDate(value);
  if (date === null) return null;
  if (style !== undefined && !DATE_STYLES.has(style)) return null;
  const options: Intl.DateTimeFormatOptions =
    style === undefined ? {} : { dateStyle: style as 'short' | 'medium' | 'long' | 'full' };
  try {
    const key = `${locale}|${style ?? ''}`;
    return memo(dateFormats, key, () => new Intl.DateTimeFormat(locale, options)).format(date);
  } catch {
    return null;
  }
}

/** A `Date` (any realm) or epoch milliseconds; nothing else is a date. */
function toDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const date = value as Date;
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

import type { TranslateParams } from '../models/i18n-types';

/**
 * Minimal ICU MessageFormat subset: `{name}` interpolation, `{n, plural, …}`,
 * `{x, select, …}`, `#` inside plurals, and nesting. Categories resolve via
 * the native `Intl.PluralRules(locale)` — Arabic gets all six forms
 * (zero/one/two/few/many/other) with zero extra dependencies.
 *
 * Supported (and ONLY these — documented subset, translators beware):
 * - `{count, plural, =0 {none} one {# item} other {# items}}`
 * - `{gender, select, male {He} female {She} other {They}}`
 * - `{name}` plain interpolation (missing params keep the placeholder)
 *
 * Malformed input never throws: the raw segment is returned as-is.
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

function parseMessage(
  src: string,
  start: number,
  end: number,
  params: TranslateParams,
  locale: string,
  pluralValue: number | null,
): Parsed {
  let out = '';
  let i = start;
  while (i < end) {
    const ch = src[i];
    if (ch === '{') {
      const arg = parseArgument(src, i, end, params, locale, pluralValue);
      if (!arg.ok) return { text: out + src.slice(i, end), next: end, ok: true };
      out += arg.text;
      i = arg.next;
    } else if (ch === '}') {
      return { text: out, next: i, ok: true };
    } else if (ch === '#' && pluralValue !== null) {
      out += String(pluralValue);
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
  outerPlural: number | null,
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
  if (i >= end || src[i] !== ',') return { text: src.slice(start, end), next: end, ok: true };
  if (type.word !== 'plural' && type.word !== 'select') {
    return { text: src.slice(start, end), next: end, ok: true };
  }
  i++;
  const numeric =
    type.word === 'plural' ? toFiniteNumber(params[name.word]) : null;
  const branches = new Map<string, string>();
  i = skipSpaces(src, i, end);
  let closed = false;
  while (i < end) {
    i = skipSpaces(src, i, end);
    if (i < end && src[i] === '}') {
      closed = true;
      break;
    }
    const sel = readSelector(src, i, end);
    if (sel.selector === null) return { text: src.slice(start, end), next: end, ok: true };
    i = skipSpaces(src, sel.next, end);
    if (i >= end || src[i] !== '{') {
      return { text: src.slice(start, end), next: end, ok: true };
    }
    // Bodies render immediately: '#' binds to THIS plural's number, or to an
    // outer plural when nested (select inherits, nested plural overrides).
    const body = parseMessage(
      src,
      i + 1,
      end,
      params,
      locale,
      numeric ?? outerPlural,
    );
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
  const exact = branches.get(`=${numeric}`);
  if (exact !== undefined) return { text: exact, next: i + 1, ok: true };
  let category: string;
  try {
    category = new Intl.PluralRules(locale).select(numeric);
  } catch {
    category = 'other';
  }
  return { text: branches.get(category) ?? branches.get('other') ?? '', next: i + 1, ok: true };
}

function toFiniteNumber(value: string | number | boolean | undefined): number | null {
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

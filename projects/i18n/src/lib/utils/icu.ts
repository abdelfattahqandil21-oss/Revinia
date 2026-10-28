import type { TranslateParams } from '../models/i18n-types';

/**
 * Tolerant hooks for one render. `onMissingParam` fires for each named
 * argument that the message needs but `params` does not provide; the
 * placeholder is still rendered unchanged.
 */
export interface IcuFormatOptions {
  readonly onMissingParam?: (name: string) => void;
}

/**
 * Minimal ICU MessageFormat (MF1) subset: `{name}` interpolation,
 * `{n, plural, …}` (with `offset:`), `{n, selectordinal, …}`, `{x, select, …}`,
 * `#` inside plural-style arguments, `{n, number[, style]}`, `{d, date[, style]}`,
 * nesting, and ICU apostrophe quoting.
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
 * - `''` → one apostrophe; `'{'…'}'` quotes a literal brace
 *
 * Offset semantics follow ICU (ICU4J `PluralFormat`): an explicit `=N` matches
 * the RAW argument value, the plural category is selected with
 * `value - offset`, and `#` renders `value - offset` in the locale's digits.
 *
 * Templates are compiled once into an AST and cached (bounded LRU), so a
 * template rendered on every change-detection pass is not re-parsed.
 *
 * Unsupported or malformed constructs never throw: the raw `{…}` segment is
 * returned as-is and parsing continues after it.
 */
export function formatIcu(
  template: string,
  params: TranslateParams,
  locale: string,
  options?: IcuFormatOptions,
): string {
  return renderMessage(compile(template), params, locale, options);
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type Node =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'param'; readonly name: string; readonly raw: string }
  | { readonly type: 'hash' }
  | {
      readonly type: 'number' | 'date';
      readonly name: string;
      readonly style: string | undefined;
      readonly raw: string;
    }
  | {
      readonly type: 'plural';
      readonly name: string;
      readonly ordinal: boolean;
      readonly offset: number;
      readonly branches: ReadonlyMap<string, readonly Node[]>;
      /** `=N` selectors pre-parsed once, so a render allocates no key string. */
      readonly exacts: ReadonlyMap<number, readonly Node[]>;
    }
  | {
      readonly type: 'select';
      readonly name: string;
      readonly branches: ReadonlyMap<string, readonly Node[]>;
    }
  | { readonly type: 'raw'; readonly value: string };

interface Compiled {
  readonly nodes: readonly Node[];
}

/** 500 templates covers any realistic app; a long-lived tab stays bounded. */
const COMPILE_LIMIT = 500;
const compiled = new Map<string, Compiled>();

function compile(template: string): Compiled {
  // No LRU refresh on a hit: the two extra Map writes per render cost more
  // than the marginal eviction accuracy of a FIFO bound buys.
  const hit = compiled.get(template);
  if (hit !== undefined) return hit;
  const parsed = parseNodes(template, 0, template.length, false);
  const message: Compiled = { nodes: parsed.nodes };
  if (compiled.size >= COMPILE_LIMIT) {
    const oldest = compiled.keys().next();
    if (!oldest.done) compiled.delete(oldest.value);
  }
  compiled.set(template, message);
  return message;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface ParsedNodes {
  readonly nodes: readonly Node[];
  /** Index of the closing `}` (or `end` when the level ran out). */
  readonly next: number;
  readonly closed: boolean;
}

type ArgumentResult =
  | { readonly node: Node; readonly next: number; readonly rest?: false }
  /** Malformed construct: the rest of this level is literal text. */
  | { readonly node?: never; readonly next: number; readonly rest: true };

function parseNodes(src: string, start: number, end: number, inPlural: boolean): ParsedNodes {
  const nodes: Node[] = [];
  let buffer = '';
  const flush = (): void => {
    if (buffer !== '') {
      nodes.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  let i = start;
  while (i < end) {
    const ch = src.charCodeAt(i);
    if (ch === 123 /* { */) {
      flush();
      const arg = parseArgument(src, i, end, inPlural);
      if (arg.rest) {
        nodes.push({ type: 'text', value: src.slice(i, end) });
        return { nodes, next: end, closed: false };
      }
      nodes.push(arg.node);
      i = arg.next;
      continue;
    }
    if (ch === 125 /* } */) {
      flush();
      return { nodes, next: i, closed: true };
    }
    if (ch === 35 /* # */ && inPlural) {
      flush();
      nodes.push({ type: 'hash' });
      i++;
      continue;
    }
    if (ch === 39 /* ' */) {
      const after = i + 1 < end ? src.charCodeAt(i + 1) : -1;
      if (after === 39) {
        buffer += "'";
        i += 2;
        continue;
      }
      if (after === 123 || after === 125 || (inPlural && after === 35)) {
        // Quoted literal: `'{'` … `'}'`; an unterminated quote runs to the end.
        let j = i + 1;
        while (j < end && src.charCodeAt(j) !== 39) j++;
        buffer += src.slice(i + 1, j);
        i = j < end ? j + 1 : end;
        continue;
      }
      buffer += "'";
      i++;
      continue;
    }
    buffer += src[i];
    i++;
  }
  flush();
  return { nodes, next: i, closed: false };
}

function parseArgument(src: string, start: number, end: number, inPlural: boolean): ArgumentResult {
  const rest = (): ArgumentResult => ({ rest: true, next: end });

  let i = skipSpaces(src, start + 1, end);
  const name = readWord(src, i, end);
  i = skipSpaces(src, name.next, end);
  if (i >= end) return rest();
  if (src.charCodeAt(i) === 125 /* } */) {
    return {
      node: { type: 'param', name: name.word, raw: src.slice(start, i + 1) },
      next: i + 1,
    };
  }
  if (src.charCodeAt(i) !== 44 /* , */ || name.word === '') return rest();
  i = skipSpaces(src, i + 1, end);
  const type = readWord(src, i, end);
  i = skipSpaces(src, type.next, end);

  if (type.word === 'number' || type.word === 'date') {
    return parseTyped(src, start, i, end, type.word, name.word);
  }

  if (i >= end || src.charCodeAt(i) !== 44 /* , */) return rest();
  if (type.word !== 'plural' && type.word !== 'selectordinal' && type.word !== 'select') {
    return rawNode(src, start, end);
  }

  const branchPlural = type.word !== 'select';
  i++;
  const branches = new Map<string, readonly Node[]>();
  const exacts = new Map<number, readonly Node[]>();
  let offset = 0;
  i = skipSpaces(src, i, end);
  let closed = false;

  while (i < end) {
    i = skipSpaces(src, i, end);
    if (i < end && src.charCodeAt(i) === 125 /* } */) {
      closed = true;
      break;
    }
    if (branchPlural) {
      const offsetClause = readOffset(src, i, end);
      if (offsetClause) {
        offset = offsetClause.value;
        i = offsetClause.next;
        continue;
      }
    }
    const selector = readSelector(src, i, end);
    if (selector.selector === null) return rawNode(src, start, end);
    i = skipSpaces(src, selector.next, end);
    if (i >= end || src.charCodeAt(i) !== 123 /* { */) {
      return rawNode(src, start, end);
    }
    // A plural body binds `#` to its own number; a select inherits the
    // nearest enclosing plural (or none, where `#` stays literal).
    const body = parseNodes(src, i + 1, end, branchPlural || inPlural);
    branches.set(selector.selector, body.nodes);
    if (selector.selector.charCodeAt(0) === 61 /* = */) {
      const exact = Number(selector.selector.slice(1));
      if (Number.isFinite(exact)) exacts.set(exact, body.nodes);
    }
    i = body.next + 1;
  }
  if (!closed) return rest();

  if (type.word === 'select') {
    return { node: { type: 'select', name: name.word, branches }, next: i + 1 };
  }
  return {
    node: {
      type: 'plural',
      name: name.word,
      ordinal: type.word === 'selectordinal',
      offset,
      branches,
      exacts,
    },
    next: i + 1,
  };
}

/**
 * `{n, number[, style]}` and `{d, date[, style]}`. Unsupported shapes become a
 * raw balanced segment, exactly like the previous parser.
 */
function parseTyped(
  src: string,
  start: number,
  i: number,
  end: number,
  kind: 'number' | 'date',
  name: string,
): ArgumentResult {
  let style: string | undefined;
  let raw: string;
  if (i < end && src.charCodeAt(i) === 125 /* } */) {
    style = undefined;
    raw = src.slice(start, i + 1);
    return { node: { type: kind, name, style, raw }, next: i + 1 };
  }
  if (i >= end || src.charCodeAt(i) !== 44 /* , */) return rawNode(src, start, end);
  const word = readWord(src, i + 1, end);
  const after = skipSpaces(src, word.next, end);
  if (after >= end || src.charCodeAt(after) !== 125 /* } */) {
    return rawNode(src, start, end);
  }
  style = word.word;
  raw = src.slice(start, after + 1);
  return { node: { type: kind, name, style, raw }, next: after + 1 };
}

function rawNode(src: string, start: number, end: number): ArgumentResult {
  const segment = rawSegment(src, start, end);
  return { node: { type: 'raw', value: segment.text }, next: segment.next };
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
  if (src.startsWith('offset:', start)) {
    let j = start + 'offset:'.length;
    const digits = j;
    while (j < end && isDigit(src.charCodeAt(j))) j++;
    if (j === digits) return null;
    const value = Number(src.slice(digits, j));
    if (!Number.isFinite(value)) return null;
    return { value, next: j };
  }
  return null;
}

function isSpace(ch: number): boolean {
  return ch === 32 || (ch >= 9 && ch <= 13) || ch === 0x00a0;
}

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57;
}

function skipSpaces(src: string, i: number, end: number): number {
  while (i < end && isSpace(src.charCodeAt(i))) i++;
  return i;
}

function readWord(src: string, i: number, end: number): { word: string; next: number } {
  const start = skipSpaces(src, i, end);
  let j = start;
  // `{` starts the branch body: `one{# item}` must read the selector as `one`,
  // not `one{# item`. Whitespace, `,`, `{` and `}` end a word.
  while (j < end) {
    const ch = src.charCodeAt(j);
    if (isSpace(ch) || ch === 44 || ch === 123 || ch === 125) break;
    j++;
  }
  return { word: src.slice(start, j), next: j };
}

function readSelector(
  src: string,
  i: number,
  end: number,
): { selector: string | null; next: number } {
  i = skipSpaces(src, i, end);
  if (i < end && src.charCodeAt(i) === 61 /* = */) {
    let j = i + 1;
    if (j < end && src.charCodeAt(j) === 45 /* - */) j++;
    const digits = j;
    while (j < end && isDigit(src.charCodeAt(j))) j++;
    if (j < end && src.charCodeAt(j) === 46 /* . */ && j + 1 < end && isDigit(src.charCodeAt(j + 1))) {
      j++;
      while (j < end && isDigit(src.charCodeAt(j))) j++;
    }
    if (j === digits) return { selector: null, next: i };
    return { selector: src.slice(i, j), next: j };
  }
  const word = readWord(src, i, end);
  if (!word.word) return { selector: null, next: i };
  return { selector: word.word, next: word.next };
}

/** The raw `{…}` segment (balanced braces), so parsing can continue after it. */
function rawSegment(src: string, start: number, end: number): { text: string; next: number } {
  let depth = 0;
  let i = start;
  while (i < end) {
    const ch = src.charCodeAt(i);
    if (ch === 123 /* { */) depth++;
    else if (ch === 125 /* } */) {
      depth--;
      if (depth === 0) return { text: src.slice(start, i + 1), next: i + 1 };
    }
    i++;
  }
  return { text: src.slice(start, end), next: end };
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

interface RenderContext {
  readonly params: TranslateParams;
  readonly locale: string;
  /** The nearest plural-style argument, for `#`. Swapped on the stack. */
  plural: { readonly value: number; readonly offset: number } | null;
  readonly options: IcuFormatOptions | undefined;
}

function renderMessage(
  message: Compiled,
  params: TranslateParams,
  locale: string,
  options: IcuFormatOptions | undefined,
): string {
  return renderNodes(message.nodes, { params, locale, plural: null, options });
}

function renderNodes(nodes: readonly Node[], ctx: RenderContext): string {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'raw':
        out += node.value;
        break;
      case 'hash':
        out +=
          ctx.plural === null
            ? '#'
            : (formatNumberValue(ctx.plural.value - ctx.plural.offset, ctx.locale, undefined) ??
              '#');
        break;
      case 'param': {
        const value = ctx.params[node.name];
        if (value === undefined || value === null || node.name === '') {
          if (node.name !== '') ctx.options?.onMissingParam?.(node.name);
          out += node.raw;
        } else {
          out += String(value);
        }
        break;
      }
      case 'number': {
        const value = ctx.params[node.name];
        reportMissing(ctx, node.name, value);
        out += formatNumberValue(value, ctx.locale, node.style) ?? node.raw;
        break;
      }
      case 'date': {
        const value = ctx.params[node.name];
        reportMissing(ctx, node.name, value);
        out += formatDateValue(value, ctx.locale, node.style) ?? node.raw;
        break;
      }
      case 'plural': {
        const value = ctx.params[node.name];
        const numeric = toFiniteNumber(value);
        reportMissing(ctx, node.name, value);
        let branch: readonly Node[] | undefined;
        if (numeric !== null) {
          branch = node.exacts.get(numeric);
          if (branch === undefined) {
            branch = node.branches.get(selectCategory(numeric - node.offset, node.ordinal, ctx.locale));
          }
          if (branch === undefined) branch = node.branches.get('other');
        } else {
          branch = node.branches.get('other');
        }
        if (branch !== undefined) {
          const saved = ctx.plural;
          ctx.plural = numeric !== null ? { value: numeric, offset: node.offset } : saved;
          out += renderNodes(branch, ctx);
          ctx.plural = saved;
        }
        break;
      }
      case 'select': {
        const value = ctx.params[node.name];
        reportMissing(ctx, node.name, value);
        const key = value === undefined || value === null ? '' : String(value);
        const branch = node.branches.get(key) ?? node.branches.get('other');
        if (branch) out += renderNodes(branch, ctx);
        break;
      }
    }
  }
  return out;
}

function reportMissing(ctx: RenderContext, name: string, value: unknown): void {
  if (value === undefined || value === null) ctx.options?.onMissingParam?.(name);
}

function selectCategory(value: number, ordinal: boolean, locale: string): string {
  const key = `${ordinal ? 1 : 0}|${locale}|${value}`;
  const hit = pluralCategories.get(key);
  if (hit !== undefined) return hit;
  let category: string;
  try {
    category = pluralRules(locale, ordinal).select(value);
  } catch {
    category = 'other';
  }
  if (pluralCategories.size >= CACHE_LIMIT) pluralCategories.clear();
  pluralCategories.set(key, category);
  return category;
}

function toFiniteNumber(value: string | number | boolean | Date | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Intl caching
// ---------------------------------------------------------------------------

const CACHE_LIMIT = 40;
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const pluralRulesByLocale = new Map<string, Intl.PluralRules>();
/** `Intl.PluralRules.select` is the hottest call; counts repeat constantly. */
const pluralCategories = new Map<string, string>();
/** `Intl.NumberFormat.format` is not free; `#` re-renders the same counts. */
const formattedNumbers = new Map<string, string>();
const FORMATTED_NUMBERS_LIMIT = 1000;

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
  let key: string;
  let options: Intl.NumberFormatOptions;
  if (style === undefined) {
    // `#` inside a plural takes this path on every render: keep it allocation-free.
    key = `${locale}|`;
    options = {};
  } else {
    const resolved = numberOptions(style);
    if (resolved === null) return null;
    key = `${locale}|${style}`;
    options = resolved;
  }
  const cacheKey = `${key}${value}`;
  const cached = formattedNumbers.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const text = memo(numberFormats, key, () => new Intl.NumberFormat(locale, options)).format(value);
    if (formattedNumbers.size >= FORMATTED_NUMBERS_LIMIT) formattedNumbers.clear();
    formattedNumbers.set(cacheKey, text);
    return text;
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
/** ISO-8601 calendar date or date-time (requires a `T`/space between them). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

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

/**
 * A `Date` (any realm), epoch milliseconds, or a strict ISO-8601 string.
 * Date-only strings are read as a local calendar date, so `2026-10-28` never
 * renders as the 27th in a negative UTC offset.
 */
function toDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    if (ISO_DATE.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
    }
    if (ISO_DATE_TIME.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const date = value as Date;
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}


/**
 * pnpm check:contrast — plain node, zero dependencies.
 *
 * S5a promises WCAG AA for the theme's token pairs in BOTH schemes, so the
 * pairs are checked against the palette the stylesheet actually ships instead
 * of being trusted. Two things are verified:
 *
 *  1. `styles/theme.css` declares exactly PALETTE: the light block, the
 *     OS-preference dark block and the `data-rv-theme="dark"` block all carry
 *     the documented values, and the two dark blocks are identical (a value
 *     that only lands in one of them is a bug the OS path would hide).
 *  2. every pair in PAIRS meets its threshold in both schemes.
 *
 * The pair table is the contract, and it is deliberately narrow:
 *
 *  - text (4.5:1): `--rv-fg` and `--rv-muted` on `--rv-bg`, plus
 *    `--rv-accent` because S5b paints selected/active labels with it.
 *  - indicator (3:1): the four status tokens. They are used as borders and as
 *    tinted backgrounds; the shipped components never set text in them, and
 *    the light defaults (ok 3.30, warning 3.19) cannot reach 4.5 without
 *    changing the palette's look, which is a consumer-visible change D87 does
 *    not cover.
 *  - decorative (reported, not enforced): `--rv-border`. It is the hairline
 *    around surfaces, not the sole boundary of a control, and it measures
 *    1.32:1 on white today. Enforcing 3:1 would repaint every component's
 *    borders; that is a design decision, not a dark-mode one.
 *
 * Usage: node scripts/check-contrast.mjs [path-to-theme.css]
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_CSS = join(ROOT, 'projects', 'theme', 'styles', 'theme.css');

/** The shipped values, per scheme. Every colour here is a contrast subject. */
export const PALETTE = Object.freeze({
  light: Object.freeze({
    bg: '#ffffff',
    fg: '#111111',
    muted: '#555555',
    border: '#e0e0e0',
    accent: '#5b5bd6',
    danger: '#dc2626',
    ok: '#16a34a',
    info: '#2563eb',
    warning: '#d97706',
  }),
  dark: Object.freeze({
    bg: '#161616',
    fg: '#f2f2f2',
    muted: '#a1a1aa',
    border: '#3f3f46',
    accent: '#8b8bf0',
    danger: '#f87171',
    ok: '#4ade80',
    info: '#60a5fa',
    warning: '#fbbf24',
  }),
});

/**
 * `kind: 'text'` is enforced at 4.5:1, `'indicator'` at 3:1, and
 * `'decorative'` is measured and printed but never fails the gate.
 */
export const PAIRS = Object.freeze([
  Object.freeze({ fg: 'fg', bg: 'bg', kind: 'text' }),
  Object.freeze({ fg: 'muted', bg: 'bg', kind: 'text' }),
  Object.freeze({ fg: 'accent', bg: 'bg', kind: 'text' }),
  Object.freeze({ fg: 'danger', bg: 'bg', kind: 'indicator' }),
  Object.freeze({ fg: 'ok', bg: 'bg', kind: 'indicator' }),
  Object.freeze({ fg: 'info', bg: 'bg', kind: 'indicator' }),
  Object.freeze({ fg: 'warning', bg: 'bg', kind: 'indicator' }),
  Object.freeze({ fg: 'border', bg: 'bg', kind: 'decorative' }),
]);

/**
 * The WCAG AA line per pair kind. Exported because it is part of the promise:
 * a test pins these numbers, so lowering one is a visible decision rather than
 * a quiet edit.
 */
export const MINIMUM = Object.freeze({ text: 4.5, indicator: 3, decorative: 3 });

/** #rrggbb → [r, g, b] in 0..255. Throws on anything else, on purpose. */
export function parseHex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) throw new Error(`not a six-digit hex colour: ${JSON.stringify(value)}`);
  const number = Number.parseInt(match[1], 16);
  return [(number >> 16) & 0xff, (number >> 8) & 0xff, number & 0xff];
}

function linear(channel) {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.x contrast ratio, 1..21. Symmetric. */
export function contrastRatio(a, b) {
  const [first, second] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (first + 0.05) / (second + 0.05);
}

/**
 * Every declaration block in the stylesheet, with the media query it sits in
 * (null at the top level). Selectors are canonicalised: whitespace collapsed,
 * single quotes as double, so `:root:not([data-rv-theme='light'])` and
 * `:root:not([data-rv-theme="light"])` compare equal.
 */
export function parseBlocks(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];

  function declarations(body) {
    const map = new Map();
    for (const piece of body.split(';')) {
      const colon = piece.indexOf(':');
      if (colon === -1) continue;
      const property = piece.slice(0, colon).trim();
      const value = piece.slice(colon + 1).trim();
      if (property && value) map.set(property, value);
    }
    return map;
  }

  function walk(index, media) {
    let cursor = index;
    while (cursor < css.length) {
      while (cursor < css.length && /\s/.test(css[cursor])) cursor++;
      if (cursor >= css.length) return cursor;
      if (css[cursor] === '}') return cursor + 1;

      const start = cursor;
      while (cursor < css.length && !'{;{}'.includes(css[cursor])) cursor++;
      if (css[cursor] === ';') {
        cursor++;
        continue;
      }
      if (css[cursor] === '}') return cursor + 1;

      const prelude = css.slice(start, cursor).trim();
      cursor++; // past '{'

      if (prelude.startsWith('@')) {
        cursor = walk(cursor, prelude.startsWith('@media') ? prelude : media);
        continue;
      }

      let depth = 1;
      const bodyStart = cursor;
      while (cursor < css.length && depth > 0) {
        if (css[cursor] === '{') depth++;
        else if (css[cursor] === '}') depth--;
        if (depth > 0) cursor++;
      }
      const body = css.slice(bodyStart, cursor);
      cursor++; // past '}'
      blocks.push({ selector: canonical(prelude), media, declarations: declarations(body) });
    }
    return cursor;
  }

  walk(0, null);
  return blocks;
}

function canonical(selector) {
  return selector.replace(/\s+/g, ' ').replace(/'/g, '"').trim();
}

const LIGHT_SELECTOR = ':root';
const DARK_ATTRIBUTE_SELECTOR = ':root[data-rv-theme="dark"]';
const DARK_MEDIA_SELECTOR = ':root:not([data-rv-theme="light"])';
const DARK_MEDIA = /prefers-color-scheme:\s*dark/;

function findBlock(blocks, selector, media) {
  return blocks.find(
    (block) =>
      block.selector === selector &&
      (media === null ? block.media === null : media.test(block.media ?? '')),
  );
}

function countBlocks(blocks, selector, media) {
  return blocks.filter(
    (block) =>
      block.selector === selector &&
      (media === null ? block.media === null : media.test(block.media ?? '')),
  ).length;
}

function sameDeclarations(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

/**
 * Measure every pair against a palette. Split from the stylesheet audit so a
 * palette can be tested on its own — a shipped value that fails is a design
 * question, a value that differs from the palette is a drift bug.
 */
export function auditPalette(palette = PALETTE) {
  const problems = [];
  const rows = [];
  for (const scheme of Object.keys(palette)) {
    for (const pair of PAIRS) {
      const fg = palette[scheme][pair.fg];
      const bg = palette[scheme][pair.bg];
      const ratio = contrastRatio(fg, bg);
      const minimum = MINIMUM[pair.kind];
      const passes = pair.kind === 'decorative' ? true : ratio + 1e-9 >= minimum;
      rows.push({
        scheme,
        pair,
        fg,
        bg,
        ratio,
        minimum,
        passes,
        enforced: pair.kind !== 'decorative',
      });
      if (!passes) {
        problems.push(
          `${scheme}: --rv-${pair.fg} on --rv-${pair.bg} is ${ratio.toFixed(2)}:1, below ${minimum}:1 (${pair.kind})`,
        );
      }
    }
  }
  return { rows, problems };
}

/**
 * Audit the stylesheet. Returns { ok, problems, rows } where each row is one
 * measured pair. Content problems come back as `problems`; a palette value that
 * is not a six-digit hex throws from `parseHex`, on purpose.
 */
export function auditThemeCss(source) {
  const problems = [];
  const blocks = parseBlocks(source);

  const light = findBlock(blocks, LIGHT_SELECTOR, null);
  const darkMedia = findBlock(blocks, DARK_MEDIA_SELECTOR, DARK_MEDIA);
  const darkAttribute = findBlock(blocks, DARK_ATTRIBUTE_SELECTOR, null);

  // findBlock reads the first match; a second block with the same selector
  // wins in the browser and would be invisible to every check below.
  for (const [selector, media] of [
    [LIGHT_SELECTOR, null],
    [DARK_MEDIA_SELECTOR, DARK_MEDIA],
    [DARK_ATTRIBUTE_SELECTOR, null],
  ]) {
    const count = countBlocks(blocks, selector, media);
    if (count > 1) {
      problems.push(
        `theme.css declares \`${selector}\` ${count} times: the browser uses the last one, the gate reads the first`,
      );
    }
  }

  if (!light) problems.push('theme.css has no top-level `:root` block');
  if (!darkMedia)
    problems.push(
      `theme.css has no \`${DARK_MEDIA_SELECTOR}\` block inside @media (prefers-color-scheme: dark)`,
    );
  if (!darkAttribute) problems.push(`theme.css has no \`${DARK_ATTRIBUTE_SELECTOR}\` block`);

  const declared = {
    light: light?.declarations ?? new Map(),
    dark: darkAttribute?.declarations ?? new Map(),
  };

  if (light && light.declarations.get('color-scheme') !== 'light') {
    problems.push('the light `:root` block must declare `color-scheme: light`');
  }
  for (const [name, block] of [
    ['media', darkMedia],
    ['attribute', darkAttribute],
  ]) {
    if (block && block.declarations.get('color-scheme') !== 'dark') {
      problems.push(`the ${name} dark block must declare \`color-scheme: dark\``);
    }
  }
  if (
    darkMedia &&
    darkAttribute &&
    !sameDeclarations(darkMedia.declarations, darkAttribute.declarations)
  ) {
    const drifting = [];
    for (const key of new Set([
      ...darkMedia.declarations.keys(),
      ...darkAttribute.declarations.keys(),
    ])) {
      if (darkMedia.declarations.get(key) !== darkAttribute.declarations.get(key))
        drifting.push(key);
    }
    problems.push(
      `the two dark blocks disagree (${drifting.join(', ')}): the OS path would hide a value that only lands in one`,
    );
  }

  const rows = [];
  for (const scheme of ['light', 'dark']) {
    for (const [token, value] of Object.entries(PALETTE[scheme])) {
      const actual = declared[scheme].get(`--rv-${token}`);
      if (actual === undefined) {
        problems.push(`${scheme}: --rv-${token} is not declared in the ${scheme} block`);
      } else if (actual !== value) {
        problems.push(`${scheme}: --rv-${token} is ${actual}, the palette says ${value}`);
      }
    }
  }
  const measured = auditPalette();
  rows.push(...measured.rows);
  problems.push(...measured.problems);

  return { ok: problems.length === 0, problems, rows };
}

export function formatRows(rows) {
  const lines = [];
  for (const row of rows) {
    const verdict = row.enforced ? (row.passes ? 'pass' : 'FAIL') : 'info';
    const minimum = row.enforced ? `min ${row.minimum}` : `recommended ${row.minimum}`;
    lines.push(
      `  ${row.pair.kind.padEnd(10)} --rv-${row.pair.fg} on --rv-${row.pair.bg}  ${row.fg} on ${row.bg}  ` +
        `${row.ratio.toFixed(2).padStart(5)}:1 (${minimum})  ${verdict}`,
    );
  }
  return lines.join('\n');
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  const cssPath = process.argv[2] ?? DEFAULT_CSS;
  const report = auditThemeCss(readFileSync(cssPath, 'utf8'));
  for (const scheme of ['light', 'dark']) {
    console.log(`check:contrast — ${scheme}`);
    console.log(formatRows(report.rows.filter((row) => row.scheme === scheme)));
  }
  for (const problem of report.problems) console.error(`FAIL ${problem}`);
  if (!report.ok) {
    console.error(`check:contrast — ${report.problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('check:contrast — ok');
}

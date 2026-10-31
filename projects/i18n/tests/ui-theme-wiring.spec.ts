import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * D87, the language toggle's share: `--rv-accent` paints the focus ring and the
 * `:active` fill, and forced colors gets system-colour defaults.
 *
 * The accent is always `var(--rv-accent, currentColor)`: a page that never
 * imported the theme has no `--rv-accent`, and D87 requires it to render
 * exactly as before. Assertions run on whitespace-collapsed source so
 * Prettier's wrapping is not part of what the test means.
 */
const CSS_FILE = join(
  process.cwd(),
  'projects/i18n/ui/src/lib/components/language-toggle/language-toggle.css',
);
const source = readFileSync(CSS_FILE, 'utf8');

// Newlines and indent become one space; the spaces a wrapped `var(` /
// `color-mix(` introduces right after `(` or before `)` are removed.
const flat = (css: string) =>
  css.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

function block(css: string, opener: string): string {
  // Flatten first: Prettier splits a long selector across lines, so the opener
  // only exists as written after collapsing whitespace.
  const text = flat(css);
  const start = text.indexOf(opener);
  if (start < 0) throw new Error(`missing rule: ${opener}`);
  let depth = 0;
  for (let index = text.indexOf('{', start); index < text.length; index++) {
    if (text[index] === '{') depth++;
    else if (text[index] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced rule: ${opener}`);
}

describe('language toggle theme wiring', () => {
  it('paints the focus ring with the accent and keeps today’s ring as the fallback', () => {
    expect(flat(source)).toContain(
      'outline: var(--rv-i18n-toggle-focus-ring, 2px solid var(--rv-accent, currentColor));',
    );
    expect(source).not.toMatch(/var\(--rv-accent\)/);
  });

  it('tints the held-down state with the accent over the toggle’s own fill', () => {
    expect(flat(block(source, '.rv-language-toggle__button:active {'))).toContain(
      'color-mix(in srgb, var(--rv-accent, currentColor) 16%, var(--rv-i18n-toggle-bg, var(--rv-bg, transparent)))',
    );
  });

  it('gives the button a forced-colors default it can survive', () => {
    const forced = flat(block(source, '@media (forced-colors: active) {'));

    expect(forced).toMatch(/background-color: Canvas\b/);
    expect(forced).toMatch(/color: CanvasText\b/);
    expect(forced).toMatch(/background-color: Highlight\b/);
    expect(forced).toMatch(/color: HighlightText\b/);
    expect(forced).toMatch(/color: GrayText\b/);
    expect(forced).toMatch(/box-shadow: none/);
  });

  it('writes forced-colors preludes in the only form engines accept', () => {
    const preludes = [...source.matchAll(/@media\s+([^{]+)\{/g)].map((match) => match[1].trim());
    const forcedColours = preludes.filter((prelude) => prelude.includes('forced-colors'));
    expect(forcedColours.length).toBeGreaterThan(0);
    for (const prelude of forcedColours) {
      expect(prelude).toBe('(forced-colors: active)');
    }
  });

  /**
   * D87 says the toggle honours `prefers-reduced-motion` IF it gains motion.
   * It has none today: no transition, no animation, nothing to reduce. If this
   * fails, the toggle grew motion — add the reduced-motion block, do not
   * delete the assertion.
   */
  it('has no motion today, so there is nothing for reduced-motion to switch off', () => {
    expect(source).not.toMatch(/\banimation\b/);
    expect(source).not.toMatch(/\btransition\b/);
    expect(source).not.toMatch(/@keyframes/);
  });
});

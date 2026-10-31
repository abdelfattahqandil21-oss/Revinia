import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * D87, the menu's share: `--rv-accent` paints the focus ring and the active
 * row, and forced colors gets system-colour defaults.
 *
 * The accent is always read as `var(--rv-accent, <today's value>)`: without the
 * theme imported there is no `--rv-accent`, and D87 requires that page to look
 * exactly as it does today. The `light` case of `check:component-theme` is the
 * browser proof; this file keeps the declarations from drifting away from it.
 *
 * Assertions run on whitespace-collapsed source so Prettier's wrapping is not
 * part of what the test means.
 */
const CSS_FILE = join(process.cwd(), 'projects/menu/ui/src/lib/components/menu/menu-panel.css');
const source = readFileSync(CSS_FILE, 'utf8');
// Collapse formatting without changing meaning: newlines and indent become a
// single space, and the spaces a wrapped `var(` / `color-mix(` introduces right
// after `(` or before `)` are removed, so a Prettier wrap cannot fail a test.
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

describe('menu theme wiring', () => {
  it('paints the row focus ring with the accent and keeps today’s ring as the fallback', () => {
    expect(flat(source)).toContain(
      'outline: var(--rv-menu-focus-ring, 2px solid var(--rv-accent, currentColor));',
    );
    expect(source).not.toMatch(/var\(--rv-accent\)/);
  });

  it('tints the active row with the accent, keeping the 10% mix', () => {
    expect(flat(block(source, ".rv-menu-panel [rvmenuitem][data-active='true'] {"))).toContain(
      'background: var(--rv-menu-item-active-bg, color-mix(in srgb, var(--rv-accent, currentColor) 10%, transparent));',
    );
  });

  /**
   * Forced colors forces author colours but not `box-shadow`, and it flattens
   * every background to Canvas — which erases the active row. System colours
   * are the only palette an author may still state.
   */
  it('gives the panel and rows a forced-colors default they can survive', () => {
    const forced = flat(block(source, '@media (forced-colors: active) {'));

    expect(forced).toMatch(/background: Canvas\b/);
    expect(forced).toMatch(/color: CanvasText\b/);
    expect(forced).toMatch(/background: Highlight\b/);
    expect(forced).toMatch(/color: HighlightText\b/);
    expect(forced).toMatch(/color: GrayText\b/);
    expect(forced).toMatch(/box-shadow: none/);
    // 0.45 on top of GrayText double-dims into unreadable.
    expect(forced).toContain('opacity: 1;');
    // The active row's band is Highlight, so its ring cannot also be Highlight.
    expect(forced).toContain(
      ".rv-menu-panel [rvmenuitem][data-active='true']:focus-visible { outline-color: CanvasText; }",
    );
  });

  it('writes forced-colors preludes in the only form engines accept', () => {
    const preludes = [...source.matchAll(/@media\s+([^{]+)\{/g)].map((match) => match[1].trim());
    const forcedColours = preludes.filter((prelude) => prelude.includes('forced-colors'));
    expect(forcedColours.length).toBeGreaterThan(0);
    for (const prelude of forcedColours) {
      expect(prelude).toBe('(forced-colors: active)');
    }
  });
});

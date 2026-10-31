import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * D87, the select's share: `--rv-accent` paints the focus ring, the active row
 * and the selected check mark, and forced colors gets system-colour defaults.
 *
 * The accent is always read as `var(--rv-accent, <today's value>)`, never as a
 * plain `var(--rv-accent)`. A page without the theme imported has no
 * `--rv-accent` at all, and D87 requires that page to render exactly as 0.7.x
 * did; the fallback is what makes that true. `check-component-theme` proves it
 * in a browser (the `light` case), this file proves the declarations cannot
 * silently stop carrying it.
 *
 * Every assertion runs on whitespace-collapsed source, because Prettier wraps
 * these long values and formatting must not decide what the test means.
 */
const PANEL_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/select/select-panel.css',
);
const POPUP_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/popup/select-popup.css',
);

const panel = readFileSync(PANEL_CSS, 'utf8');
const popup = readFileSync(POPUP_CSS, 'utf8');

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

const accentReads = (css: string) => (css.match(/var\(--rv-accent,/g) ?? []).length;

describe('select theme wiring', () => {
  it('paints every focus ring with the accent and keeps today’s ring as the fallback', () => {
    expect(flat(panel)).toContain(
      'outline: var(--rv-select-focus-ring, 2px solid var(--rv-accent, currentColor));',
    );
    expect(flat(panel)).toContain(
      'outline: var(--rv-select-focus-ring, 2px solid var(--rv-accent, color-mix(in srgb, currentColor 55%, transparent)));',
    );
    expect(flat(popup)).toContain(
      'outline: var(--rv-select-focus-ring, 2px solid var(--rv-accent, currentColor));',
    );
    expect(flat(popup)).toContain(
      'outline: var(--rv-select-focus-ring, 2px solid var(--rv-accent, color-mix(in srgb, currentColor 55%, transparent)));',
    );
  });

  it('reads the accent only through a fallback, never bare', () => {
    expect(panel + popup).not.toMatch(/var\(--rv-accent\)/);
    // Eight reads, one per place D87 names: the premium trigger ring, the
    // simple and premium search rings, the check mark, both row rings, and
    // both active-row tints.    expect(accentReads(panel) + accentReads(popup)).toBe(8);
  });

  it('paints the selected check mark with the accent', () => {
    // The generic row-icon rule paints every row svg at (0,2,1), so the tick's
    // rule names the row and the element to outrank it, and sits below the
    // active-row `color: inherit` it ties with.
    expect(
      flat(block(popup, '.rv-select-popup-panel [rvselectpopupitem] svg.rv-select-check {')),
    ).toContain('color: var(--rv-accent, currentColor);');
  });

  it('tints the active row with the accent, keeping the 10% and 7% mixes', () => {
    expect(
      flat(block(popup, ".rv-select-popup-panel [rvselectpopupitem][data-active='true'] {")),
    ).toContain(
      'background: var(--rv-select-item-active-bg, color-mix(in srgb, var(--rv-accent, currentColor) 10%, transparent));',
    );
    expect(
      flat(
        block(
          popup,
          "rv-select-popup[data-variant='premium'] .rv-select-popup-panel [rvselectpopupitem][data-active='true'] {",
        ),
      ),
    ).toContain(
      'background: var(--rv-select-item-active-bg, color-mix(in srgb, var(--rv-accent, currentColor) 7%, transparent));',
    );
  });

  /**
   * Forced colors: the UA forces author colours, but NOT `box-shadow`, and it
   * flattens every background to Canvas — which erases the active row. System
   * colours are the one palette an author may still state, so each piece that
   * would otherwise be lost names one explicitly.
   */
  it('gives the popup a forced-colors default it can survive', () => {
    const forced = flat(block(popup, '@media (forced-colors: active) {'));

    expect(forced).toMatch(/background: Canvas\b/);
    expect(forced).toMatch(/color: CanvasText\b/);
    expect(forced).toMatch(/background: Highlight\b/);
    expect(forced).toMatch(/color: HighlightText\b/);
    expect(forced).toMatch(/color: GrayText\b/);
    expect(forced).toMatch(/box-shadow: none/);
    // The 0.45 opacity would double-dim GrayText into unreadable.
    expect(forced).toContain('opacity: 1;');
    // The premium panel overrides the base rule at higher specificity, so the
    // forced defaults have to name that selector too or a premium panel keeps
    // its shadow and its author background.
    expect(forced).toContain("rv-select-popup[data-variant='premium'] .rv-select-popup-panel");
  });

  it('gives the trigger, search and check mark a forced-colors default', () => {
    const forced = flat(block(panel, '@media (forced-colors: active) {'));

    expect(forced).toMatch(/background: Canvas\b/);
    expect(forced).toMatch(/color: CanvasText\b/);
    expect(forced).toMatch(/Highlight\b/);
    expect(forced).toMatch(/box-shadow: none/);
    expect(forced).toContain("rv-select[data-variant='premium'] .rv-select-trigger");
  });

  /**
   * `@media (forced-colors: active)` has no forgiving grammar: a typo silently
   * disables the whole block and no engine warns (the lesson the @supports
   * prelude check in popup-css.spec.ts already records). Pin the prelude form.
   */
  it('writes forced-colors preludes in the only form engines accept', () => {
    for (const source of [panel, popup]) {
      const preludes = [...source.matchAll(/@media\s+([^{]+)\{/g)].map((match) => match[1].trim());
      const forcedColours = preludes.filter((prelude) => prelude.includes('forced-colors'));
      expect(forcedColours.length).toBeGreaterThan(0);
      for (const prelude of forcedColours) {
        expect(prelude).toBe('(forced-colors: active)');
      }
    }
  });
});

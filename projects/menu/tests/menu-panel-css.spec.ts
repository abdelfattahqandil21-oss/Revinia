import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A `@supports` prelude that no engine can parse is dropped TOGETHER with its
 * whole block, and nothing complains: no engine warns, and lightningcss passes
 * the prelude through verbatim into the bundle (measured).
 *
 * That is not hypothetical. `(a) and not (b)` is invalid CSS — `not` is only
 * legal at the START of a condition — and adding it to the anchor block below
 * silently disabled CSS anchor positioning in every browser, for both the
 * menu and the select. The build stayed green; only the editor's CSS parser
 * objected.
 *
 * So the preludes are checked here with the same parser a browser uses.
 */
const CSS_FILE = join(process.cwd(), 'projects/menu/ui/src/lib/components/menu/menu-panel.css');

function preludes(css: string): string[] {
  return [...css.matchAll(/@supports\s+([^{]+)\{/g)].map((match) => match[1].trim());
}

describe('menu panel CSS', () => {
  it('every @supports prelude is a condition a browser accepts', () => {
    const conditions = preludes(readFileSync(CSS_FILE, 'utf8'));

    // Not vacuous: the anchor block is the reason this file has a prelude at all.
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.some((condition) => condition.includes('anchor-name'))).toBe(true);

    // jsdom implements the real grammar, so `(a) and not (b)` returns false
    // here exactly as it is discarded by Chromium and Firefox.
    expect(typeof CSS.supports).toBe('function');
    for (const condition of conditions) {
      expect(CSS.supports(condition), `browsers drop this prelude: @supports ${condition}`).toBe(
        true,
      );
    }
  });

  /**
   * Hover used to paint its own 8% wash, so the hovered row stayed painted
   * after the arrow keys moved the 10% active row — two rows highlighted at
   * once (measured: bothPainted ["duplicate","delete"]). Pointer hover now
   * activates through the controller, so the active rule is the only paint.
   */
  it('leaves the active state as the only row highlight', () => {
    const source = readFileSync(CSS_FILE, 'utf8');
    expect(source).not.toMatch(/\[rvmenuitem\]:hover\s*\{/);
  });

  /**
   * 16rem of `min-width` plus padding produced a 270px panel around 113px of
   * content, and nothing capped a 548px single-line label at 1280px. The
   * panel is border-box now, so the tokens describe the visible box.
   */
  it('is border-box with a 10rem floor, a 22rem cap and wrapping rows', () => {
    const source = readFileSync(CSS_FILE, 'utf8');

    expect(source).toMatch(/\.rv-menu-panel\s*\{[^}]*box-sizing:\s*border-box/s);
    // Base rule and the anchor-positioning rule both need the same bounds.
    expect(source.match(/min-width:\s*var\(--rv-menu-width,\s*10rem\)/g)?.length).toBe(2);
    expect(
      source.match(
        /max-width:\s*min\(\s*var\(--rv-menu-max-width,\s*22rem\),\s*calc\(100dvw\s*-\s*1rem\)\s*\)/g,
      )?.length,
    ).toBe(2);
    expect(source).toMatch(/\.rv-menu-panel \[rvmenuitem\][^{]*\{[^}]*white-space:\s*normal/s);
    expect(source).toMatch(/\.rv-menu-panel \[rvmenuitem\][^{]*\{[^}]*overflow-wrap:\s*break-word/s);
    expect(source).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  /**
   * The panel scaled from its centre (`transform-origin: 135px 0px`), so the
   * motion read as "a box appearing", not "a menu growing out of its trigger".
   * `transform-origin` only takes physical keywords, so direction is resolved
   * from the `data-rtl` attribute the component writes (no `:dir()`).
   */
  it('scales out of the corner nearest the trigger in both directions', () => {
    const source = readFileSync(CSS_FILE, 'utf8');

    expect(source).toMatch(
      /transform-origin:\s*var\(--rv-menu-origin-x\)\s+var\(--rv-menu-origin-y\)/,
    );
    expect(source).toMatch(
      /\.rv-menu-panel\[data-placement\$='-end'\]\s*\{\s*--rv-menu-origin-x:\s*right;/,
    );
    expect(source).toMatch(
      /\.rv-menu-panel\[data-rtl='true'\]\[data-placement\$='-start'\]\s*\{\s*--rv-menu-origin-x:\s*right;/,
    );
    expect(source).toMatch(
      /\.rv-menu-panel\[data-rtl='true'\]\[data-placement\$='-end'\]\s*\{\s*--rv-menu-origin-x:\s*left;/,
    );
    expect(source).toMatch(
      /\.rv-menu-panel\[data-placement\^='top'\]\s*\{\s*--rv-menu-origin-y:\s*bottom;/,
    );
    expect(source).toMatch(/\.rv-menu-panel\[data-flipped='true'\]\s*\{\s*--rv-menu-origin-y:\s*bottom;/);
    expect(source).toMatch(
      /\.rv-menu-panel\[data-placement\^='top'\]\[data-flipped='true'\]\s*\{\s*--rv-menu-origin-y:\s*top;/,
    );
  });
});

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
 * select and the menu. The build stayed green; only the editor's CSS parser
 * objected.
 *
 * So the preludes are checked here with the same parser a browser uses.
 */
const CSS_FILE = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/popup/select-popup.css',
);

function preludes(css: string): string[] {
  return [...css.matchAll(/@supports\s+([^{]+)\{/g)].map((match) => match[1].trim());
}

describe('select popup CSS', () => {
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
});

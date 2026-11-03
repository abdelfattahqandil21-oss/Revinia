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

/** The one clause in the anchor prelude whose value jsdom's tables lack. */
const JSDOM_VALUE_GAP = 'position-visibility: anchors-visible';

function preludes(css: string): string[] {
  return [...css.matchAll(/@supports\s+([^{]+)\{/g)].map((match) => match[1].trim());
}

/**
 * The first engine version that accepts each anchor feature, in the exact form
 * this block writes it, as [Chrome, Firefox, Safari]
 * (mdn/browser-compat-data, read 2026-11-02). `position-area`'s and
 * `position-try-fallbacks`' Chromium dates are the value-specific ones — the
 * property existed a version or four earlier with a narrower value set. The same
 * table as projects/menu/tests/menu-panel-css.spec.ts, because the two projects
 * run their suites separately and this file must not import from that one.
 */
const ANCHOR_FLOORS: Record<string, number[]> = {
  'anchor-name': [125, 147, 26],
  'anchor-scope': [131, 147, 26],
  'anchor-size': [125, 147, 26],
  'position-anchor': [125, 147, 26],
  'position-area': [129, 147, 26],
  'position-try-fallbacks': [128, 147, 26],
  'position-visibility': [125, 147, 26.2],
};
const ENGINES = ['Chrome', 'Firefox', 'Safari'];

/** The anchor `@supports` block: its condition and its brace-balanced body. */
function anchorBlock(css: string): { prelude: string; body: string } {
  const start = css.search(/@supports\s+[^{]*anchor-name[^{]*\{/);
  expect(start, 'the anchor positioning block is gone from this file').toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const prelude = css.slice(css.indexOf('@supports', start) + '@supports'.length, open).trim();
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) {
      return { prelude, body: css.slice(open + 1, i) };
    }
  }
  throw new Error('unbalanced braces in the anchor block');
}

const namesIn = (text: string) => Object.keys(ANCHOR_FLOORS).filter((n) => text.includes(`(${n}:`));

describe('select popup CSS', () => {
  it('every @supports prelude is a condition a browser accepts', () => {
    const conditions = preludes(readFileSync(CSS_FILE, 'utf8'));

    // Not vacuous: the anchor block is the reason this file has a prelude at all.
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions.some((condition) => condition.includes('anchor-name'))).toBe(true);

    // jsdom implements the real grammar, so `(a) and not (b)` returns false
    // here exactly as it is discarded by Chromium and Firefox.
    expect(typeof CSS.supports).toBe('function');
    for (const raw of conditions) {
      // jsdom's value table is a generation behind the shipped one: it knows the
      // renamed `anchor-visible` but answers false for `anchors-visible`, which
      // Chromium 156, Firefox 157 and WebKit 27.2 all accept (measured
      // 2026-11-02). Dropping that clause here keeps the grammar check — which is
      // what this test is for, since an unparseable condition kills the block in
      // every engine — and the whole condition is asserted in a real engine by
      // e2e/popup/anchor-gate.spec.ts.
      const condition = raw.replace(new RegExp(`\\(\\s*${JSDOM_VALUE_GAP}\\s*\\)\\s*and\\s*`), '');
      expect(CSS.supports(condition), `browsers drop this prelude: @supports ${condition}`).toBe(
        true,
      );
    }
  });

  /**
   * The anchor block is one gate over several features that arrived on
   * different dates, so a probe on the oldest of them lets an engine into a
   * block whose newer declarations it ignores. Measured consequence: Chromium
   * 125-130 has `anchor-name` but not `anchor-scope`, and without the scope a
   * duplicate `anchor-name` resolves to the LAST trigger laid out — this file's
   * own comment records three selects whose panels all landed on the third.
   *
   * The rule the test enforces is therefore not "probe everything" but "no
   * feature inside may be newer than every probe": a feature needs its own
   * clause unless some clause the prelude carries is at least as new in all
   * three engines.
   */
  it('probes every anchor feature the block uses, or a clause at least as new', () => {
    const { prelude, body } = anchorBlock(readFileSync(CSS_FILE, 'utf8'));
    const used = Object.keys(ANCHOR_FLOORS).filter(
      (name) => body.includes(`${name}(`) || new RegExp(`[;{]\\s*${name}\\s*:`, 's').test(body),
    );
    const probed = namesIn(prelude);

    expect(
      [...probed].sort(),
      'the prelude is the contract between the CSS and the JS placement paths',
    ).toEqual(['anchor-name', 'anchor-scope', 'position-area', 'position-visibility']);
    expect(used.length, 'the block writes no anchor feature — the test is vacuous').toBeGreaterThan(
      0,
    );

    for (const name of used) {
      const floor = ANCHOR_FLOORS[name];
      const cover = probed.find((probe) =>
        floor.every((version, engine) => ANCHOR_FLOORS[probe][engine] >= version),
      );
      expect(
        cover,
        [
          `@supports ${prelude}`,
          `  accepts engines that lack \`${name}\` (${ENGINES.map((e, i) => `${e} ${floor[i]}`).join(', ')}),`,
          `  and no probe is as new as it in every engine. Add (${name}: …) to the prelude,`,
          '  or correct ANCHOR_FLOORS if these dates are wrong.',
        ].join('\n'),
      ).toBeTruthy();
    }
  });

  /**
   * A feature the block adopts later has to be added to the table above, not
   * waved through: an unknown name would make the test above pass by omission.
   */
  it('knows the dates for every anchor feature the block writes', () => {
    const { body } = anchorBlock(readFileSync(CSS_FILE, 'utf8'));
    for (const match of body.matchAll(/(?:^|[;{\n])\s*((?:anchor|position)-[a-z-]+)\s*:/g)) {
      expect(
        Object.keys(ANCHOR_FLOORS),
        `add \`${match[1]}\` and its browser-compat-data`,
      ).toContain(match[1]);
    }
  });
});

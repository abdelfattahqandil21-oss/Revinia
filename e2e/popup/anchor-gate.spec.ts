import { expect, test } from '@playwright/test';

/**
 * S7 — the anchor gate, judged by the engines rather than by a support table.
 *
 * The popup has two placement paths: CSS anchor positioning, behind a
 * `@supports` condition, and the component's own coordinates. The condition is
 * the contract between them, and it can fail in two directions. Too weak, and an
 * engine that parses it but lacks one property inside takes the CSS path and
 * misplaces the panel — measured for this repository as three selects whose
 * panels all landed on the third trigger, because Chromium 125-130 has
 * `anchor-name` but ignores `anchor-scope`. Too strong, or unparseable, and the
 * whole block is dropped silently in every engine, so everyone pays for the
 * JavaScript path without anyone noticing the CSS was dead.
 *
 * A unit test cannot settle either: jsdom answers `CSS.supports` from its own
 * version tables (it rejects `position-visibility: anchors-visible`, which all
 * three real engines accept). So this file reads the condition out of the
 * STYLESHEET THE BROWSER ACTUALLY LOADED — which also proves lightningcss did
 * not mangle it — and asks that engine whether it takes it.
 */
const SELECT_TRIGGER = '#single-select .rv-select-trigger';
const SELECT_HOST = '#single-select';
const SELECT_PANEL = '#single-select .rv-select-popup-panel';

/** The anchor features the shipped block sets, as [property, its first value]. */
const FEATURES_USED_BY_THE_BLOCK: ReadonlyArray<readonly [string, string]> = [
  ['anchor-name', '--rv-probe'],
  ['anchor-scope', 'all'],
  ['position-anchor', '--rv-probe'],
  ['position-area', 'block-end span-inline-end'],
  ['position-try-fallbacks', 'flip-block'],
  ['position-visibility', 'anchors-visible'],
];

/** Chromium and WebKit take the CSS path; Firefox is excluded by design (D89). */
const TAKES_THE_CSS_PATH = ['chromium', 'webkit'];

test.describe('anchor positioning gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/select');
    await page.waitForSelector(SELECT_TRIGGER);
  });

  test('the shipped stylesheet still carries the anchor @supports rules', async ({ page }) => {
    const conditions = await page.evaluate(() => {
      const found: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(rules)) {
          const text = rule.cssText ?? '';
          if (rule instanceof CSSSupportsRule && text.includes('anchor-name'))
            found.push(rule.conditionText);
        }
      }
      return found;
    });

    // Both components ship an anchor block; a suite that found none would prove
    // nothing about the gate.
    expect(
      conditions.length,
      'no anchor @supports block survived the build',
    ).toBeGreaterThanOrEqual(2);
    for (const condition of conditions) {
      expect(condition).toContain('anchor-scope');
      expect(condition).toContain('position-visibility');
    }
  });

  test('the answer each engine gives on the whole condition matches the path it should take', async ({
    page,
  }, testInfo) => {
    const conditions = await page.evaluate(() =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter((rule) => rule instanceof CSSSupportsRule && rule.cssText.includes('anchor-name'))
        .map((rule) => (rule as CSSSupportsRule).conditionText),
    );
    expect(conditions.length).toBeGreaterThanOrEqual(2);

    const takes = TAKES_THE_CSS_PATH.includes(testInfo.project.name);
    for (const condition of conditions) {
      expect(
        await page.evaluate((text) => CSS.supports(text), condition),
        `${testInfo.project.name} on: ${condition}`,
      ).toBe(takes);
    }
  });

  test('an engine that takes the condition has every feature the block uses', async ({
    page,
  }, testInfo) => {
    test.skip(
      !TAKES_THE_CSS_PATH.includes(testInfo.project.name),
      'Firefox never enters the block; the probe would prove nothing',
    );

    const missing = await page.evaluate(
      (features) =>
        features
          .map(([property, value]) => [property, CSS.supports(property, value)] as const)
          .filter(([, supported]) => !supported)
          .map(([property]) => property),
      FEATURES_USED_BY_THE_BLOCK.map(([p, v]) => [p, v]),
    );
    expect(missing, 'the prelude lets this engine into a block it cannot render').toEqual([]);
  });

  test('the accepted block is live, and the excluded one is not', async ({ page }, testInfo) => {
    const takes = TAKES_THE_CSS_PATH.includes(testInfo.project.name);
    await page.click(SELECT_TRIGGER);
    await expect(page.locator('#single-select .rv-select-popup-panel')).toBeVisible();

    const scoped = await page.evaluate(
      (host) => getComputedStyle(document.querySelector(host)!).getPropertyValue('anchor-scope'),
      SELECT_HOST,
    );
    const anchored = await page.evaluate(
      (panel) =>
        getComputedStyle(document.querySelector(panel)!).getPropertyValue('position-anchor'),
      SELECT_PANEL,
    );

    if (takes) {
      // `anchor-scope: all` on the host and `position-anchor` on the panel are
      // written nowhere but inside the block, so together they are its
      // fingerprint — and unlike `anchor-name`, which the popup puts on an
      // element of its own, they are read from selectors the component owns.
      expect(scoped.trim()).toBe('all');
      expect(anchored.trim()).toBe('--rv-select-popup-anchor');
    } else {
      // Firefox must show the JS path's absence of the block, not a partial
      // application of it: both declarations come from the same rule.
      expect(scoped.trim(), 'Firefox entered the anchor block').not.toBe('all');
      expect(anchored.trim(), 'Firefox entered the anchor block').not.toBe(
        '--rv-select-popup-anchor',
      );
    }
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Panel metrics contract, read straight from the shipped stylesheets.
 *
 * Measured on the packed 0.6.1 tarball in Chromium, Firefox and WebKit:
 * every panel carried a horizontal scrollbar (`scrollWidth` 105–118 against a
 * 101px `clientWidth`) because rows were `width: 100%` in a content-box, and a
 * panel under a 103px trigger collapsed to 103px with `min-width: 0` — the
 * documented 14rem floor never applied. A 60-character unbroken label pushed
 * `scrollWidth` to 475. These assertions are the contract the fix has to keep.
 */
const POPUP_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/popup/select-popup.css',
);
const SELECT_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/select/select-panel.css',
);

/** Every rule body whose selector list contains `selector`, in source order. */
function ruleBodies(css: string, selector: string): string[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) =>
      selectors
        .split(',')
        .map((part) => part.trim())
        .includes(selector),
    )
    .map(([, , body]) => body);
}

/** The value a selector ends up with: first rule that claims the property. */
function declaration(css: string, selector: string, property: string): string | null {
  for (const body of ruleBodies(css, selector)) {
    const found = body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]+)`));
    if (found) return found[1].trim();
  }
  return null;
}

describe('select panel metrics', () => {
  const popup = readFileSync(POPUP_CSS, 'utf8');
  const select = readFileSync(SELECT_CSS, 'utf8');

  it('never exposes a horizontal scrollbar', () => {
    expect(declaration(popup, '.rv-select-popup-panel', 'overflow-x')).toBe('hidden');
  });

  it('gives the select panel no floor of its own, so it can match the trigger', () => {
    // 0.6.1 carried two floors — 14rem on the trigger, 16rem on the panel — so
    // the panel sat 32px wider than the button that opened it with no consumer
    // opt-in. The floor lives on the select now; the trigger fills it and the
    // panel follows the trigger.
    expect(declaration(select, '.rv-select .rv-select-popup-panel', 'min-width')).toBe('0');
    expect(
      declaration(select, ".rv-select .rv-select-popup-panel[data-top-layer='true']", 'min-width'),
    ).toBe('0');
    expect(declaration(select, 'rv-select', 'min-width')).toBe(
      'min(var(--rv-select-width, 14rem), 100%)',
    );
    expect(declaration(select, '.rv-select-trigger', 'width')).toBe('100%');

    // A standalone popup has no trigger to follow, so it keeps its own floor.
    const topLayer = declaration(
      popup,
      ".rv-select-popup-panel[data-top-layer='true']",
      'min-width',
    );
    expect(topLayer).toContain('--rv-select-popup-width');
    expect(topLayer).toContain('100dvw');
  });

  it('measures rows in the same box model as the panel', () => {
    const row = '.rv-select-popup-panel [rvselectpopupitem]';
    // `width: 100%` plus padding only fits when the padding is inside the box.
    expect(declaration(popup, row, 'box-sizing')).toBe('border-box');
    expect(declaration(popup, row, 'min-width')).toBe('0');
  });

  it('wraps long option text instead of widening the panel', () => {
    expect(declaration(popup, '.rv-select-popup-panel [rvselectpopupitem]', 'overflow-wrap')).toBe(
      'anywhere',
    );
    expect(declaration(select, '.rv-select-label', 'min-width')).toBe('0');
    expect(declaration(select, '.rv-select-label', 'overflow-wrap')).toBe('anywhere');
  });

  it('anchors the panel to the visible trigger, not the full-width wrapper', () => {
    // The CSS anchor path and the JS path must measure the same element: the
    // JS path already uses the first focusable child of the wrapper.
    expect(declaration(select, '.rv-select .rv-select-trigger', 'anchor-name')).toBe(
      '--rv-select-popup-anchor',
    );
    expect(declaration(select, '.rv-select .rv-select-popup-trigger', 'anchor-name')).toBe('none');
  });

  it('mirrors the inline span keyword when the component disagrees with <html>', () => {
    // `position-area` span keywords resolve against the ICB, so an RTL select
    // inside an LTR document needs the opposite ICB side. The component flags
    // the mismatch and these variables carry the swap to all four placements.
    const top = ".rv-select-popup-panel[data-top-layer='true']";
    expect(declaration(popup, top, '--rv-select-popup-span-start')).toBe('span-inline-start');
    expect(declaration(popup, top, '--rv-select-popup-span-end')).toBe('span-inline-end');

    const mirror = ".rv-select-popup-panel[data-top-layer='true'][data-inline-mirror]";
    expect(declaration(popup, mirror, '--rv-select-popup-span-start')).toBe('span-inline-end');
    expect(declaration(popup, mirror, '--rv-select-popup-span-end')).toBe('span-inline-start');

    const placements = [
      ['bottom-start', 'block-end', 'end'],
      ['bottom-end', 'block-end', 'start'],
      ['top-start', 'block-start', 'end'],
      ['top-end', 'block-start', 'start'],
    ] as const;
    for (const [placement, axis, side] of placements) {
      const selector = `.rv-select-popup-panel[data-top-layer='true'][data-placement='${placement}']`;
      expect(declaration(popup, selector, 'position-area')).toBe(
        `${axis} var(--rv-select-popup-span-${side})`,
      );
    }
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import { panelViewportShift } from '../ui/src/lib/utils/panel-motion';

const originalGetComputedStyle = window.getComputedStyle;

function makePanel(height: number, marginBlockStart = '4px'): HTMLElement {
  const panel = document.createElement('div');
  Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: height });
  // jsdom does not resolve logical margin properties; the helper only needs
  // the parsed gap, so a minimal computed-style stub is enough here.
  window.getComputedStyle = (() =>
    ({ marginBlockStart }) as CSSStyleDeclaration) as typeof window.getComputedStyle;
  return panel;
}

function makeTrigger(top: number, bottom: number): HTMLElement {
  const trigger = document.createElement('button');
  trigger.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 200, width: 200, height: bottom - top }) as DOMRect;
  return trigger;
}

afterEach(() => {
  window.getComputedStyle = originalGetComputedStyle;
});

describe('panelViewportShift', () => {
  it('does not move a panel that fits below the field', () => {
    const panel = makePanel(337);
    const trigger = makeTrigger(100, 140);
    expect(panelViewportShift(panel, trigger, 912)).toBe(0);
  });

  it('leaves the flip-above case to CSS', () => {
    // 48px below, 446px above: the CSS flip puts the panel above.
    const panel = makePanel(337);
    expect(panelViewportShift(panel, makeTrigger(458, 500), 560)).toBe(0);
    // Neither side fits: 266px below, 228px above → the deficit is applied.
    expect(panelViewportShift(panel, makeTrigger(240, 282), 560)).toBe(-71);
  });

  it('shifts up by the deficit when neither side fits', () => {
    const panel = makePanel(336.8);
    const trigger = makeTrigger(200, 236.3);
    // viewport 568 - margin 8 - bottom 236.3 - gap 4 = 319.7 below.
    expect(panelViewportShift(panel, trigger, 568)).toBe(-18);
  });

  it('uses the panel gap from the computed style', () => {
    const panel = makePanel(336.8, '16px');
    const trigger = makeTrigger(200, 236.3);
    // 568 - 8 - 236.3 - 16 = 307.7 → 29.1 deficit.
    expect(panelViewportShift(panel, trigger, 568)).toBe(-30);
  });

  it('does nothing without layout (jsdom, SSR, a hidden panel)', () => {
    const panel = makePanel(0);
    expect(panelViewportShift(panel, makeTrigger(200, 236.3), 568)).toBe(0);
    expect(panelViewportShift(makePanel(300), null, 568)).toBe(0);
    expect(panelViewportShift(makePanel(300), makeTrigger(200, 236.3), 0)).toBe(0);
  });
});

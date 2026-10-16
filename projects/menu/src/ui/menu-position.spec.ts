import { describe, expect, it } from 'vitest';
import { computeMenuPosition } from '../../ui/src/lib/menu-position';

const VIEWPORT = { width: 1280, height: 900 };
const PANEL = { width: 256, height: 300 };

describe('computeMenuPosition', () => {
  it('anchors below-start in LTR without flipping', () => {
    const trigger = { left: 100, top: 100, width: 120, height: 40 };
    expect(computeMenuPosition(trigger, PANEL, 'bottom-start', VIEWPORT, false)).toEqual({
      left: 100,
      top: 146,
      flipped: false,
    });
  });

  it('anchors below-end to the trigger right edge', () => {
    const trigger = { left: 300, top: 100, width: 120, height: 40 };
    expect(computeMenuPosition(trigger, PANEL, 'bottom-end', VIEWPORT, false)).toEqual({
      left: 300 + 120 - 256,
      top: 146,
      flipped: false,
    });
  });

  it('mirrors logical sides in RTL', () => {
    const trigger = { left: 300, top: 100, width: 120, height: 40 };
    // bottom-start in RTL aligns to the right edge.
    expect(computeMenuPosition(trigger, PANEL, 'bottom-start', VIEWPORT, true).left).toBe(
      300 + 120 - 256,
    );
    // bottom-end in RTL aligns to the left edge.
    expect(computeMenuPosition(trigger, PANEL, 'bottom-end', VIEWPORT, true).left).toBe(300);
  });

  it('flips above when the bottom overflows but the top fits', () => {
    const trigger = { left: 100, top: 700, width: 120, height: 40 };
    expect(computeMenuPosition(trigger, PANEL, 'bottom-start', VIEWPORT, false)).toEqual({
      left: 100,
      top: 700 - 6 - 300,
      flipped: true,
    });
  });

  it('flips back below for top placements near the viewport top', () => {
    const trigger = { left: 100, top: 100, width: 120, height: 40 };
    expect(computeMenuPosition(trigger, PANEL, 'top-start', VIEWPORT, false)).toEqual({
      left: 100,
      top: 146,
      flipped: true,
    });
  });

  it('stays put when neither side fits, clamped inside the viewport', () => {
    const tiny = { width: 300, height: 400 };
    const trigger = { left: 10, top: 200, width: 120, height: 40 };
    const at = computeMenuPosition(trigger, PANEL, 'bottom-start', tiny, false);
    expect(at.flipped).toBe(false);
    expect(at.left).toBeGreaterThanOrEqual(8);
    expect(at.top + PANEL.height).toBeLessThanOrEqual(400 - 8);
  });

  it('shifts to the fitting horizontal side near the right edge', () => {
    const trigger = { left: 1100, top: 100, width: 120, height: 40 };
    const at = computeMenuPosition(trigger, PANEL, 'bottom-start', VIEWPORT, false);
    expect(at.left).toBe(1100 + 120 - 256);
    expect(at.left + PANEL.width).toBeLessThanOrEqual(1280 - 8);
  });
});

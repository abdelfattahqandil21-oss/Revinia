import type { SelectPopupPlacement } from '../models/select-popup.types';

/** Trigger rect in viewport coordinates. */
export interface SelectPopupTriggerRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Measured panel size. */
export interface SelectPopupPanelSize {
  readonly width: number;
  readonly height: number;
}

/** Viewport size. */
export interface SelectPopupViewport {
  readonly width: number;
  readonly height: number;
}

/** Fixed-position coordinates plus whether the vertical side flipped. */
export interface SelectPopupCoordinates {
  readonly left: number;
  readonly top: number;
  readonly flipped: boolean;
}

/** Gap between trigger and panel. */
export const SELECT_POPUP_GAP = 6;
/** Minimum distance kept from viewport edges. */
const EDGE = 8;

/**
 * Pure top-layer position for a menu panel: anchors to the trigger per
 * `placement` (logical, RTL-aware), flips to the opposite vertical side when
 * the preferred side overflows but the other fits, then clamps inside the
 * viewport. Zero DOM access — unit-testable with fake rects; the component
 * only measures and applies.
 */
export function computeSelectPopupPosition(
  trigger: SelectPopupTriggerRect,
  panel: SelectPopupPanelSize,
  placement: SelectPopupPlacement,
  viewport: SelectPopupViewport,
  rtl: boolean,
  gap = SELECT_POPUP_GAP,
): SelectPopupCoordinates {
  const [vertical, horizontal] = placement.split('-');
  const below = vertical !== 'top';
  // Logical start: left edge in LTR, right edge in RTL.
  const alignLeft = (horizontal !== 'end') !== rtl;

  let left = alignLeft ? trigger.left : trigger.left + trigger.width - panel.width;
  let top = below ? trigger.top + trigger.height + gap : trigger.top - gap - panel.height;
  let flipped = false;

  const fitsBelow = trigger.top + trigger.height + gap + panel.height <= viewport.height - EDGE;
  const fitsAbove = trigger.top - gap - panel.height >= EDGE;
  if (below && top + panel.height > viewport.height - EDGE && fitsAbove) {
    top = trigger.top - gap - panel.height;
    flipped = true;
  } else if (!below && top < EDGE && fitsBelow) {
    top = trigger.top + trigger.height + gap;
    flipped = true;
  }

  const fitsLeft = trigger.left + trigger.width - panel.width >= EDGE;
  const fitsRight = trigger.left + panel.width <= viewport.width - EDGE;
  if (alignLeft && left + panel.width > viewport.width - EDGE && fitsLeft) {
    left = trigger.left + trigger.width - panel.width;
  } else if (!alignLeft && left < EDGE && fitsRight) {
    left = trigger.left;
  }

  left = Math.min(Math.max(left, EDGE), Math.max(EDGE, viewport.width - panel.width - EDGE));
  top = Math.min(Math.max(top, EDGE), Math.max(EDGE, viewport.height - panel.height - EDGE));
  return { left: Math.round(left), top: Math.round(top), flipped };
}

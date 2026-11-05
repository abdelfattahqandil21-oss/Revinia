import type { DestroyRef } from '@angular/core';

export type PopupDirection = 'ltr' | 'rtl';
export type PopupPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

export interface PopupRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PopupSize {
  readonly width: number;
  readonly height: number;
}

export interface PopupViewport {
  readonly width: number;
  readonly height: number;
}

export interface PopupPosition {
  readonly left: number;
  readonly top: number;
  readonly flipped: boolean;
}

export interface PopupDismissalOptions {
  readonly document: Document | null;
  readonly window: Window | null;
  readonly host: () => Element | null;
  readonly panel: () => Element | null;
  readonly editableFocusInsidePanel: () => boolean;
  readonly dismiss: () => void;
  readonly onCleanup?: (cleanup: () => void) => void;
}

export const POPUP_GAP = 6;
export const POPUP_EDGE_INSET = 8;

/** Pure geometry calculation. Direction is always supplied by the host. */
export function computePopupPosition(
  trigger: PopupRect,
  panel: PopupSize,
  placement: PopupPlacement,
  viewport: PopupViewport,
  direction: PopupDirection,
  gap = POPUP_GAP,
): PopupPosition {
  const [vertical, horizontal] = placement.split('-');
  const below = vertical !== 'top';
  const alignLeft = (horizontal !== 'end') !== (direction === 'rtl');

  let left = alignLeft ? trigger.left : trigger.left + trigger.width - panel.width;
  let top = below ? trigger.top + trigger.height + gap : trigger.top - gap - panel.height;
  let flipped = false;

  const fitsBelow = trigger.top + trigger.height + gap + panel.height <= viewport.height - POPUP_EDGE_INSET;
  const fitsAbove = trigger.top - gap - panel.height >= POPUP_EDGE_INSET;
  if (below && top + panel.height > viewport.height - POPUP_EDGE_INSET && fitsAbove) {
    top = trigger.top - gap - panel.height;
    flipped = true;
  } else if (!below && top < POPUP_EDGE_INSET && fitsBelow) {
    top = trigger.top + trigger.height + gap;
    flipped = true;
  }

  const fitsLeft = trigger.left + trigger.width - panel.width >= POPUP_EDGE_INSET;
  const fitsRight = trigger.left + panel.width <= viewport.width - POPUP_EDGE_INSET;
  if (alignLeft && left + panel.width > viewport.width - POPUP_EDGE_INSET && fitsLeft) {
    left = trigger.left + trigger.width - panel.width;
  } else if (!alignLeft && left < POPUP_EDGE_INSET && fitsRight) {
    left = trigger.left;
  }

  left = Math.min(Math.max(left, POPUP_EDGE_INSET), Math.max(POPUP_EDGE_INSET, viewport.width - panel.width - POPUP_EDGE_INSET));
  top = Math.min(Math.max(top, POPUP_EDGE_INSET), Math.max(POPUP_EDGE_INSET, viewport.height - panel.height - POPUP_EDGE_INSET));
  return { left: Math.round(left), top: Math.round(top), flipped };
}

/** Attach equivalent outside-dismissal listeners to one open host instance. */
export function bindPopupDismissal(
  options: PopupDismissalOptions,
  destroyRef: DestroyRef,
): void {
  const { document: doc, window: win } = options;
  if (!doc || !win) return;

  const onPointer = (event: PointerEvent) => {
    const host = options.host();
    if (host && !host.contains(event.target as Node)) options.dismiss();
  };
  const onScroll = (event: Event) => {
    const panel = options.panel();
    if (panel && event.target instanceof Node && panel.contains(event.target)) return;
    options.dismiss();
  };
  let widthAtOpen = win.innerWidth;
  const onResize = () => {
    const width = win.innerWidth;
    if (width === widthAtOpen && options.editableFocusInsidePanel()) return;
    widthAtOpen = width;
    options.dismiss();
  };

  doc.addEventListener('pointerdown', onPointer);
  win.addEventListener('scroll', onScroll, true);
  win.addEventListener('resize', onResize);
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    doc.removeEventListener('pointerdown', onPointer);
    win.removeEventListener('scroll', onScroll, true);
    win.removeEventListener('resize', onResize);
  };
  options.onCleanup?.(cleanup);
  destroyRef.onDestroy(cleanup);
}

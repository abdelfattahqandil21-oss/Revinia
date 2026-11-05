import type { PopupPlacement, PopupPosition, PopupRect, PopupSize, PopupViewport } from '@rivinia/popup';
import { POPUP_GAP, computePopupPosition } from '@rivinia/popup';
import type { SelectPopupPlacement } from '../models/select-popup.types';

export type SelectPopupTriggerRect = PopupRect;
export type SelectPopupPanelSize = PopupSize;
export type SelectPopupViewport = PopupViewport;
export type SelectPopupCoordinates = PopupPosition;
export const SELECT_POPUP_GAP = POPUP_GAP;

export function computeSelectPopupPosition(
  trigger: SelectPopupTriggerRect,
  panel: SelectPopupPanelSize,
  placement: SelectPopupPlacement,
  viewport: SelectPopupViewport,
  rtl: boolean,
  gap = SELECT_POPUP_GAP,
): SelectPopupCoordinates {
  return computePopupPosition(
    trigger,
    panel,
    placement as PopupPlacement,
    viewport,
    rtl ? 'rtl' : 'ltr',
    gap,
  );
}

import type { PopupPlacement, PopupPosition, PopupRect, PopupSize, PopupViewport } from '@rivinia/popup';
import { POPUP_GAP, computePopupPosition } from '@rivinia/popup';
import type { RiviniaMenuPlacement } from '@rivinia/menu';

export type MenuTriggerRect = PopupRect;
export type MenuPanelSize = PopupSize;
export type MenuViewport = PopupViewport;
export type MenuCoordinates = PopupPosition;
export const MENU_GAP = POPUP_GAP;

export function computeMenuPosition(
  trigger: MenuTriggerRect,
  panel: MenuPanelSize,
  placement: RiviniaMenuPlacement,
  viewport: MenuViewport,
  rtl: boolean,
  gap = MENU_GAP,
): MenuCoordinates {
  return computePopupPosition(
    trigger,
    panel,
    placement as PopupPlacement,
    viewport,
    rtl ? 'rtl' : 'ltr',
    gap,
  );
}

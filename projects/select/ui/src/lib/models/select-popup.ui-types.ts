import type { SelectPopupPlacement } from './select-popup.types';

/** Panel placement relative to the trigger. Logical (RTL-aware). */
export type SelectPopupUiPlacement = SelectPopupPlacement;

/**
 * Appearance skin. `simple` is the original look; `premium` adds the longer
 * origin-aware open, the lifted trigger, the styled scrollbar and the loading
 * skeleton. Both are the same DOM — the flag only becomes `data-variant` and
 * every value a `--rv-select-*` token.
 */
export type RiviniaSelectVariant = 'simple' | 'premium';

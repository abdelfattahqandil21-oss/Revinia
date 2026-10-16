/**
 * Responsive size presets. Dimensions are ceilings, not mandates: every
 * preset is a CSS custom property (`--rv-modal-width-*`) the consumer can
 * override without touching library source. `auto` sizes to content.
 */
export type RiviniaModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';

/**
 * Placement in the viewport. `start`/`end` are logical (RTL-aware).
 * `fullscreen` covers the viewport (safe-area aware). Implemented with
 * plain CSS on the native `<dialog>` — no positioning engine.
 */
export type RiviniaModalPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'center-start'
  | 'center-end'
  | 'fullscreen';

/** Entrance/exit animation preset. `none` disables motion entirely. */
export type RiviniaModalAnimation =
  'fade' | 'scale' | 'slide-top' | 'slide-bottom' | 'slide-start' | 'slide-end' | 'none';

/** Backdrop click policy (mirrors the headless `ModalDismissPolicy`). */
export type RiviniaModalBackdrop = 'close' | 'static' | 'disabled';

/**
 * Visual + interaction options for {@link RiviniaModalDialog}. Independent
 * knobs only — no `disableClose` bundle (Escape, backdrop and the close
 * button stay separately configurable, like the headless policy).
 */
export interface RiviniaModalUiOptions {
  /** @default 'md' */
  readonly size?: RiviniaModalSize;
  /** @default 'center' */
  readonly position?: RiviniaModalPosition;
  /** @default 'scale' */
  readonly animation?: RiviniaModalAnimation;
  /** Escape requests dismissal via the configured path. @default true */
  readonly closeOnEscape?: boolean;
  /** Backdrop click behavior. @default 'close' */
  readonly backdrop?: RiviniaModalBackdrop;
  /** Render the header close button. @default true */
  readonly showCloseButton?: boolean;
}

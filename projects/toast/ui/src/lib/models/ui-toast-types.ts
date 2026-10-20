/**
 * Stack anchor. Logical (`start`/`end`) variants are RTL-aware. The user
 * picks exactly one — default `'bottom-end'` (sonner-compatible default).
 * Items render in `active()` order (oldest first); the container anchors
 * that end of the viewport.
 */
export type ToastPosition =
  'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

/** Entrance animation. Exit is a quick fade (see `RiviniaToastList`). */
export type ToastAnimation = 'slide' | 'fade' | 'none';

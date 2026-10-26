/**
 * Shared panel-motion facts for the two pickers.
 *
 * The CSS owns the actual duration (`--rv-datepicker-exit-duration`); this
 * fallback only decides whether the exit state is worth entering and bounds
 * the wait when `animationend` never arrives (jsdom, a consumer's
 * `animation: none`, a background tab). It is deliberately longer than the
 * default 100ms animation.
 */
export const PANEL_EXIT_FALLBACK_MS = 500;

/**
 * True only in a real browser that has not asked for reduced motion.
 *
 * jsdom has no `matchMedia`; treating that as "no animation" keeps the
 * component deterministic in unit tests and on a server, where there is no
 * frame to animate. `matchMedia` can throw in exotic embedders; a nicety must
 * never break closing.
 */
export function panelExitMotionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.matchMedia !== 'function') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * The vertical offset, in pixels, that keeps an open panel inside the viewport.
 *
 * CSS anchor positioning puts the panel BELOW its field and flips it above
 * when it does not fit below and the space above is enough. When neither side
 * fits — a short viewport with the field near the middle — the browser keeps
 * it below and the bottom edge is clipped (measured 9.1px at 320×568).
 *
 * This returns a NEGATIVE shift (up) for that case only, so the panel overlaps
 * its field by the deficit instead of leaving the viewport. The caller applies
 * it with the `translate` property, which composes with the `transform` the
 * enter/exit keyframes animate and does not disturb the anchor math.
 *
 * `offsetHeight` is layout height and ignores transforms, so it is safe to
 * read during the entrance animation. jsdom and SSR report 0 and shift nothing.
 */
export function panelViewportShift(
  panel: HTMLElement,
  trigger: HTMLElement | null | undefined,
  viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight,
): number {
  if (!trigger || !viewportHeight) return 0;
  const height = panel.offsetHeight;
  if (height <= 0) return 0;

  const rect = trigger.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return 0;

  let gap = 4;
  if (typeof getComputedStyle === 'function') {
    const parsed = Number.parseFloat(getComputedStyle(panel).marginBlockStart);
    if (Number.isFinite(parsed)) gap = parsed;
  }

  const margin = 8;
  const below = viewportHeight - margin - rect.bottom - gap;
  if (height <= below) return 0;

  const above = rect.top - gap - margin;
  // The CSS flip handles the "fits above" case on its own.
  if (height <= above) return 0;

  return -Math.ceil(height - below);
}

## 2026-10-26 — D58: the panel clamps to the viewport height (supersedes the D56 limit)

- Context: D56 measured a 9.1px bottom overflow at 320×568 (panel bottom 577.1
  on a 568 viewport). The user asked for it to be fixed before the release.
- CSS could not express it: the panel is 336.8px tall, the viewport is 568px,
  and neither the space below (319.7px) nor above (228px) fits, so
  `position-try-fallbacks: flip-block` correctly keeps it below. `max-block-size`
  cannot help either — the panel is shorter than the viewport; its POSITION is
  the problem, not its size.
- Decision: a **measured vertical clamp**, in the shared
  `panelViewportShift()` (`utils/panel-motion.ts`):
  - space below = `innerHeight - 8 - trigger.bottom - gap` (gap read from the
    computed `margin-block-start`, so a consumer's `--rv-datepicker-panel-gap`
    is respected);
  - if the panel's `offsetHeight` fits below, or fits above (the CSS flip owns
    that case), the shift is `0`;
  - otherwise the shift is `-(height - spaceBelow)`, applied with a negative
    `translate` via `--rv-datepicker-panel-shift`. `translate` is used, not
    `transform`: the enter/exit keyframes animate `transform` and would
    overwrite an inline transform.
  - `offsetHeight` is layout height and ignores transforms, so the measurement
    is correct during the entrance animation; jsdom/SSR report 0 and shift
    nothing.
  - a `ResizeObserver` on the panel (and `window.resize` while open) recomputes
    it when the panel grows — a DST warning or a wrapped action row.
- Verified (2026-10-26): 468/468 tests in **15 files** (new
  `tests/panel-motion.spec.ts`: fits below, flip above, neither side, custom
  gap, no-layout). Chromium production build: narrow 320×568 panel bottom
  **560.1** (7.9px inside the edge, shift -28px), `Now`/`OK` at 549.6; desktop
  973×912 unchanged (shift 0, panel 134.7, gap 5); RTL 973×912 unchanged
  (shift 0, panel 308 wide, bottom 892.5). Tarball and consumer rebuild
  re-run after the README edit; not published.

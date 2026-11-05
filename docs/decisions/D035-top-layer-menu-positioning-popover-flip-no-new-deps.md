## 2026-10-16 — D35: top-layer menu positioning (popover + flip), no new deps

- Context: absolute panels overflowed near viewport edges and clipped under
  `overflow:hidden` ancestors; long lists had no height cap.
- Decision: manual `popover` (declared only when `showPopover` exists — an
  unshown popover is unfocusable, which broke jsdom focus until conditional)
  - measured `fixed` coordinates via pure `computeMenuPosition` (RTL-aware,
    flips the fitting side, clamps; unit-tested with fake rects) + outside
    scroll/resize closes (panel scroll exempt). Enter animation gated on
    `data-positioned`. Absolute classes stay as the no-popover fallback.
- Also closed: Arabic search normalization (tashkeel/tatweel/alef forms,
  tested), `menuitemcheckbox`+`aria-checked` for multi options (single stays
  `menuitem`), modal managed-exit UI test + back-button non-goal doc,
  select form-wiring recipe. Toast timers verified timestamp-based (no fix
  needed); toast-in-modal pattern re-verified live (`onTop:true`).
- Deferred (explicit): full ControlValueAccessor, option groups, huge-list
  virtualization — roadmap, not publish blockers.
- Verified: menu 19/19, select 13/13, modal 51/51 tests; headed flip/clip/
  no-stuck-layer/toast-in-modal runs, zero errors. NOT published.

## 2026-10-30 — D76: the select's search is pinned to the panel, and the bar owns the paint

- **What shipped.** `@rivinia/select` 0.7.0 (prepared, unpublished): a
  searchable panel keeps its filter input in view while the list scrolls. The
  input sits inside a `position: sticky` bar that paints the panel surface, and
  a searchable panel declares `scroll-padding-top` so a keyboard-focused row
  is not covered by the bar.
- **Why it had to move into the component.** The panel is the scrollport
  (`overflow-y: auto`), and the input was a plain first child of it — measured
  in Chromium on the packed tarball: input top 7px before scrolling, −154px
  after a 300px scroll (the panel stops at `scrollTop` 161). Consumers did try
  to pin it from the outside: the hosted governorate demo carried
  `.rv-select-search { position: sticky; …; background: var(…) }`, and it only
  half-worked — `position: sticky` applied while the background lost the
  cascade to the component's own `background: transparent` (same specificity,
  and Angular injects component styles after the app stylesheet). Measured in
  that build: `position: sticky`, computed background `rgba(0, 0, 0, 0)`, rows
  on screen through the input. A consumer-side fix therefore needs a
  specificity bump (`rv-select .rv-select-search`) and repeats per project;
  the component owns this one.
- **Why a bar, not `position: sticky` on the input.** The input paints
  transparent so the panel shows through; sticky keeps its box in the flow and
  makes it scroll over the rows, so the box must paint. The wrapper also owns
  the 4px gap below the input, which would otherwise stay transparent and let
  rows peek through while scrolling. The input's own rule is unchanged apart
  from a removed `margin-bottom`.
- **Overrides stay token-driven.** `--rv-select-search-bg` (defaults to the
  panel surface token), `--rv-select-search-gap` (0.25rem) and
  `--rv-select-search-offset` (3rem, the panel's `scroll-padding-top`) are
  read with fallbacks, so an ancestor theme still wins — same boundary as
  every other select token.
- **The pinned bar left a strip of the list above it.** Found on the owner's
  dark-mode demo: a sliver of the previous row (its count, half a label)
  stayed visible between the panel's top edge and the search. The scrollport's
  `padding: var(--rv-select-popup-pad)` sits outside the bar's containing
  block, and a sticky box is clamped to that block, so `top: 0` stopped at the
  content edge — measured 7px = 6px padding + 1px border, at every scroll
  offset (40/80/120/160). Searchable panels now drop the top padding and the
  bar carries it (`padding-top: var(--rv-select-popup-pad)`), so the bar's top
  edge is the scrollport's content edge. Measured after: band 1px (the border
  itself), input top 328.9 unchanged, first row unchanged, bottom and inline
  padding 6px unchanged, `scroll-padding-top` 48px unchanged. The alternative
  (a negative `top`) cannot work: the same clamp keeps the bar inside its
  containing block.
- **No new API, no DOM contract change for rows.** `.rv-select-search` keeps
  its class and its position in the panel's first slot; the bar is a wrapper
  around it. `reachEnd` reads `scrollHeight`/`scrollTop`/`clientHeight`, which
  `scroll-padding` does not touch.
- **Tests.** `projects/select/tests/select-search-sticky.spec.ts` (5 cases):
  the CSS contract (sticky, `top: 0`, surface-backed background, transparent
  input), `scroll-padding-top` on the searchable panel, the padding handover
  (`padding-top: 0` on the scrollport, the bar carrying
  `var(--rv-select-popup-pad)`), the input living inside the bar, and no bar on
  a non-searchable select. Mutation-checked: removing the `position: sticky`
  line fails the first case; removing the bar's `padding-top` fails the third;
  the structure cases fail against the pre-fix template.
- **Not covered.** No engine here measures sticky repaint cost on very long
  virtual lists; the bar is one composited layer and `reachEnd` was re-run in
  the consumer page after the change.

## 2026-10-30 — D75: select panel metrics, and `position-area` resolves against the ICB

- **What shipped.** `@rivinia/select` 0.7.0 (prepared, unpublished): the panel
  no longer scrolls horizontally, the panel and its trigger are one width,
  `*-end` placements sit on the trigger button, RTL panels align in a
  mixed-direction page, and the README's ARIA section was rewritten from the
  measured DOM.
- **Panel metrics.** Rows were `width: 100%` in a content box, so padding pushed
  every row past the panel: `scrollWidth` 105–118 against `clientWidth` 101, and
  `overflow-y: auto` turned that into a horizontal scrollbar. Rows are
  `border-box` with `min-width: 0` and `overflow-wrap: anywhere`; the panel is
  `overflow-x: hidden` with a `border-box` of its own. Everything measured
  identical in Chromium 156, Firefox 157 and WebKit 27.2 after the fix.
- **One control, one width.** The first pass fixed a 103px trigger opening a
  103px panel by giving the panel its own floor — but the popup primitive's
  floor (16rem) and the trigger's (14rem) then disagreed, so with no consumer
  opt-in the panel sat 32px wider than the button (measured 256 over 224). The
  owner's call: the panel must read as the same box. One floor now lives on the
  `rv-select` host, `min(var(--rv-select-width, 14rem), 100%)`; the trigger is
  `width: 100%` of it, the select scopes the panel to `min-width: 0` so
  `anchor-size(inline)` / `root.style.width` decide, and a standalone
  `rv-select-popup` keeps its own floor because it has no trigger to follow.
  The host is where the floor has to be: on the trigger the containing block is
  a chain of shrink-to-fit boxes, so the `100%` inside `min()` resolved against
  an indefinite width and collapsed to 0 — measured 103px where 14rem was
  documented, and only a select in a grid cell (a definite width) honoured it.
  The host's containing block is the consumer's layout, where the percentage is
  a real width. The trigger is `border-box`: `width: 100%` with content-box
  borders made it 2px wider than the select, and the panel followed. A
  container narrower than the floor shrinks both together and the labels wrap
  — the "narrow panel" is now intended behaviour, which is why the e2e asserts
  equality instead of a minimum.
- **Design minimum: 10rem.** Measured on the packed tarball, rows stay on one
  line down to a 160px container (40px rows) and start wrapping below it —
  55px at 128, 94px at 112, 114px at 96 — while the trigger value truncates
  with an ellipsis. So 160px is the width where the shape holds; below it the
  container wins. Deliberately no hard floor: a fixed minimum would overflow a
  narrower cell and bring back the page-level horizontal scroll this release
  removed. The control's own intrinsic minimum is ~103px (padding, gap and
  chevron), and even there the panel matches it and the page does not scroll.
- **The platform finding: `position-area` is ICB-relative.** Span keywords
  (`span-inline-start`/`-end`) resolve against the containing block, and a
  top-layer popover's containing block is the ICB — `<html>`'s direction, not
  the panel's. A `dir="rtl"` select inside an LTR document opened at 649..905
  (left edges aligned to a 649..752 trigger) where 496..752 is correct;
  `flip-inline` does not help because nothing overflows. The component compares
  its own computed direction with `document.documentElement`'s and sets
  `data-inline-mirror`, which swaps a pair of custom properties the four
  placement rules read. `:dir()` cannot do this: it follows the HTML `dir`
  attribute, so a `direction: rtl` wrapper leaves `:dir()` reporting `ltr`
  (measured in Chromium and WebKit). Physical keywords would sidestep it but
  `CSS.supports('position-area', 'block-end span-right')` is false in both
  engines, and an unsupported value is dropped silently.
- **Same finding in the JS path.** `isRtl()` preferred `document.documentElement.dir`
  over computed direction, so an LTR document with an RTL section was placed as
  LTR there too. It reads the component's computed direction now.
- **Coverage.** 79 unit tests (the new contracts in `tests/panel-metrics.spec.ts`
  pin the width ownership, the span-variable swap and the placement wiring;
  `select-loading.spec.ts` pins the per-open `panelReady`); 16/16 repo e2e cases
  × Chromium 156, Firefox 157, WebKit 27.2 (48/48) — including three sizing
  cases at 480px, 160px and 120px, and three virtualised-list cases; and the
  tarball matrix, 138/138 (46 cases × 3 engines), installed in the consumer
  fixture on a scratch port. WebKit runs headed here: the headless WPE build in
  the local Playwright cache fails to load `libavif.so.16`, while the GTK build
  used headed starts fine. That is an environment limitation, surfaced as
  not-green rather than hidden.
- **Virtualised list, measured.** The README recipe (`listTemplate` + the panel
  from `panelReady`) now has a fixture: 500 options, a 36px-row window and the
  panel as scroll element. Open renders 19 rows (`scrollHeight` 18,012 against
  a 318px `clientHeight`), scrolling to the end renders rows 487–500 and the
  panel stays 224px — the trigger's width — with no horizontal scroll.
- **`panelReady` per open.** Building a 283-row governorate demo on the packed
  tarball surfaced a real defect: the panel lives inside `@if (open)`, so every
  reopen builds a new element, while `panelReady` carried a once-per-instance
  flag and kept handing over the first one. Closing and reopening the demo left
  its scroll listener on a detached node. The guard now compares the element,
  not a boolean. Covered twice: a unit test in `select-loading.spec.ts` and a
  repo e2e case (open → scroll → Escape → reopen → scroll) — both were run
  against the reverted fix and both fail. The demo also exposed a consumer-side
  trap worth documenting: an effect that reads the query and the panel signal
  together resets the list scroll every time a new panel arrives.

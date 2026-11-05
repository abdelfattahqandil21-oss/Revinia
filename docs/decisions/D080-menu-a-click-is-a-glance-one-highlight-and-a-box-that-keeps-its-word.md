## 2026-10-30 — D80: menu — a click is a glance, one highlight, and a box that keeps its word

The menu usage/display pass (`docs/SPEC-menu-usage-display.md`, frozen before
code). Three product rules and one browser workaround:

- **A pointer open activates nothing.** `onTriggerClick()` calls
  `controller().toggle('none')`, so after a click no row is active and focus
  stays on the trigger. Enter/Space/ArrowDown still open on the first enabled
  row and ArrowUp on the last; the first ArrowDown (or Up/Home/End) after a
  click enters the list. This is the APG menu-button reading: a glance is not
  a choice, and a pointer user has already aimed at the row they want.
  `pendingActivation` still covers the declarative `[items]` path, where rows
  register only after `open()` flips, but it is now scoped to keyboard opens;
  a stray activation there paints row one before the pointer ever moves
  (mutation-checked by a `[items]`-specific unit case).
- **Exactly one row may look chosen.** The `[rvmenuitem]:hover` wash is gone.
  Hover still moves the active row, through `controller().activate(id)`, so the
  hover and keyboard states can never paint two rows at once (measured before:
  hovered `Duplicate` stayed washed while the arrow moved to `Delete`).
  `--rv-menu-item-hover-bg` therefore collapses into
  `--rv-menu-item-active-bg`.
- **The panel sizes itself in border-box.** `min-width` defaults to `10rem`
  (`--rv-menu-width`, was `16rem`), `max-width` is a new token
  `--rv-menu-max-width` at `22rem`, bounded by `calc(100dvw - 1rem)`. With the
  default content-box a `16rem` min-width rendered a 270px panel, and a long
  label stretched it without limit (measured 513px). Labels now wrap
  (`white-space: normal` + `overflow-wrap: break-word`); nothing is
  ellipsized, because a clipped menu label hides the action's name.
- **Smaller mechanical rules that ride along.** Generated `[items]` rows are
  `type="button"` (an implicit submit inside a form navigated away on every
  pick); `aria-controls` exists only while the panel it names exists;
  `transform-origin` is derived from `data-placement` + `data-rtl` +
  `data-flipped` through `--rv-menu-origin-x/y`, because the property takes
  physical keywords only and `:dir()` is not a dependency we want here. The
  panel writes `data-rtl` itself.
- **WebKit needs a focus re-seat after a close.** Measured on Playwright
  WebKit (headed): a manual popover opened while focus stayed on the trigger
  leaves the sequential focus navigation starting point inside the hidden
  top-layer panel, so Shift+Tab from the trigger does nothing — even after a
  later Escape-close, until focus visits another element. `doClose()` now does
  a `blur()`/`focus()` cycle on the trigger when it is the active element.
  Chromium and Firefox pass the same test with or without the re-seat; WebKit
  fails without it.
- **Evidence.** 49 unit tests (was 41) and 57 Playwright cases per browser —
  chromium 57/57, firefox 57/57, webkit 57/57 (headed) — against the built
  demo. Mutation-checked per hunk: `toggle('first')`, keyboard
  `markOpening`, the ARIA `removeAttribute`, the `16rem`/no-cap CSS
  (`max-width: none`), the `:hover` rule, the RTL origin rule, the
  `data-rtl` binding, the Tab case, the generated-row `type`, and
  `reseatTriggerFocus()` each turn at least one case red. The `focusActive`
  null guard cannot be removed: the compiler rejects `CSS.escape(string |
  null)` (TS2345), so the type checker is the gate there. Before/after
  screenshots: `/tmp/menu-036/` (pointer open, double highlight, long label,
  RTL).
- **Package.** `npm pack dist/menu` → 8 files, 36.9 kB packed / 131.0 kB
  unpacked, shasum `ac64d13f…`; FESM gzip 6,923 B (UI) + 767 B (headless).
  Runtime imports in the FESM: `@angular/core` and the package's own entry
  point only — no `tslib` import despite the injected dependency (D20).
- **Versioning.** 0.4.0 — a minor, not a patch: a pointer open no longer
  activates a row, which is a deliberate interaction change (pre-1.0 minor =
  breaking/feature, AGENTS.md). 0.3.6 was prepared and never published; 0.4.0
  supersedes it. No public symbol was removed or renamed.
- **Not done / not claimed.** No merge, push, tag or publish. The select
  suite still has one pre-existing failure on the untouched `/select` demo
  route (`opens, filters, picks, and closes`: panel visible after Enter) —
  reproducible with no select file in this branch's diff; it is out of scope
  here. Firefox ran headless, WebKit headed; no physical Safari was tested.

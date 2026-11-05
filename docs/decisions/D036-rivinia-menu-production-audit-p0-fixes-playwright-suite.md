## 2026-10-16 — D36: `@rivinia/menu` production audit (P0 fixes + Playwright suite)

- Context: APG audit of rv-menu. Verified gaps: outside click stole focus to trigger; trigger had no aria-controls (menu lacked stable id); empty/all-disabled menus never exercised (tested); RTL/flip aliases; scroll-close reflow path fixed; panel now names itself.
- Decisions:
  - outside pointer clicks do NOT restore focus (browser keeps natural target). Escape and Tab-close still restore.
  - panel gets a stable unique `rv-menu-panel-N` id; trigger gets `aria-controls`. `label` input maps to panel `aria-label`. Tested cross-instance uniqueness.
  - CSS is layered-flat (no `@layer`) by choice: reported-but-unverified layer-vs-consumer specificity caused a concrete regression risk. Override API is CSS vars (`--rv-menu-*`) plus documented classes and `data-*` hooks (active, flipped, disabled, placement).
  - forced-colors left to host; `prefers-reduced-motion` zeroes the enter animation.
- Playwright 1.64 Chromium + fixture (basic/dynamic/two/rtl/edge/styled). Headed verification landed during audit; suite runs on Chromium only (WebKit/firefox browsers cached — reported, not claimed). Axe-core audit lands the day after (browser 1248 tools); dependency declared.
- Tests: 21 Vitest unit (menu) + 20-ish Playwright scenarios + position pure helper 8.

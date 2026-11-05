## 2026-10-16 — D31: `@rivinia/menu` headless + dropdown UI, no new deps

- Context: nav bar and select/multi designs need a dropdown primitive first.
  APG menu-button + HeadlessUI patterns researched (roving tabindex, Escape,
  arrows/Home/End, Tab closes non-modally, outside pointer closes).
- Decision: per-instance `RiviniaMenu` controller (open/active/registry,
  disabled-skip with wrap) + `@rivinia/menu/ui` (`rv-menu`, `rvMenuItem`;
  trigger/panel projection, placement classes, roving focus, focus return).
  Non-modal Tab behavior is deliberate. Structural `RiviniaMenuController`
  interface (same dual-realm lesson as modal's host manager). SSR renders
  closed. Zero new runtime dependencies.
- Verified: 9/9 menu tests, CSR headed run (profile + select styles,
  keyboard, pick) with zero errors. NOT published (new package 0.1.0).

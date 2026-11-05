## 2026-10-16 — D33: dropdown APG gaps closed (trigger aria + typeahead)

- Context: APG menu-button/combobox audit of `rv-menu`/`rv-select` found the
  trigger exposing no `aria-haspopup`/`aria-expanded` (screen readers could
  not tell a menu exists) and no printable-character typeahead.
- Decision: `rv-menu` syncs both attributes onto the consumer's trigger
  element via effect; `rv-select` binds them on its own button. Typeahead
  lives in the menu component (labels are UI-owned DOM text, not headless
  state): prefix buffer, same-character cycling, 500ms reset, disabled-skip.
- Open (not started): selected-state semantics for select (visual check only;
  needs a menuitemcheckbox/menuitemradio vs listbox/option role decision),
  viewport-edge auto-flip, form binding, option groups.
- Verified: menu 12/12, select 10/10 tests. NOT published.

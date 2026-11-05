## 2026-10-31 — D85: select's single rows are `menuitemradio`, not plain `menuitem`

- Context: in 0.7.1 the single-select panel renders every row as
  `role="menuitem"` (`select-popup.ts`, `checked() === null` branch), so the
  selected governorate is not announced as selected. Multi already ships
  `menuitemcheckbox` + `aria-checked`, and `@rivinia/menu@0.5.0` already ships
  `menuitemradio` for exclusive rows (`menu-panel.ts`, D80/D83). Verified by
  source read on 2026-10-31; no screen reader run yet.
- Decision (option A): keep the button + `role="menu"` model and its focus
  behavior. In single mode each option renders `role="menuitemradio"` with
  `aria-checked="true|false"`. The trigger keeps `aria-haspopup="menu"`,
  `aria-expanded` and `aria-controls`. Multi stays `menuitemcheckbox`.
- Open sub-decision: the searchable variant puts an `input[role="searchbox"]`
  inside the `role="menu"` panel (`select-panel.html`). The alternative
  (moving the filter out of the menu semantics) is decided in the S2 ADR
  addendum only after the accessibility-tree check; no change before that.
- Rejected: option B, a select-only combobox + listbox with
  `aria-activedescendant`. It is the stricter pattern but a full focus-model
  rewrite, deferred to post-1.0.
- Impact: ARIA roles are public contract, so this ships in select `1.0.0`.
  README "Accessibility" and the a11y verification doc must state exactly what
  was tested; Playwright asserts roles and `aria-checked` toggling for single,
  multi, searchable, disabled rows and RTL, and axe stays at zero violations.

### D85 addendum — the filter box lives beside `role="menu"` (PROVISIONAL — pending human check)

- Measured, not assumed. Chromium 156.0.8078.4, 1280×900, snapshots committed
  under `docs/a11y-snapshots/` (produced by `scripts/capture-a11y-tree.mjs`).
  With the select open, in document order, the tree is:

  ```
  button "Invoice status Select…"  hasPopup=menu expanded=true controls=rv-select-popup-panel-1
  group
    searchbox "Search options"
    menu "Invoice status options"
      menuitemradio "Outstanding invoices"  checked=false
      menuitemradio "Overdue"               checked=false disabled=true
      menuitemradio "Paid"                  checked=false
  ```

  The menu owns rows and nothing else; the filter box is a sibling inside the
  same panel, so it still scrolls and sticks with the rows. The 0.7.1 shape
  (searchbox as a DOM child of `role="menu"`) fails axe
  `aria-required-children` (critical, measured; `role="menu"` may own only
  `menuitem*`/`group`/`separator`). After the move, axe reports zero violations
  on six states: closed, single, multi, RTL, a custom `listTemplate` and the
  empty state.
- Decision: option 1, **the searchbox stays outside the menu** and keeps
  `role="searchbox"` with its own name. This is the lowest-risk option because
  it changes no focus behavior (the box is still focused on open; Tab still
  moves into the rows) and leaves every ARIA role exactly as D85 chose.
  S2.4 defers the *final* call to the screen-reader pass; this is the shape the
  code ships until that pass contradicts it, and the whole entry stays marked
  PROVISIONAL for that reason.
- Alternative considered and recorded (option 2): wrap the filter box and the
  rows in `role="group"` *inside* the menu, which is what a naive reading of
  the required-children rule suggests. Not chosen: in the accessibility tree
  the searchbox would then be a descendant of the menu, so assistive technology
  announces an editable control as menu content, a shape neither the APG menu
  pattern nor the select-only combobox pattern defines. The group layer would
  exist purely to satisfy a linter, and the same wrapper would be needed again
  for the empty/loading rows.
- Alternative considered and recorded (option 3): option B from D85, a
  select-only combobox + listbox with `aria-activedescendant`. Still the
  strictest model and still post-1.0: it is a focus-model rewrite.
- **PROVISIONAL — pending human check.** The tree proves structure, not
  announcement. If the screen-reader pass (`docs/HUMAN-CHECKS-1.0.md`) shows
  the filter box announced as menu content, or that focus moving from the box
  into the rows reads as leaving the control, the fallback is option 3.
- Consequence for consumers: a custom `listTemplate` must give its rows a
  `menuitem*` role and `tabindex="-1"`. Measured on the 500-row virtual fixture:
  bare `div` rows raise `aria-required-children` (critical) and an unfocusable
  scrollport raises `scrollable-region-focusable` (serious). The row directive
  is internal, so the README recipe writes the attributes out.

### D85 addendum 2 — the trigger's accessible name contains the visible value (WCAG 2.5.3)

- Context: 0.7.1 named the trigger with `aria-label` (the caption), while the
  button's visible text is the current value. axe
  `label-content-name-mismatch` (serious) fires when the visible text is absent
  from the accessible name, and it did on every open/closed single select once
  the panel semantics moved focus into the rows. WCAG 2.5.3 "Label in Name"
  requires the visible label to be part of the name.
- Decision: the trigger is named by `aria-labelledby` over its caption (or an
  `ariaLabel`-only hidden span) plus the visible value, in visual order; the
  hidden description stays a *sibling*, not a child, so it is not read twice.
  IDs are instance-unique, so several selects in one application root compose
  their names independently (asserted in `e2e/select/select.spec.ts`).
- Public consequence: the trigger no longer carries `aria-label`; its `id`s
  (caption, value, description) are DOM-adopted by the component and the
  accessible name now reads "Invoice status, Outstanding invoices". This is an
  announcement change for every consumer, recorded in the CHANGELOG, and the
  one item in this branch the owner may want to confirm as a contract decision
  rather than an S2 acceptance fix.
- Verified: axe `label-content-name-mismatch` at zero on the closed trigger,
  single open, multi open, RTL and empty states; Playwright asserts the
  composed name after a pick and across two application roots.

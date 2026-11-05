## 2026-10-31 — D87: theme is in scope before 1.0 — dark, forced-colors, accent

- Context: `@rivinia/theme@0.1.0` has no dark values and no forced-colors
  defaults; `--rv-accent` is declared (`theme.css`, `@layer rivinia-theme`) but
  read by none of select, menu or the i18n toggle. Only `table/ui` handles
  `forced-colors` today.
- Decision: add dark values under `@media (prefers-color-scheme: dark)` guarded
  by `:root:not([data-rv-theme="light"])` and under `:root[data-rv-theme="dark"]`,
  keeping defaults in `@layer rivinia-theme`; add `@media (forced-colors: active)`
  defaults using system colors (`Canvas`, `CanvasText`, `Highlight`,
  `GrayText`); wire `--rv-accent` into the focus-visible ring, the
  selected/active indicator and the language toggle's active state. With no
  theme imported the rendered result must be identical to today (snapshot).
- Also: a contrast script checks WCAG AA (4.5:1 text, 3:1 non-text) for every
  token pair in both schemes; the language toggle honors
  `prefers-reduced-motion` if it gains motion; every `--rv-*` token is listed
  as public contract in the theme README.
- Rejected: dark-only scope (leaves `--rv-accent` dead and half the contract
  unread); deferring the theme entirely (1.0 would document a contract the libs
  do not read).
- Impact: touches theme, select, menu and i18n `/ui`; visual snapshots for
  light, dark, forced-colors and RTL. Version for this work is decided at
  release, not here.

### D87 addendum — the contrast matrix is explicit, and the border is not in it

- Context: D87 says "WCAG AA (4.5:1 text, 3:1 non-text) for every token pair in
  both schemes". Taken literally, `--rv-border` on `--rv-bg` fails: 1.32:1 on
  white and 1.73:1 on `#161616`. Reaching 3:1 would repaint the hairline around
  every select trigger, menu panel, modal and toast — a consumer-visible design
  change that D87 did not scope, and one that cannot be judged for looks
  without the owner.
- Decision: the gate enforces three explicit groups — text (`--rv-fg`,
  `--rv-muted`, `--rv-accent` at 4.5:1), indicators (the four status tokens at
  3:1) and decorative (`--rv-border`, measured and printed, never failing).
  `--rv-accent` counts as text because S5b paints selected/active labels with
  it.
- Why not "text everywhere": on white, `--rv-ok` is 3.30:1 and `--rv-warning`
  3.19:1. The components use them as borders and tinted backgrounds — select
  paints its error border with `--rv-danger`, datepicker tints with
  `--rv-warning` — and none paints text with them.
- Accepted gap: a consumer who paints text in a status token, or who relies on
  the border alone to identify a control (WCAG 1.4.11), gets a low-contrast
  result. The README says so next to the token table; changing either is a
  palette decision for the owner, not something 1.0 does silently.
- Also recorded: the Bootstrap adapter's mapping rules stay **unlayered** and
  must set `color-scheme` themselves. Unlayered declarations beat the layered
  `@media (prefers-color-scheme: dark)` block, which is what keeps Bootstrap's
  palette authoritative; the probe caught the adapter mapping colours but
  leaving `color-scheme: light`, so a Bootstrap dark surface kept light
  scrollbars and form controls. The same probe found the dark block mapping
  four tokens only, so the accent and the four status tokens kept their light
  values on a dark surface; both mappings now carry all nine colours plus
  `--rv-shadow`.
- Verification: `pnpm check:contrast` (palette, drift and ratios) and
  `pnpm check:theme-dark` (eleven documents, Chromium and Firefox, computed
  values). Both run on demand; neither is part of `pnpm test`. The browser gate
  also proves the two claims the numbers cannot: an unlayered consumer `:root`
  rule really does beat the layered defaults, and the adapter really reads
  `--bs-*` rather than silently falling back to its own values.
- Scope recorded: the switch is read on `:root` only, so a subtree goes dark by
  setting the `--rv-*` properties and `color-scheme` on itself. The attribute
  was never a subtree switch, and the first README draft said it was.

### D87 addendum 2 — component wiring, and what the snapshot actually proves

- Wiring shipped: select (premium and simple) rings, active rows and the tick;
  menu row ring and active row; i18n toggle ring and held-down fill. Every read
  is `var(--rv-accent, <the value that shipped before>)`.
- The tick needed specificity, not just a declaration: the generic row-icon
  rule paints every row `svg` at (0,2,1), so `svg.rv-select-check` names the
  element and sits below the active-row `color: inherit` it ties with, in the
  same stylesheet so source order decides. A first attempt at `.rv-select-check`
  (0,1,0) was measured as `rgb(17, 17, 17)` — the row ink — on both engines.
- The tick also needed TWO fallbacks, because it had two colours: the muted
  token on an ordinary row, and the inherited row ink while its row is the
  active one. `var(--rv-accent, currentColor)` alone changed the off-active
  tick from `#555555` to the row ink on an unthemed page; the shipped rules are
  `var(--rv-accent, var(--rv-select-popup-muted))` and, on the active row,
  `var(--rv-accent, currentColor)` (which resolves to the same inherited value
  the old `color: inherit` produced).
- Forced-colors defaults are stated per component because the UA flattens
  author backgrounds: the active row would otherwise be invisible. It does not
  force `opacity`, so the disabled row's 0.45 is replaced with `GrayText` at
  full opacity. It DOES force `box-shadow` to `none` in Chromium — measured on
  the built premium panel, whose declared
  `rgba(16, 24, 40, 0.18) 0 12px 32px -8px` reads back as `none` under
  `forcedColors: 'active'`, and the gate now proves it with a probe element that
  declares a shadow and belongs to no component: a panel reading `none` cannot
  tell the UA's doing from its own `box-shadow: none`. The explicit declaration
  is therefore redundant there and kept for engines this suite cannot emulate
  (Playwright has no forced-colors mode in Firefox). An earlier draft of this
  entry claimed the opposite; the measurement corrected it. Two other
  corrections came out of measuring the mode: the (0,3,1)/(0,4,1) tick rules
  outranked a plain
  `.rv-select-check { color: CanvasText }` and Chromium measured white on
  white, so the forced block repeats both tick selectors; and a `Highlight`
  ring on a `Highlight` band is invisible, so the active row's ring is
  `CanvasText`.
- Hover activates the row (`hoverItem` reaches `activate`), so the pointer's row
  is always the active one. The simple `:hover` rule ties the active tint at
  (0,3,0) and comes later in source, so it painted its neutral 8% wash over the
  accent — a defect no snapshot of an unpainted page could show. A
  `[data-active='true']:hover` rule at (0,4,0) now carries both:
  `--rv-select-item-active-hover-bg`, falling back to exactly the 8% ink the
  unthemed page painted in that state, so the identity snapshot still holds.
  The gate measures it (pointer moved to the active row's centre, then parked at
  0,0) in the `light` and `accent` cases. Premium needs no such rule: its
  `rv-select-popup[data-variant='premium'] …` active-row rules are (0,4,1) and
  outrank the generic (0,4,0) one outright.
- Verification: `pnpm check:component-theme` renders both demo apps (real
  components, built from `dist/`) in Chromium and Firefox — six cases on
  Chromium (no theme, dark via `data-rv-theme`, dark via the OS preference,
  accent, RTL, forced colors) and five on Firefox. Playwright cannot emulate
  `forced-colors` in Firefox, so that case is Chromium-only and a Firefox
  forced-colors check is a human item.
- The identity claim, honestly: the `light` snapshot is the pre-wiring render,
  and the gate's header records how to re-derive it — check out the base CSS,
  rebuild the three packages and both demo apps, re-run `--only=light`, and
  `git diff` the snapshot. It was re-derived that way after the wiring and
  matched byte for byte; the case also asserts that the tick (on and off the
  active row), the row ring and the toggle ring keep the pre-wiring ink, so a
  hardcoded accent default fails even on a fresh checkout. The `dark`
  snapshots did move, by design: every wired surface now takes the theme's
  `#8b8bf0` accent.
- Mutation checks (both caught): a hardcoded `#5b5bd6` fallback on the tick
  fails `light` on both engines (`rgb(91, 91, 214)` instead of the row ink);
  deleting `background: Highlight` from the popup's forced-colors block fails
  with a 10% author tint where `Highlight` is expected.
- The i18n toggle has no transition or animation, so `prefers-reduced-motion`
  is a no-op; a spec asserts that and says to add the block if it ever gains
  motion.

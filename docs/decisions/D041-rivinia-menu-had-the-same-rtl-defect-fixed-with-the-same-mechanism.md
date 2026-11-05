## 2026-10-19 — D41: `@rivinia/menu` had the same RTL defect; fixed with the same mechanism

- Context: D40 fixed the select's popup. The same consumer app then exposed
  the **identical** defect in `@rivinia/menu`, which had never been reported
  because the app's only menu used a placement that hides it.
- Verified from source (not inferred): `projects/menu/ui/src/lib/menu-panel.ts`
  had the same rule order as the select's pre-fix CSS — the
  `[data-top-layer='true'] { inset: auto }` rule sat **before** the four
  `[data-placement=…]` inset rules, both at specificity `(0,2,0)`, so the
  placement rules won and `inset-inline-start/end` leaked into the fixed
  top-layer box.
- **Why it was never seen:** the default placement is `bottom-start`, but the
  consumer's menu used `bottom-end`. In LTR, `inset-inline-end: 0` resolves to
  `left: 0` — the same physical property the component writes inline, so the
  inline value won and the panel looked correct. In RTL the two swap:
  `inset-inline-start: 0` resolves to `right: 0`, which the component never
  writes, and CSS 2.1 §10.3.7 drops `left` in RTL, pinning the panel to the
  viewport edge. Measured in the consumer app with `placement="bottom-start"`:
  trigger at `x=19..74`, panel at `x=636..1010` — **617px away**.
- Decision: **the same fix as D40**, applied to the menu's CSS:
  - the top-layer rule moves after the placement rules;
  - CSS anchor positioning places the panel (`anchor-name` /
    `position-anchor` / `position-area` with logical keywords,
    `position-try-fallbacks`, `position-visibility`);
  - `anchor-scope: all` on the `rv-menu` host, which is required for the
    same measured reason as the select.
- **One deliberate difference from the select:** a menu sizes to its
  **content**, a select matches its trigger. The select uses
  `width: anchor-size(inline)`; the menu uses `width: max-content` plus its
  `min-width`, and `justify-self` picks the edge inside a
  `span-inline-*` area. Using `anchor-size(inline)` on the menu would squeeze
  a 55px avatar button into a 55px menu. A bare `block-end` area was also
  measured and rejected: it spans the whole inline axis, so `justify-self`
  aligns to the viewport rather than the trigger (measured: panel at `x=0`,
  19px from its trigger).
- Verified: 32/32 menu unit tests, ng-packagr build, and a consumer app
  measured `distance: 0` and the panel's end edge aligned with its trigger's
  in **both** LTR and RTL, with the panel keeping its content width (320px
  beside a 55px trigger).
- Version: **0.3.5** (patch; a bug fix, not a feature).
- Open, from the same audit — the theme work is NOT started:
  - `modal` and `toast` declare their token defaults **on the component
    element**, so a global `--rv-*` layer cannot reach them at all today; the
    read sites need two-level chains (`var(--rv-modal-bg, var(--rv-bg, …))`)
    and the element-local default blocks have to go.
  - `modal` forces a dark scheme and `toast` forces a light one via
    `prefers-color-scheme`, which contradicts the documented "no forced dark
    mode" contract the other packages keep.
  - the e2e suite only asserts the placements where the leak is invisible
    (RTL `bottom-end`, LTR `bottom-*`); the dangerous combinations
    (RTL + `bottom-start`, LTR + `bottom-end`, any `top-*`) are asserted
    nowhere.
  - the toast README documents no theming surface at all.
  NOT published.

## 2026-10-19 — D40: select's vendored popup leaves the `menu` namespace; CSS anchor positioning

- Context: a consumer app (`brand-page`, not published) upgraded
  `@rivinia/select` 0.4.2 → 0.5.0 and hit two failures, both reproduced and
  measured in headed Chromium (viewport 900×912, RTL and LTR):
  1. The app rendered `NG0912: Component ID generation collision detected.
     Components 'RiviniaMenuComponent' and 'RiviniaMenuComponent' with selector
     'rv-menu'`. `select` shipped a private copy of the menu component using the
     SAME selector as `@rivinia/menu`. Angular registers one definition per
     colliding id, so the loser's `styles` were never injected — the select's
     panel was silently rendered with the other package's CSS.
  2. With that CSS in place the panel flew away from its trigger: trigger at
     `x=11..232`, panel at `x=708..929` (929 − 221 = 708, to the pixel).
- Root causes, both verified rather than assumed:
  - **Cascade leak.** `[data-top-layer='true'] { inset: auto }` and the
    `[data-placement=…]` inset rules share specificity `(0,2,0)`, and the
    top-layer rule came FIRST, so it lost. In LTR the leak was invisible
    (`inset-inline-start: 0` → `left: 0`, the same property the component
    writes inline, so the inline value won). In RTL it resolved to `right: 0`,
    which the component never writes — the box became over-constrained and
    CSS 2.1 §10.3.7 dropped `left`, pinning the panel to the viewport edge.
  - **The collision**, which meant the fix could not even be applied: the
    library's own styles were absent from the document (proved by enumerating
    `document.styleSheets` — only the consumer's rules matched `rv-menu`).
- Decisions:
  - **The vendored copy is renamed out of the `menu` namespace**: selector
    `rv-select-menu`, classes `.rv-select-menu-*`, tokens `--rv-select-menu-*`,
    types `SelectPopup*`. `menu` no longer appears in the package's own
    vocabulary. Renaming the SELECTOR is what breaks the id hash —
    `componentDef.type.name` is not part of `getComponentId`, but
    `componentDef.selectors` is (verified in the installed
    `@angular/core` source). The `--rv-select-*` → `--rv-select-menu-*` token
    bridge is kept, so ancestor theming still reaches the panel.
  - **CSS anchor positioning places the panel**, inside `@supports`
    (`anchor-name` / `position-anchor` / `position-area` with LOGICAL keywords,
    `width: anchor-size(inline)`, `position-try-fallbacks`). Logical keywords
    make RTL correctness structural rather than a JS branch. Baseline
    widely-available since 2026-01, so the JS coordinate path stays as the
    fallback and is direction-correct for both directions after the cascade fix.
  - **`anchor-scope: all` on the component host is required**: without it every
    panel resolves its anchor to the LAST trigger in the document (the spec's
    tie-break for a duplicate `anchor-name`) — measured, all three panels of a
    three-select page landed on the third trigger, up to 431px away.
  - **ARIA is left alone**: `role="menu"`, `menuitem`, `aria-haspopup="menu"`
    are W3C values, not package vocabulary; renaming them would change the
    accessibility contract, not the code's naming.
  - **Package layout follows Angular convention**: `components/<name>/` holds
    the `.ts` + `.html` + `.css` triple; `models/`, `services/`, `utils/` hold
    types, the headless controller and pure math. Templates and styles are
    external files, not inline.
- Alternatives rejected: fixing the JS position math alone (the math was
  correct — the leak was the defect); dropping the top layer (loses clipping
  and stacking escape); `role="listbox"` (a semantics change, out of scope);
  renaming the class only (does not change the id hash).
- Verified: 44/44 select unit tests (specs updated to the new selectors),
  ng-packagr build, dist FESM grep shows zero `menu` vocabulary outside the
  ARIA values, and a consumer app measured 0px offset / equal width / correct
  inline-start alignment for all three selects in BOTH LTR and RTL.
  NOT published.

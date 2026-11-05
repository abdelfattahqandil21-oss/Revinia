## 2026-11-02 — D89: two browser floors, and the anchor gate probes every property its block uses

- Context: S7 found the repository stating, in two shipped CSS comments
  (`menu-panel.css:96`, `select-popup.css:161`), that CSS anchor positioning is
  "Baseline widely-available since 2026-01". Read against mdn/browser-compat-data
  on 2026-11-02 that is wrong in the direction that matters: anchor positioning
  reached Baseline **low** on 2026-01-13 (Chrome 125, Firefox 147, Safari 26),
  and Baseline "widely available" is the low date plus 30 months, i.e.
  2028-07-13. A library that documented a hard floor from that sentence would be
  promising support it has not built.
- The same reading found a live defect. The `@supports` prelude guarding the
  anchor block tested `anchor-name` and `position-area` but not `anchor-scope`,
  which is six Chrome versions younger (131 against 125). A Chrome 125-130 engine
  therefore enters the block, ignores the scope, and resolves the duplicated
  `anchor-name: --rv-menu-anchor` to the LAST trigger laid out on the page. That
  failure is not hypothetical: `select-popup.css:232` records three selects whose
  panels all landed on the third trigger, up to 431px from their own.
  `position-visibility: anchors-visible` has the same shape on Safari 26.0-26.1
  (the value is 26.2): the declaration is dropped, so the panel keeps its anchor
  placement but stops hiding when its trigger scrolls away.
- Decision: two floors, in `docs/browser-support.md` — **Supported** Chrome/Edge
  114, Firefox 125, Safari 17 (iOS 18.3): the popup opens, closes, filters, picks,
  is keyboard-operable and loses only the top layer; **Enhanced** additionally
  Chrome 131, Safari 26.2: the panel is placed by CSS anchor positioning. Firefox
  is Enhanced **never**, by an existing measured engine bug in `justify-self`
  inside a `span-inline-*` area, so it permanently uses the component's own
  coordinates. Each package README links the table when its content moves in S9.
- Decision: `(anchor-scope: all)` and `(position-visibility: anchors-visible)` are
  added to both preludes. Engines between the floors now take the JS path — the
  path the Firefox project already proves correct on every run — so the fix is a
  gate widened, not a new code path.
- Decision: the two CSS spec files assert the rule that generalises this: every
  anchor feature the block writes must either be probed in the prelude or be no
  younger than some probe in all three engines, and a feature the table does not
  know fails until its dates are added. `position-anchor`, `anchor-size()` and
  `position-try-fallbacks` therefore keep no clause of their own — 125 against
  `anchor-name`'s 125 and 128 against `position-area`'s 129.
- Decision: the support question is answered by the engines, not by jsdom. The
  installed Chromium 156.0.8078.4 and WebKit 27.2 accept the whole widened
  condition and Firefox 157 rejects exactly the `-moz-appearance` clause; jsdom
  knows `anchor-scope: all` but not `position-visibility: anchors-visible`, so the
  unit specs check the prelude's grammar and `e2e/popup/anchor-gate.spec.ts`
  reads the condition out of the loaded stylesheet, asks that engine, and proves
  the block is live from the `anchor-scope` and `position-anchor` computed values
  that no other rule sets.
- Rejected: raising the floor to the enhanced line — Chrome 131 / Safari 26.2 in
  November 2026 excludes Safari 17-18 users from a menu, a larger product
  decision than a support table. Leaving the prelude alone and documenting the
  Chrome 125-130 break — the break is a menu opening across the page, and the fix
  is two parseable conditions. Shipping a `vh` fallback for `dvh` — every engine
  above the Supported floor has it (108/101/15.4), so the duplicate declaration
  would be dead weight.
- Impact: the comments that said "widely-available" are corrected in the same
  commits as the preludes, so the source cannot contradict the table. The
  `@supports` prelude is now the contract between the two placement paths and is
  treated as such: a future anchor property added inside the block has to be
  added to the prelude, and the spec test fails if it is not. Neither floor is a
  promise about an engine nobody ran — real Safari and the band between the floors
  (Chrome 114-130, Safari 17-26.1) are recorded as **not tested**, Safari is a
  human item in `docs/HUMAN-CHECKS-1.0.md`, and S7's "CI runs three engines"
  ships as a Playwright config a person runs, because this repository has no CI.

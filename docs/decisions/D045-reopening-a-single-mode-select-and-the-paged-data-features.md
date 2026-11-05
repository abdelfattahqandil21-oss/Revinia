## 2026-10-19 — D45: reopening a single-mode select, and the paged-data features

- Context: a consumer reported that after picking a value with the arrow keys
  and reopening the panel, the active row started at the FIRST option instead
  of the chosen one — and noted that multi mode was already right.
- **Cause.** `openMenu('first')` calls `activateFirst()` unconditionally, and
  the select's own query effect calls `activateFirst()` on every query change.
  Neither consulted the current selection. Multi mode was right for a
  different reason: it never closes on a pick, so the active row simply stayed
  where it was.
- **Fix.** On open, in single mode, the select activates the option that is
  already selected (if it is still in the filtered list). The popup service
  has no knowledge of the selection — that lives in the headless controller —
  so the select is the right place to make the decision.
- **The regression test is real**: with the fix reverted, two cases fail
  ("reopens on the option that was picked" and the open-close cycle); with it
  in place, all pass. Verified by actually reverting and re-running, not by
  asserting the test exists. 70/70 select tests.
- **Paged data.** A select whose options come from a paged API now has:
  - `[loading]` — a loader row under the list, `role="status"` so it is
    announced without stealing focus;
  - `(reachEnd)` — emitted when the panel scrolls near its end. The threshold
    is a **length** (`--rv-select-popup-reach-end-offset`), not a percentage:
    the panel's scrollable height changes as rows arrive, so a percentage
    would fire at a different row every time;
  - a **footer slot** (`[rv-select-popup-footer]`) for a "Load more" button;
  - `[listTemplate]` — replaces the whole list, for a virtualised one;
  - `(panelReady)` — hands over the panel element, which is the scroll
    container a virtualizer needs (`injectVirtualizer`'s `scrollElement`).
- **Custom animation.** The entrance is now ONE token,
  `--rv-select-popup-animation`, not three separate ones. A token rather than
  an `animation` override on purpose: Angular injects a component's styles
  into `<head>` at runtime, which is AFTER the app's stylesheet, so at equal
  specificity the library's declaration wins and a consumer's override would
  silently do nothing. The duration and easing are still separate tokens for
  the common case.
- Verified: 70/70 select, 32/32 menu, 51/51 modal, 33/33 toast; all five
  packages build; and the reopen fix measured in the consumer app (the active
  row after reopening is the picked option, not the first one).
  NOT published.

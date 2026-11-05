## 2026-10-31 — D86: no popup dedupe before 1.0; a conformance suite instead

- Context: select popup and menu panel duplicate outside-pointerdown close,
  scroll/resize close, top-layer placement, anchor positioning and the
  controller registry. Fixes can land in one and miss the other.
- Decision: do **not** extract a shared popup core before 1.0. Add one
  conformance suite parametrized over both components now, plus a report-only
  duplication check (`jscpd`) in CI. The extraction ships after 1.0 as a
  non-breaking refactor.
- Suite covers: outside pointerdown closes without stealing focus; Escape
  closes and restores trigger focus; outside scroll closes, inside scroll does
  not; the resize policy from S4; forced `topLayerSupported = false`; balanced
  `addEventListener`/`removeEventListener` after destroy; no `window`/`document`
  access during server render.
- Rejected: extracting an internal module/package now. It adds a new surface
  to freeze for no public API gain.
- Impact: a behavior broken in only one component fails the shared suite.
  Acceptance requires the suite green on both.

### D86 addendum — what the suite actually measures, the resize policy, and the duplication figure

- Suite: `e2e/popup/conformance.spec.ts`, one `Adapter` per host: `rv-select-popup`
  and the built-in `rv-menu` on `/select`, plus the same `rv-menu` with a consumer
  `<input>` projected into its panel on `/content`. Eight cases per adapter,
  twenty-four in total, green on Chromium, Firefox and WebKit (72 runs).
- Measured, not asserted by eye:
  - the listener ledger counts `document:pointerdown`, `window:scroll` and
    `window:resize` add/remove balance: 0 closed, 3 open, and back to exactly the
    pre-open map after an in-app destroy. The destroy navigates through the app's
    own `<nav>` link and asserts a JS marker survives, so it proves a component
    destroy rather than a page reload that would zero the process.
  - outside pointerdown closes and does not steal focus, fired as a raw
    `page.mouse.click` at an empty corner: `locator.click()` on an off-screen
    element scrolls the document first, and that scroll closes the panel, so the
    case would have measured the scroll rule while claiming the pointer rule.
  - scroll outside closes, scroll inside does not. The outside case throws if the
    document cannot actually move, because a parked-at-maximum `scrollBy` is a
    no-op that would pass for nothing; `/content` ends above its own scroll fold,
    so the suite appends a `300vh` spacer for that one case instead of changing a
    fixture that the nine cases in `e2e/menu/projected-content.spec.ts` run against.
  - Escape closes and restores the trigger, and the case asserts its own
    precondition first: opening from the keyboard leaves focus on the trigger
    until the deferred focus lands, so the case polls until the active element is
    *not* the trigger before pressing Escape. Without that, the final assertion
    would still be true with the restore code deleted — the focus simply never
    moved. This is the difference between the Escape mutant being killed and
    merely reported as killed.
  - the top-layer fallback deletes `HTMLElement.prototype.showPopover` in an init
    script (the flag is read once at construction, so a mid-test delete cannot
    work); the panel still lands on the trigger's leading edge and Enter picks.
- Resize policy (S4), **PROVISIONAL — pending human check**: a resize is ignored
  only when the width is unchanged AND the focus is in an editable element inside
  that panel; every other resize closes with no focus restore. Rationale: the
  on-screen keyboard changes height and says nothing about where the panel is
  anchored, while width is the axis the anchor lives on, so a width change — an
  orientation flip included — still means stale coordinates. A *built-in* menu
  keeps closing on every resize because its rows are buttons: it has no editable
  element, so the exemption can never fire for it. That is why the suite needs the
  `/content` host: the menu renders `<div class="rv-menu-panel">` itself and
  projects consumer markup inside it, so a projected `<input>` is genuinely inside
  the panel and the exemption applies to the menu too — one rule, both components.
  The exemption recognizes three kinds of editable — `contenteditable`, `<input>`
  and `<textarea>` — because the panel hosts whatever the consumer writes, and the
  projected host now offers all three: a case that only ever focused the `<input>`
  would stay green with the other two branches deleted. The resize cases run in a
  390-by-664 viewport, the spec's "mobile viewport" and an iPhone 13/14 logical
  width, and each one throws if `window.innerWidth` is not 390 — a case that
  quietly inherited the desktop window would pass while proving nothing about the
  device the rule exists for. The real-device keyboard is still not tested and is
  a human item: no viewport emulation opens one. Two edges of that rule are worth
  stating plainly. An orientation flip closes the panel because a phone's two
  widths differ — the exemption keys on `innerWidth`, not on an orientation event,
  so a hypothetical viewport that rotated to the *same* width with a field holding
  the caret would stay open; the suite's width case is therefore the portrait to
  landscape flip (390×664 → 664×390), the real event. And the order is not the
  order S4 wrote: the spec puts the human reproduction first and the fix second,
  while this branch ships the fix under a PROVISIONAL label because the standing
  instruction for this plan is to decide the provisional points and keep going
  rather than stop for them. If the human run disagrees with the rule, the rule
  changes; the tests are the thing that would have to be re-read, not the device.
- Mutation checks are a command now, not a memory:
  `pnpm check:popup-mutations` (`scripts/check-popup-mutations.mjs`). A green
  conformance suite proves nothing by itself — a case can pass because the
  behavior it names is not the behavior it measures — so the gate breaks one
  documented rule at a time in the library source, rebuilds what the server
  actually serves, runs the suite, and requires the red set to equal the expected
  set **exactly**: a missing red is a surviving mutant, an extra red is a case that
  passes for the wrong reason. The control run goes first and must be green (`24
  passed`) or nothing after it counts as evidence. An anchor that does not occur
  exactly once aborts the run instead of editing the wrong line; every mutant is
  restored in a `finally`, including on a crash; and the last action of the run is
  a rebuild of `menu`, `select` and `menu-e2e` from the clean source, so `dist/`
  never outlives the mutation that produced it. **18 mutants, 18 killed** — the
  kill column below is the harness output, and each label is the exact string the
  script rewrites.
  - Resize, menu host (5): the exemption never fires → the projected field's
    height-only case. The exemption ignoring editability → the built-in menu's
    "closes a panel that has nothing editable"; an earlier note here claimed this
    turned *both* height-only cases red, measured it turns one and leaves the other
    green, which is the direction the mutant hides in. The exemption ignoring the
    width axis → the projected field's width case. Only `<input>` counting as
    editable, and `isContentEditable` dropped → the same height-only case, which
    loops every editable the host holds, so each branch break has its own kill
    inside that one title.
  - Scroll and cleanup, menu host (3): the inside-scroll exemption testing the
    wrong side of the panel → the inside *and* outside scroll cases on both menu
    hosts (4 titles). The `scroll` listener never registered → "scroll outside
    closes" plus the listener-ledger case on both hosts, which is the pairing that
    answers the vacuous-pass worry: the inside case alone cannot see a missing
    listener, the ledger case can. `onCleanup` emptied → the destroy case on both
    hosts and only it, so the ledger assertion stays a claim about teardown rather
    than a restatement of the open state.
  - Close paths, menu host (2): Escape closing without restoring focus → the
    Escape case on both hosts. An outside `pointerdown` closing nothing → the
    outside-pointer case on both hosts.
  - The same shapes on the select (7): the exemption never fires, the exemption
    ignoring width, the scroll exemption on the wrong side, the listener never
    registered, the cleanup removing nothing, Escape without restore, and the
    outside pointerdown — each killed only by `popup conformance: select popup` and
    leaving every menu title green, and the ten menu mutants do the reverse. That
    is the per-component claim, measured rather than asserted.
  - Server render, not a browser (1): deleting `menu-panel.ts`'s
    `if (typeof window === 'undefined') return;` from the listener effect is run
    against `pnpm check:popup-ssr` instead, because that is the only harness where a
    missing `window` guard is observable. It reddens exactly two checks — "the panel
    really mounted" and "the top-layer probe reports unsupported instead of
    crashing" — while "renders server-side" stays green (see the bullet above:
    Angular swallows the effect error).
- Two kinds of break are absent on the select and the reason is its own DOM, not an
  oversight: forcing the height-only exemption to always fire, and the two
  editable-branch breaks, cannot be seen there because the select's panel always
  contains the filter `<input>` — "has nothing editable" and "the caret is in a
  `<textarea>`" are states that popup cannot reach. The menu host is where those
  three live, which is why the list is 10 + 7 + 1 rather than eighteen copies.
- One false red, worth recording: the select width case failed against a "clean"
  tree because `dist/select` had been rebuilt while the mutation was still in the
  source, and `menu-e2e` bundles the library dist. The served bundle carried the
  mutant and the test was right to fail. Rebuilding `dist/select` and
  `dist/menu-e2e` from the restored source turned it green; the suite never
  builds, so a stale `dist/` masquerades as a product bug. The harness was bitten by
  exactly this on its own first run — six select mutants reported SURVIVED because
  only the mutated library was rebuilt, so `dist/menu` still carried the previous
  menu break into every select run. `observe()` now rebuilds both libraries and the
  demo on every observation, whatever was edited; the strict expected set is what
  made the bug visible instead of passing it off as six surviving mutants.
- Server render is not a browser check. The seventh S3 bullet — the one no browser
  can prove, since a browser always has both globals — has its home in
  `pnpm check:popup-ssr` (`scripts/check-popup-ssr.mjs`): plain Node, no DOM,
  `renderApplication` from `@angular/platform-server` over the built
  `dist/select` and `dist/menu` FESM bundles. `window` and `document` are not
  defined there, so a *use* raises a ReferenceError and the render fails, while a
  `typeof window === 'undefined'` guard is not a use and is not a failure —
  that distinction is the whole claim. **Fifteen checks pass**, including a
  negative control whose host calls `document.createElement` and is caught. Both
  server states are in scope, because `[menu]` is a public input: a consumer can
  hand the server a menu that is already open, and that is the only way the effect
  which adds `pointerdown`/`scroll`/`resize` — and reads `window.innerWidth` for
  the resize snapshot — is reached during a server render at all. Reached is not
  read: the guard at `menu-panel.ts:306` returns first, so what the gate measures
  is that the guard holds, and the mutation below is what shows the read behind it
  would fail. Of the four `rv-menu (open)`
  checks, one asserts that the panel class is present and prints what it counted
  (3 `rv-menu-panel` nodes), one that no positioning ran (`data-positioned="true"`
  count 0), one that the top-layer probe reports `data-top-layer="false"` instead
  of touching `HTMLElement.prototype`, and one that the render did not throw.
  The select's own popup controller is internal, so no server render can reach it
  open and `select-popup.ts:384`'s read is never exercised on the server — that
  half is asserted by inspection, not measurement: the guard the menu is checked
  against, `menu-panel.ts:306`, is the byte-identical line `select-popup.ts:359`. Mutation, re-measured on this tree: deleting `menu-panel.ts:306`'s
  `if (typeof window === 'undefined') return;`, rebuilding `dist/menu`, makes the
  gate exit 1 with exactly two failures — "the panel really mounted" (0 nodes) and
  "the top-layer probe reports unsupported" (0) — while "renders server-side"
  stays green, because Angular swallows an effect error during a server render and
  the promise still resolves. So the kill here is a state assertion, never the
  absence of a throw; restoring the guard and rebuilding returns the gate to 15
  ok / exit 0. The browser half of the same item — the three globals added and
  then removed — stays the suite's destroy case, which counts them for real.
- Duplication, report-only per D86. An earlier entry here quoted 6 clones over 14
  files (162 lines, 5.02%; 1855 tokens, 7.62%) from a `pnpm dlx jscpd` invocation
  whose scope and flags could not be re-run from the repository, so it is
  superseded rather than compared against. The measurement is now the script
  `pnpm check:duplication` (`scripts/check-duplication.mjs`): jscpd **pinned to
  4.0.8**, `--min-tokens 100`, over the popup components and their utils on both
  sides — `select/ui/src/lib/components/popup`, `select/ui/src/lib/utils`,
  `menu/ui/src/lib/components/menu`, `menu/ui/src/lib/utils`. It reports and
  never fails, and prints the baseline it is checked against.
- That scope, measured on `HEAD` and on this tree with the same command:
  **7 clones / 181 lines (6.38%) / 2,046 tokens (10.77%)** before the S4 resize
  rule, **8 clones / 196 lines (6.75%) / 2,213 tokens (11.36%)** after it. So S4
  added exactly one clone, 15 lines and 167 tokens: the listener-registration
  block the two popups now share line for line, `select-popup.ts:384-398`
  byte-for-byte `menu-panel.ts:331-345` (`diff` of those two ranges reports no
  difference; the lines just outside them differ, so the range is the shared
  text and not one line wider). That is the cost D86 accepted, now measured
  rather than asserted — and it is the argument for the post-1.0 extraction,
  since a third `resize` policy change has to be written twice.
- The detector under-reports that shared text, and the reason is measured rather
  than assumed. `editableFocusInsidePanel()` is a second S4 body the two popups
  share: `menu-panel.ts:430-441` and `select-popup.ts:553-564`, 12 lines each,
  differing on exactly one line (`diff` reports `5c5`, the
  `'.rv-menu-panel'` / `'.rv-select-popup-panel'` selector). It is not one of the
  8 clones above. Re-running the same pinned 4.0.8 on the two files at
  `--min-tokens 40` still misses it, and at `--min-tokens 20` it appears as two
  fragments of 75 and 63 tokens — so the one differing line splits the shared text
  below the 100-token threshold the check is run at. The honest reading of the
  figure is therefore 8 clones reported and 9 shared blocks present, and the
  extraction argument is one line stronger, not weaker, than the number says.
- Version pinning matters more than the tree here: the same sources measured
  **18 clones / 322 lines (11.30%)** on jscpd 5.4.2. A check that re-runs on a
  moving detector reports drift that is only the tool changing.
- No CI runs any of this: the repository has no `.github/workflows`, no
  `.gitlab-ci.yml` and no other CI file (`git ls-files` finds none). D86's
  "report-only duplication check in CI" therefore ships as a script a person runs,
  alongside `check:popup-ssr`, `check:popup-mutations`, `check:component-theme`,
  `check:contrast`, `check:theme-dark`, `check:pack`, `check:readmes` and
  `check:docs`. Adding CI is out of this plan's scope.
- Browser totals after this change: `npx playwright test` collects 121 tests per
  project and **363 pass — 121 on Chromium, 121 on Firefox, 121 on WebKit — with
  the run exiting 0**. WebKit was not in that sentence a day earlier: `MiniBrowser`
  aborted before a page opened with `error while loading shared libraries:
  libavif.so.16`, and the library was installed by hand on 2026-11-01
  (`apt-get install libavif16 libgav1-1 libyuv0`, the three the Playwright
  `install-deps --dry-run` report names for video decoding). The first real WebKit
  run produced three failures, all in `e2e/select`, and they are an engine
  difference the suite had never been able to see, not a product defect: **WebKit
  lays this demo page out taller than Chromium at the same viewport — measured
  `scrollHeight` 1221 against 1109 at 720px high** (system font metrics). Two of
  the failing cases scroll to the bottom of the document before opening, which on
  WebKit leaves the trigger *above* the viewport (`bottom = -53`), so
  `locator.focus()` scrolls the page itself — and that scroll arrives one frame
  later than on Chromium, after the panel exists, and the documented
  outside-scroll-closes rule fires. The instrumented log is the evidence: six
  document scroll events climbing 457 → 501 with `popupExists: false` and
  `rowCount: 0` on WebKit, against one scroll event and the panel still open with
  `activeRole="menuitemcheckbox"` on Chromium. The RTL case is the same mechanism
  reached through Playwright's click scroll-into-view instead of `focus()`. Fixed
  on the harness side, keeping the state under test: a
  `focusTriggerOnAScrolledPage()` helper scrolls the trigger into view *before*
  focusing, so the document stays scrolled and nothing moves once the panel
  exists, and the RTL pick uses the `{ force: true }` that the two multi-mode
  picks already documented. No library line changed for WebKit. Two of the tests
  (`select: multi mode`, its a11y sibling) click
  rows with `{ force: true }`: Playwright's own scroll-into-view moves the
  document for a top-layer row with no layout change and no JS-visible scroll call
  (measured `scrollY` 70 → 389 at a constant document height), which closes the
  panel by design. A real pointer at the same coordinates keeps it open, so this
  is a harness artifact, and the assertions still require both picks to land.
- One pre-existing Chromium-only failure came out of the full run and is fixed
  here, not silenced: `e2e/menu/api.spec.ts` measures the active row's icon color
  and read `rgb(85, 85, 85)` (muted) against a row at `rgb(17, 17, 17)`. It is a
  race inside the test, not a product defect: `data-active` is an Angular host
  binding (`[attr.data-active]`, `menu-panel.ts:43`) that lands on a
  change-detection tick, while the row's `focus()` is imperative inside the key
  handler — so `toBeFocused()` can be true while the row is still not active. It
  passed 3/3 in isolation and failed only with the suite at four workers. The test
  now waits for `data-active="true"` before measuring, i.e. it waits for the state
  whose style it asserts.
- Every figure above is re-runnable from the repository, which is the point of
  recording the commands rather than the numbers alone. The suite never builds and
  `menu-e2e` bundles the library `dist/`, so the build comes first:
  `PNPM_CONFIG_ALLOW_BUILDS='{"@parcel/watcher":true,"esbuild":true,"lmdb":true,"msgpackr-extract":true}'`
  then `pnpm build:select && pnpm build:menu && npx ng build menu-e2e`, then `npx
  playwright test e2e/popup/conformance.spec.ts --project=chromium
  --project=firefox --project=webkit` (24 cases × 3 engines = 72 runs), `npx
  playwright test` for
  the browser totals, `pnpm check:popup-ssr` (15 checks), `pnpm check:duplication`
  (8 clones), `npx ng test menu` (63) and `npx ng test select` (161). The whole
  mutation table is one command, `pnpm check:popup-mutations`, and `i18n` is not
  in any of them because the popup suite does not import it — the demo pulls
  `@rivinia/menu` and `@rivinia/select` only. A mutation run is those same commands
  after editing the source and rebuilding `dist/menu` + `dist/select` +
  `dist/menu-e2e`, and the tree is only clean again once the restored source has
  been rebuilt — `git diff` on the library is not enough, because the served
  bundle is a build artifact.
- `docs/HUMAN-CHECKS-1.0.md` carries the two human halves this plan cannot
  execute: the S4 real-device resize steps (keyboard, orientation, iOS chrome
  collapse, and the menu as the counter-case) and the S7 Safari steps. Both are
  marked **not tested** and say what result would force a code change rather than
  a documentation change.

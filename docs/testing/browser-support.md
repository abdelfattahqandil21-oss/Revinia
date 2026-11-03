# Browser support — Rivinia 1.0

Versions come from mdn/browser-compat-data, read as raw JSON from `main` on
2026-11-02, and every "what happens without it" column comes from this
repository's own code, quoted by file and line. Nothing here is inferred from a
Baseline badge. Where a claim is about an engine nobody ran, the row says so.

## The two floors

| Floor | Meaning | Chrome/Edge | Firefox | Safari macOS | Safari iOS |
| --- | --- | --- | --- | --- | --- |
| **Supported** | The component works, with the degradations named below. This is the floor the test suite runs against. | 114 | 125 | 17 | 18.3 |
| **Enhanced** | Additionally, the panel is placed by CSS anchor positioning instead of the component's own coordinates. | 131 | never (see the Firefox row) | 26.2 | 26.2 |

Below **Supported** the popup still opens, closes, filters, picks and is
keyboard-operable; it loses the top layer (the panel can be clipped by an
ancestor) and nothing else. That is a deliberate product statement, not a guess:
the fallback is a tested code path, not an untested hope — see "Forcing each
feature off".

## What each feature is used for, and what happens without it

| Feature | Where it is used | C / Fx / Sf | Without it |
| --- | --- | --- | --- |
| `popover` attribute + `showPopover()` | `menu-panel.html:12`, `select-popup.html:9`, both bound to `topLayerSupported` | 114 / 125 / 17 | `topLayerSupported` is false (`menu-panel.ts:235`, `select-popup.ts:270`), the attribute is never written, and the panel stays a positioned descendant. Tested: the conformance suite deletes `HTMLElement.prototype.showPopover` in an init script and asserts the panel still lands on its trigger's leading edge. |
| `anchor-name`, `position-anchor`, `anchor-size()` | the `@supports` block at `menu-panel.css:154` / `select-popup.css:225` | 125 / 147 / 26 | The whole block is dropped, so the component's own inline coordinates place the panel — the path Firefox uses today. |
| `position-try-fallbacks` (`flip-block`, `flip-inline`) | same block, `menu-panel.css:192` / `select-popup.css:256` | 128 / 147 / 26 | Covered by the prelude's `position-area` clause, which is newer in every engine. Without the flip values the panel keeps one placement and can overflow the viewport instead of moving. |
| `position-area` (`block-end span-inline-end`) | same block, `menu-panel.css:205-218` / `select-popup.css:273-282` | 129 / 147 / 26 | Probed. Without the span form the area takes the whole inline axis and the panel aligns to the viewport instead of the trigger — measured once as a 19px departure. |
| `anchor-scope: all` | `menu-panel.css:169`, `select-popup.css:241` | **131** / 147 / 26 | **This is the gap the widened prelude closes.** An engine that enters the block but ignores the scope resolves a duplicate `anchor-name` to the last element laid out, so every panel on the page anchors to the LAST trigger. The repository measured exactly that: three selects, all three panels on the third trigger, up to 431px away from their own (`select-popup.css:232`). |
| `position-visibility: anchors-visible` | `menu-panel.css:193`, `select-popup.css:258` | 125 / 147 / **26.2** | Probed. Where the declaration alone is missing, the panel keeps its anchor placement but stops hiding when its trigger scrolls out of view. |
| `color-mix()` | token defaults, e.g. `select-popup.css:322,326,342`, `menu-panel.css` rows | 111 / 113 / 16.2 | Inside `var(--token, color-mix(…))`: a consumer who sets the token never reaches it; below the floor the declaration is invalid at computed-value time and the row loses its hover wash. Cosmetic only. |
| `@layer rivinia-theme` | `theme/styles/theme.css:63`, `bootstrap.css` | 99 / 97 / 15.4 | Unsupporting engines treat the defaults as unlayered, which beats every consumer layer. Above the floor this cannot happen. |
| `:has()` | `select-panel.css:283` (search-bar height) | 105 / 121 / 15.4 | That one rule does not match; the panel keeps its default height. |
| `dvh` / `dvw` | `menu-panel.css:36,38`, `select-popup.css:88,90,156,464` | 108 / 101 / 15.4 (iOS mirrors Safari) | `calc(100dvh - 2rem)` invalidates the declaration, so `max-height`/`max-width` revert to their previous value — a long panel can extend past the viewport instead of scrolling inside it. |
| `prefers-color-scheme` | `theme/styles/theme.css` (dark block) | 76 / 67 / 12.1 (iOS 13) | No dark defaults; `data-rv-theme="dark"` still works, because the attribute selector does not need the media query. |
| `prefers-reduced-motion` | `menu-panel.css:313`, `select-popup.css:411` | 74 / 63 / 10.1 (iOS mirrors Safari) | Animations run regardless of the user's setting. |
| `forced-colors` | `menu-panel.css:332`, `select-popup.css:508`, `language-toggle.css:93` | 89 (Edge 79) / 89 / 16 (iOS mirrors Safari) | Below it, forced-colors mode gets our normal colours, which the theme's contrast gate does not measure. `forced-color-adjust` is NOT used anywhere in the shipped CSS, so Safari's missing support for that property is not our problem. |
| `Intl.ListFormat` | `select/utils/selection-summary.ts:43,59` | 72 / 78 / 14.1 (iOS 14.5) | Both call sites guard with `typeof … !== 'function'` and join with `', '`. |
| `navigator.languages` | `i18n/utils/i18n-utils.ts:72` | universal | universal | Falls back to `navigator.language`, then to nothing. |

## Firefox is excluded from the anchor block, on purpose

The prelude ends `(not (-moz-appearance: none))`. With the block live, Firefox
places an RTL panel at the NEGATIVE of the correct x (measured: trigger 895..960,
panel -690..-420 for `bottom-end`, Chromium 690..960) because
`justify-self` inside a `span-inline-*` area is wrong in every keyword. Firefox
therefore always takes the component's own coordinates, which the suite measures
correct in both directions on every run.

Consequence for the matrix: Firefox's support dates for anchor positioning (147)
are irrelevant to what Rivinia does, and "Enhanced" for Firefox is **never**. The
flip side is that the JS placement path is not a hypothetical fallback — it is
the path a thrice-daily-tested engine uses.

## The `popover` bug that does not apply

`popover=auto` on iOS 17.0–18.2 does not light-dismiss on a tap outside (WebKit
bug 267688, fixed in Safari 18.3 per Apple's release notes). This library ships
`popover="manual"`, which has no light dismiss by specification; outside
dismissal is our own `document` `pointerdown` handler, and the conformance suite
tests it on Chromium, Firefox and WebKit. So the bug is not reachable here — but
the iOS floor is still 18.3 rather than 17, because a support table is a promise
about the bottom of the range, not about one lucky code path.

## The engines actually installed here (measured 2026-11-02)

Playwright 1.64.1, on this machine, asked `CSS.supports` about the shipped
prelude clause by clause:

| Engine | Version | `anchor-name` | `anchor-scope: all` | `position-area` span | `position-visibility: anchors-visible` | Whole prelude |
| --- | --- | --- | --- | --- | --- | --- |
| Chromium | 156.0.8078.4 | yes | yes | yes | yes | **true** |
| Firefox | 157.0 | yes | yes | yes | yes | false — only the `not (-moz-appearance: none)` clause |
| WebKit | 27.2 (Safari UA) | yes | yes | yes | yes | **true** |

Two things worth reading off that table. Firefox 157 has every anchor feature and
is still excluded, which is the RTL bug, not a missing implementation. And the
installed engines are two to three majors above the Enhanced floor, so the
band between the floors — Chrome 114–130, Safari 17–26.1 — is described here from
`@supports` arithmetic and was never run. `e2e/popup/anchor-gate.spec.ts` is what
makes that band's rule enforceable: it asks the loaded engine, not a table.

jsdom, which runs the unit suites, is behind both of them: it accepts
`anchor-scope: all` and rejects `position-visibility: anchors-visible`, knowing
only the singular `anchor-visible` value that Chromium 157 renamed. That is why
the two CSS spec files check the prelude's *grammar* in jsdom and leave the
support question to the browser.

## Running WebKit on this machine

Playwright's WebKit bundle expects three system libraries that are not installed
by default here: `libavif16`, `libavif`'s decoder `libgav1-1`, and `libyuv0`.
Without root, `apt-get download` plus `dpkg -x` into a scratch directory and an
`LD_LIBRARY_PATH` pointing at it (or a symlink into
`~/.cache/ms-playwright/minibrowser-gtk/sys/lib`) is enough; with root, the same
thing is `npx playwright install-deps webkit`. Every WebKit number quoted in this
repository comes from a headed run on WebKit 27.2 after that install.

## Forcing each feature off — what is actually tested

| Feature | Forced off by | Where proved |
| --- | --- | --- |
| `popover` / top layer | `delete HTMLElement.prototype.showPopover` in a Playwright init script, before boot | `e2e/popup/conformance.spec.ts`, "without the top layer it still opens, positions and picks", 3 engines |
| CSS anchor positioning | not simulated: Firefox never enters the block, so every placement assertion in the suite runs on the JS path three times a day | the same suite, `--project=firefox` |
| the anchor `@supports` condition | read out of the stylesheet the browser loaded, then judged by that engine | `e2e/popup/anchor-gate.spec.ts`: the condition survives the build, each engine's answer matches the path it should take, an engine that takes it supports every feature inside, and `anchor-scope`/`anchor-name` computed values prove the block is live |
| `anchor-scope` | cannot be forced on an engine that supports it; the failure it prevents is measured and recorded at `select-popup.css:232` | this document + the prelude test in both CSS spec files |
| `Intl.ListFormat` | `Intl.ListFormat` set to `undefined` inside a unit test, then restored | `projects/select/tests/select-multi-summary.spec.ts:422` — asserts `'Alpha, Beta, Gamma'` |
| `color-mix()`, `:has()`, `dvh` | not forced — no engine on the supported floor is missing them | not tested; the row above states what would happen |
| JS on the server | `window`/`document` not defined at all, in plain Node | `pnpm check:popup-ssr`, 15 checks |

**Not tested**: real Safari, macOS or iOS — WebKit is the engine Playwright
drives, not the product; see `docs/releases/1.0/HUMAN-CHECKS.md`. Browsers between the two
floors were not run; this machine has one version of each engine. Their behavior
is derived from the `@supports` conditions, which are parseable facts, not from
measurement.

## No CI runs this

The repository has no CI configuration (`git ls-files` finds no
`.github/workflows`, no `.gitlab-ci.yml`). S7's acceptance line "CI runs three
engines" therefore ships as `playwright.config.ts`, which defines chromium,
firefox and webkit projects and is run by hand — the numbers in
`docs/releases/1.0/MERGES.md` come from those human runs.

## The claim this document corrects

`menu-panel.css:96` and `select-popup.css:161` used to say "Baseline
widely-available since 2026-01". That was wrong in the direction that matters.
Anchor positioning reached Baseline **low** on 2026-01-13 (Chrome 125, Firefox
147, Safari 26). Baseline "widely available" is the low date plus 30 months: for
anchor positioning that is **2028-07-13**. `popover` is low 2025-01-27, widely
2027-07-27. So neither feature is a safe hard requirement for a library
supporting "the last two years of browsers" today, which is why both are
`@supports`/feature-detected enhancements rather than prerequisites. Both
comments now state the low date and what it does not mean.

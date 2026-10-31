# SPEC — Multi-select summary and the width contract (`@rivinia/select` 0.7.1)

Status: **revised after owner review** (2026-10-31, second pass) — final review
pending. No implementation, version bump, tag or publish until the owner
approves this file. Decisions confirmed in the grilling rounds of 2026-10-31
(Q1–Q12), plus nine amendments from the owner's reviews:

1. locale is a **reactive source**, not a DOM read inside a computed;
2. invalid locales fall back safely, not only a missing `Intl.ListFormat`;
3. the narrow-container browser cases are split and `100%` is its own case;
4. the accessibility matrix has explicit, per-case assertions;
5. hydration has a stated, version-checked strategy with a gate, not an
   assumption (§5.1);
6. the observer has a fixed single-instance lifecycle, and formatter reuse is
   tested by identity (§5.1, §6);
7. clearing selections must remove the description and leave no stale ID
   (§5, §6);
8. the hydration proof uses a **non-empty** select whose locale differs
   between server and client, not an empty one (§5.1, §6);
9. formatter identity is proved through the **internal cache**, with no
   global-constructor spy and no test-only API (§5.1, §6).

The width CSS, release sequence and D84 were approved as written; §8 gains the
FESM "helper is actually internal" check and the SSR-hydration proof.

## 1. Defect and evidence

Measured on the built demo (`rv-tailwind`, production build, Chromium 141):

| Claim | Measurement |
| --- | --- |
| the host grows with the selection | `rv-select` **272px → 637.3px** after picking all 8 skills |
| it escapes its own cell | cell **544px**; the growing control overflows the card |
| the panel no longer matches | panel stays **272px** while the open trigger is **637px** |
| no ellipsis is possible | `.rv-select-value` never truncates because the host itself grows |

Cause: the host is `inline-block` with `min-width: min(--rv-select-width, 100%)`
— a **floor**, no ceiling. The trigger is `width: 100%` of that shrink-to-fit
box, and the value is `white-space: nowrap`, so the box's max-content width
wins up to the container. Selecting more values therefore widens the control
instead of truncating it.

Evidence image: `/tmp/rv-demo-shots/12-multi-overflow.png`.

## 2. Goal and non-goals

Goal: one **fixed reference width**, and a **one-line summary** for multi mode
that never changes the trigger's height or width as selections change.

Non-goals (explicitly out of scope for 0.7.1):

- wrapping labels or chips inside the trigger;
- per-chip remove buttons (impossible inside the trigger's single `<button>`
  without rebuilding the widget);
- `maxVisible` / display-customisation inputs;
- new design tokens;
- controller (`RiviniaSelect`) API changes;
- single-mode display changes (it keeps its 0.7.0 behaviour);
- panel semantics, search, keyboard model, positioning.

## 3. Width contract

Replaces the floor with a reference width. Exact CSS for `rv-select`:

```css
rv-select {
  display: inline-block;
  width: min(var(--rv-select-width, 14rem), 100%);
  max-width: 100%;
  min-width: 0;
}
```

Rules:

- `--rv-select-width` is the **reference width**, not a floor. Content never
  determines the control's width.
- `min-width: 0` is load-bearing in flex/grid: the automatic minimum size of a
  `nowrap` item would otherwise push the control past its container.
- `100%` caps against the containing block; a consumer who wants full width
  sets `--rv-select-width: 100%`.
- The trigger keeps `width: 100%` of the host; `.rv-select-value` gains an
  explicit `min-width: 0` so truncation does not depend on the automatic
  minimum-size rule.
- The panel already follows the trigger in both paths — `anchor-size(inline)`
  (CSS anchor) and `root.style.width = trigger.width` (JS). No panel code
  changes. Because the trigger no longer grows with content, the measured
  panel/trigger mismatch cannot recur.
- `window.resize` while open still closes the popup (existing contract in
  `select-popup.ts`); this spec does not add a live re-position.

Behaviour matrix (each row is proved separately in the browser, §6):

| Container | Expected |
| --- | --- |
| block, wider than 14rem | control is exactly `--rv-select-width` |
| flex row, wider than 14rem | same; siblings are unaffected |
| flex row narrower than 14rem | control shrinks to the container, value truncates |
| 12rem container | control is exactly 12rem (192px); no horizontal overflow |
| 96px container | control is exactly 96px; no horizontal overflow; ellipsis |
| `--rv-select-width: 100%` | control fills the container |

## 4. Summary contract

`values` is in **pick order** (documented controller contract); the summary
reads it without sorting or registry lookups.

| Multi selection | Visible trigger | Count pill | Description (§5) |
| --- | --- | --- | --- |
| 0 | `placeholder` | none | none |
| 1 | that label | none | see §5 matrix |
| ≥ 2 | **first picked** label | `+{count - 1}` | see §5 matrix |
| first pick removed | the next pick becomes first | recomputed; **none** when only one remains | recomputed |

- Single mode is unchanged: one label or the placeholder, no pill, no
  description. Long labels truncate with an ellipsis.
- The pill never grows the trigger: `flex: none`; the value keeps `flex: 1;
  min-width: 0` and owns the ellipsis.
- Placeholder and empty states are unchanged.

Markup contract (trigger children, in order):

```html
<span class="rv-select-value">{{ visibleValue() }}</span>
@if (overflowCount() > 0) {
  <span class="rv-select-count" aria-hidden="true"><bdi dir="ltr">+{{ overflowCount() }}</bdi></span>
}
<svg class="rv-select-chevron" aria-hidden="true">…</svg>
```

The description element is a **sibling of the trigger**, inside `.rv-select` —
never a child. A hidden child would become part of the content-based name and
could be announced twice (once in the name, once as the description).

```html
@if (selectionDescription(); as text) {
  <span class="rv-select-sr-only" [id]="selectionId">{{ text }}</span>
}
```

Visual rules for the pill (no new token):

```css
.rv-select-count {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  padding: 0 0.4em;
  border-radius: 999px;
  font-size: 0.75em;
  font-variant-numeric: tabular-nums;
  color: var(--rv-select-muted, var(--rv-muted, #555555));
  background: color-mix(in srgb, var(--rv-select-muted, var(--rv-muted, #555555)) 12%, transparent);
}
```

- The pill sits at the inline end, before the chevron; in RTL that is the
  left-hand side, and `<bdi dir="ltr">` keeps `+7` as `+7`.
- The pill must not change the trigger's height (measured 44.5px before and
  after) or the panel's width.
- Both skins (`simple`, `premium`) read the same tokens; dark mode follows
  `--rv-select-muted` with no extra rule. No motion is added.

## 5. Accessible description

| Name source | Count | `aria-describedby` target |
| --- | --- | --- |
| any | 0 | **none** — no hidden element and no attribute |
| `label` (caption) | ≥ 1 | full list, all selected labels |
| `ariaLabel`, no caption | ≥ 1 | full list, all selected labels |
| neither (name from content) | 1 | **none** — the visible label is the whole value |
| neither | ≥ 2 | the **remaining** labels (2..n); the first is already the name |

- The description element is visually hidden with a CSS clip technique
  (`.rv-select-sr-only`, `position: absolute`, 1px, `clip-path: inset(50%)`),
  **not** `display: none` and **not** `aria-hidden`: IDREF targets must remain
  in the accessibility tree.
- The list is formatted with `Intl.ListFormat` in the page language,
  e.g. `"TypeScript وAngular وSignals"` / `"TypeScript, Angular, and Signals"`.
  No English prefix such as “Selected:”.
- `+N` is `aria-hidden`; the chevron already is.
- The name rules already in place stay: `aria-labelledby` points at the
  caption, `ariaLabel` remains an attribute (labelledby wins when both exist),
  and no name is invented when neither is set.
- Proof is against the **accessibility tree** (`toHaveAccessibleName` /
  `toHaveAccessibleDescription` in Playwright), not attribute presence alone.

Explicit assertions per case (owner-review amendment; each row is its own test
in slice 1):

| Case | Name | Description | `+N` |
| --- | --- | --- | --- |
| `label="Skills"`, 8 picks | `Skills` | full 8-label list | in neither |
| `ariaLabel` set, no caption, 8 picks | that `ariaLabel` value | full 8-label list | in neither |
| neither, 2 picks | first pick (content-based) | remaining label(s) only | in neither |
| neither, 1 pick | that label (content-based) | **none** — no `aria-describedby` | n/a |

The third row is the one that depends on the trigger's content-based name, so
it is asserted twice: the trigger's text content **and** its computed
accessible name.

### 5.1 Locale is a reactive source

`document.documentElement.lang` is **not** read inside a computed. Reading DOM
is invisible to Angular's dependency graph: the computed would keep its stale
value even after change detection ran.

The contract:

- The component holds an internal `pageLang` **signal**, seeded from the
  injected document's `lang` with the resolution rules of §5.2.
- In the browser, a `MutationObserver` watches `documentElement` for the `lang`
  attribute only (`attributeFilter: ['lang']`) and writes the re-resolved locale
  into that signal. A language switch therefore re-renders the description
  through normal signal reactivity — no manual `detectChanges`, no consumer
  input, no new dependency.
- **Observer lifecycle is fixed:** exactly one observer per component instance,
  created once after the first render (Angular's `afterNextRender`, which does
  not run during SSR, so SSR never constructs it). A `lang` change updates
  `pageLang` only — the observer is never recreated, and its callback never
  touches the formatter cache beyond a map lookup. It is disconnected once, in
  `DestroyRef.onDestroy`.
- The formatter is **memoised per locale by the internal helper**: a
  `formatterFor(locale)` factory in `selection-summary.ts` owns a module-level
  `Map<locale, Intl.ListFormat>` and returns the same instance for the same
  locale, so `ar → en → ar` hands back the original `ar` object. The cache
  lives in the helper, not on the component, so identity can be asserted
  without reaching into component privates or adding a test-only API, and two
  component instances do not duplicate formatters. The map holds only locale
  keys and immutable formatters — no user data — so reuse across instances and
  across SSR requests is safe. Labels are not re-joined on every
  change-detection tick.
- **Locale source is `inject(DOCUMENT)`, not the `document` global.** Angular's
  server platform provides a document object (`@angular/platform-server`'s
  `_document()` factory, `_server-chunk.mjs` in 22.2.3), so the same code path
  runs on both sides. When the server and client documents carry the same
  `lang`, both sides start from the same locale; when they differ — as in the
  fixture below — the rules that follow apply.
- **Hydration strategy when the server document has no `lang`, or a different
  one:** the client's first render already resolves from the client document,
  so the description text can differ from the server's. This is safe by
  construction in the installed version: Angular validates a text node's
  **type**, not its content (`validateMatchingNode` checks `nodeType`/`tagName`
  only — `_debug_node-chunk.mjs` in `@angular/core@22.2.3`), and interpolation
  re-applies the binding after hydration. `NG0500` is raised for node-type/tag
  mismatches, not for different text.
- The description element's **presence** is a function of the selection count
  and the name source (§5) — both derived from component inputs, not from the
  DOM, so server and client agree on it.
- **The hydration fixture is non-empty and locale-differing.** It renders a
  select with three fixed selections and a caption, so the description exists
  on both sides and its text is the only thing that may differ. The server
  document is `lang="en"`, so the server HTML carries the English list. The
  client fixture sets `document.documentElement.lang = 'ar'` in `main.ts`
  before `bootstrapApplication` — the documented consumer pattern for applying
  a stored language — so the client's first render resolves Arabic, the text
  differs from the server DOM, and hydration must still succeed. The
  selections come from the fixture's static `value` input, not from storage,
  so both sides derive the same count and the same element presence.
- The guarantee therefore covers **server-rendered selections whose text
  differs by locale**. A value restored from storage after the client boots is
  a different case and is not claimed here.
- Because the hydration claim is version-specific, it is **proved at the
  gate**, not assumed: the captured server HTML must contain the English
  description; Playwright then hydrates with console capture and must show no
  `NG05xx` error and the Arabic list after hydration (§6, §8). If the gate
  disproves the text update, the claim is withdrawn and the decision returns
  to the owner — it is not silently narrowed.

### 5.2 Locale resolution and failure modes

Resolution order, applied by a pure helper that takes the injected document
(or null) as an argument:

1. The language on the injected `DOCUMENT`'s `documentElement` (trimmed) when
   **constructing a formatter for it does not throw**.
2. An invalid or empty locale → `'en'`.
   `new Intl.ListFormat('invalid_locale')` throws `RangeError`; the helper
   catches it and retries with `'en'` instead of letting the render fail.
3. `Intl.ListFormat` missing from the runtime → `labels.join(', ')`.
4. No document available at all (`DOCUMENT` absent on a non-DOM platform) →
   `'en'`, then rules 1–3 apply to it.

Every branch is unit-tested (§6, slice 3); the browser proof covers the live
language switch.

The helpers (`resolveListLocale`, `formatterFor`, `formatSelectionList`) live in
an internal utility. They are DOM-independent and deterministic and take the
locale as an argument, so the SSR path is testable without a DOM;
`formatterFor` keeps the locale-keyed instance cache described above — internal
state, no observable side effect for a consumer.

## 6. Files and test plan

Files:

| File | Change |
| --- | --- |
| `projects/select/ui/src/lib/components/select/select-panel.ts` | summary computed/methods, second id, `pageLang` signal + `MutationObserver`, description wiring; `display()` replaced |
| `projects/select/ui/src/lib/components/select/select-panel.html` | pill, description span, `aria-describedby` |
| `projects/select/ui/src/lib/components/select/select-panel.css` | width contract, `.rv-select-sr-only`, pill, value `min-width: 0` |
| `projects/select/ui/src/lib/utils/selection-summary.ts` | **new** internal helper — locale resolution, formatting and the memoized formatter cache; not exported from any public API or `exports` entry |
| `projects/select/tests/select-multi-summary.spec.ts` | **new** unit suite |
| `projects/select/tests/panel-metrics.spec.ts` | width assertions updated (old `min-width` expectation removed) |
| `projects/select/README.md` | multi summary, width wording, token row |
| `CHANGELOG.md` | `0.7.1` fixed entry |
| `docs/DECISIONS.md` | D84 (only after approval) |
| `docs/SPEC-select-multi-summary.md` | this file |

Unit slices, in order (the owner asked for description tests in slice 1):

1. **Summary + a11y (same slice):** 0/1/2/8 selections; `+N` value; pill
   `aria-hidden`; `<bdi dir="ltr">`; name matrix of §5; removal of the first
   pick promotes the next; `ariaLabel` precedence preserved; single mode has no
   pill and no description; placeholder unchanged. Plus the clearing cases:
   - clear all after 8 picks → no `aria-describedby`, no hidden element, no
     stale ID left on the trigger;
   - remove the first pick leaving one, with no `label`/`ariaLabel` → the
     remaining label becomes the name and the description disappears.
2. **Width contract:** `panel-metrics` asserts `width`, `max-width`, `min-width`
   on `rv-select`, and `min-width: 0` on `.rv-select-value`; pill `flex: none`.
3. **Description mechanics:**
   - `Intl.ListFormat` in `en` and `ar`;
   - invalid locale (`'invalid_locale'`) → `RangeError` caught → `'en'`;
   - empty `lang` → `'en'`;
   - missing `Intl.ListFormat` → `labels.join(', ')`;
   - `resolveListLocale(null)` (no `DOCUMENT`) → `'en'`, no DOM access;
   - mutating `documentElement.lang` updates the description (signal path);
   - **created after the first render, exactly once:** with a spy on the
     `MutationObserver` constructor, the count is **0 immediately after
     `TestBed.createComponent`** — construction and the render pass only queue
     the `afterNextRender` hook, and the zoneless scheduler's tick is a
     scheduled callback, not synchronous — and **exactly 1 after
     `TestBed.tick()`** (exported in 22.2.3; it calls `ApplicationRef.tick()`,
     which runs `afterNextRender`). Subsequent `lang` changes and ticks keep it
     at **1**;
   - **formatter reuse by identity:** `formatterFor('ar') === formatterFor('ar')`
     and `ar → en → ar` returns the identical instance (`toBe`), imported from
     the internal helper path — no global-constructor spy, no public or
     test-only API;
   - the description string equals the cached formatter's output for that
     locale, checked against independent literals for `en` and `ar` (not
     re-derived the way the implementation derives it);
   - destroying the fixture disconnects the observer (no callbacks after
     destroy).
4. **Browser verification.**

The SSR + hydration case runs in the clean consumer fixture, not in this
workspace: `projects/` has no select e2e or SSR project (`i18n-e2e` and
`menu-e2e` are the only e2e projects), so the fixture is generated with
`--ssr` (or gains `ng add @angular/ssr`) and renders the select on the server
before the browser hydrates it. Its select has **three fixed selections and a
caption**, its `index.html` carries `lang="en"`, and its `main.ts` sets
`document.documentElement.lang = 'ar'` before `bootstrapApplication`.

Browser matrix (Chromium + Firefox; WebKit reported as not run if unavailable):

| Case | Assertion |
| --- | --- |
| block container, 8 picks | width **272px before and after**, `+7`, height 44.5px |
| flex row, wider than 14rem | reference width; no sibling shift |
| flex row, narrower than 14rem | no overflow, no sibling displacement, value truncates |
| **12rem container** | control is exactly **12rem (192px)**, no overflow |
| **96px container** | control is exactly **96px**, no overflow, ellipsis |
| **`--rv-select-width: 100%`** | control fills the container (its own case, not inferred from the narrow ones) |
| single, long label | width stable, ellipsis |
| RTL (`ar`) | pill at inline end, `+N` order preserved, panel matches the trigger |
| language switch while rendered | mutate `documentElement.lang` to `ar`; description text updates without a reload |
| clear after 8 picks | `aria-describedby` attribute absent; `.rv-select-sr-only` element absent |
| promote-on-removal, no label | name = the remaining label; description absent |
| **SSR + hydration (non-empty)** | server `lang="en"`: the captured server HTML contains the **English** description; `main.ts` sets `lang="ar"` before bootstrap; after hydration the console shows no `NG05xx` and the description is the **Arabic** list, while the trigger summary is unchanged |
| panel | open width === trigger width; picking does not change either |
| dark theme | pill/tokens recompute; no contrast loss |
| a11y tree | `toHaveAccessibleName` / `toHaveAccessibleDescription` for each row of the §5 table |
| console | no page/console/network errors |

## 7. Contradictions this spec supersedes

- `projects/select/README.md` (“select floor; panel follows it”, and “One
  floor … sits on the select itself”) — becomes **reference width**.
- `projects/select/tests/panel-metrics.spec.ts` pins
  `min(var(--rv-select-width, 14rem), 100%)` as `min-width` — replaced.
- D82 (“the floor a shrink-to-fit host loses”) — the panel-follows-trigger half
  stands; the floor half is superseded by D84.
- The `label` input JSDoc (“the trigger's own text is the selected value,
  which changes as they pick”) — for multi it is now a summary; JSDoc updated.
- Q4’s “accessible name reflects every selection” is implemented as
  **description** per the owner’s Q7 answer, with no duplication.

## 8. Release and demo

- Branch: `pkg/select/multi-trigger-summary`; one logical commit per slice
  segment; merge `--no-ff` after review.
- Gates before any bump: `pnpm build select`, `ng test select`,
  `npm pack` and FESM inspection, clean consumer fixture, Playwright matrix.
  The FESM check is **not only an import grep**: it also confirms that
  `selection-summary` is internal — absent from `public-api.ts`, from the
  package `exports` map and from the FESM's exported surface — and that no
  dependency was added to `package.json` or to the FESM's import list.
  The matrix includes the **SSR + hydration** case; its result — English
  description in the server HTML, no `NG05xx` in the console, Arabic
  description after hydration — is recorded here.
  Bundle sizes are measured and recorded here before release; no allowance is
  claimed until measured.
- Version bump to **0.7.1** only after the gates; tag `select/v0.7.1` and
  publish only with the owner's explicit confirmation, from the inspected
  tarball. Nothing is pushed or published before that.

### Results (2026-10-31)

- **Build and unit tests.** `ng build select` green; `ng test select` →
  **135 tests in 17 files**, 24 of them new in
  `select-multi-summary.spec.ts` (`select-panel` and `panel-metrics` extended).
- **Packed artifact.** `npm pack` → `rivinia-select-0.7.0.tgz` (the version bump
  is still pending), 70,904 B, 9 files, sha512 `bdc2ebd3…`. The core FESM is
  byte-identical to the published 0.7.0; `/ui` grows by **+4,523 B raw
  (81,151 → 85,674), +1,063 B gzip, +803 B brotli**. The helper is absent from
  `public-api.ts`, from the `exports` map and from the FESM's exported surface
  (the only exports remain `RiviniaSelectComponent`, `SELECT_GAP`,
  `computeSelectPosition`), and the FESM imports are unchanged
  (`@angular/*` and `@rivinia/select`); no dependency was added.
- **Browser matrix.** 18 tests × Chromium, Firefox and WebKit **27.2** = **54
  passed**, run on an SSR consumer built from that exact tarball (byte-identical
  `cmp`) and served on :4390. WebKit ran headed: headless WebKit on this host is
  the WPE bundle, which is missing `libavif`/`libgav1`/`libyuv`; the GTK bundle
  is complete.
- **SSR + hydration.** The server response carries `<html lang="en">`,
  `ng-server-context="ssr"`, the value `TypeScript`, the `+2` pill and the
  English list with a live `aria-describedby` target. After hydration the page
  is `ar`, the description is Arabic, the summary is unchanged, and no `NG05xx`
  appears. Re-checked in all three engines.
- **i18n 0.8.0 compatibility.** With the select's own floor gone, the shipped
  picker's host (`inline-block`, `min-inline-size: 14rem`) still gives the
  composed select 224px, the panel 224px and 19.6px label lines — measured, not
  inferred.
- **Harness finding.** A Playwright click dispatched during the panel's
  entrance animation makes Playwright scroll the page (~189px); a page scroll
  closes a fixed-position panel by design. A real pointer click at the same
  moment keeps it open, and a click after the animation never scrolls. The gate
  now scrolls the trigger into view before opening and waits for the animation.
- Not run: Safari proper (WebKit is the engine, not the browser chrome).
- Demo (`/media/abdelfattahqandi/OWN/demos/rv-tailwind`): verify with a locally
  packed tarball first; update `@rivinia/select` to `^0.7.1` only after the
  registry has it. The owner restarts `ng serve` on :4300 — this work never
  restarts or kills his server.

## 9. Acceptance

1. Width is stable across 0→8 picks in block, flex and narrow containers;
   12rem, 96px and `--rv-select-width: 100%` are each proved as their own
   case, and nothing overflows its cell.
2. Summary states 0/1/2+ exactly as §4, including the promote-on-removal case.
3. The pill is `aria-hidden`, LTR-isolated, tabular, non-shrinking and does not
   change the trigger height.
4. Each row of the §5 accessibility table holds in the accessibility tree —
   including the content-based-name case — with no duplicated label and no
   `+N` in the name or the description; clearing all selections leaves no
   `aria-describedby`, no hidden element and no stale ID.
5. Locale is reactive: mutating `documentElement.lang` updates the description
   without a reload. Exactly one observer exists per instance across language
   changes, it is created after the first browser render (`afterNextRender`),
   never during SSR, and is disconnected on destroy.
6. The formatter is reused by identity when returning to a locale
   (`ar → en → ar`), and no instance is constructed per change-detection tick.
7. `Intl.ListFormat` follows the page language and updates live when `lang`
   changes; invalid locales fall back to `'en'`; a missing API falls back to
   `join(', ')`; with no document available the locale resolves to `'en'`.
8. SSR + hydration is proved on a **non-empty** select: the server HTML
   carries the English description, the client sets `lang="ar"` before
   bootstrap, hydration raises no `NG05xx`, and the description ends in
   Arabic.
9. Single mode, placeholder, panel width and the keyboard contract are
   unchanged.
10. RTL, dark theme and both variants render correctly.
11. Docs updated (D84, CHANGELOG 0.7.1, README); the FESM check proves the
    helper is internal and adds no export or dependency; every gate in §8 is
    executed or reported as not run.

## Appendix — proposed D84 (not yet written to `docs/DECISIONS.md`)

> ## 2026-10-31 — D84: select's width is a reference, not a floor; multi shows a summary
>
> **Evidence.** A multi select with 8 picks measured 272px → 637.3px inside a
> 544px cell, and its open panel stayed at 272px. The host was `inline-block`
> with only a `min-width` floor and a `nowrap` value, so content drove the
> width and the panel/trigger pair diverged.
>
> **Decision.** `--rv-select-width` is the control's reference width, capped by
> its container (`width: min(…, 100%)`, `max-width: 100%`, `min-width: 0`).
> Multi mode shows the first picked label plus `+{count-1}`; the full list
> lives in `aria-describedby`, formatted with `Intl.ListFormat` in the page
> language, and `+N` is `aria-hidden`. No new inputs or tokens; single mode is
> untouched.
>
> Locale is a reactive internal signal, not a DOM read inside a computed: a
> browser-only `MutationObserver` on `documentElement`'s `lang` (created after
> the first render, disconnected on destroy, never created during SSR) feeds
> it, the formatter is memoised per locale inside the internal helper
> (`formatterFor`), and invalid locales fall back to `en`. The summary helpers
> are internal — no public export, no new dependency.
> Text that differs across hydration is safe because Angular 22.2.3 validates a
> text node's type, not its content; this is proved at the gate on a
> **non-empty** select whose locale differs between server and client (server
> render + client hydrate, no `NG05xx`), not assumed.
>
> **Rejected.** Wrapping/chips (layout shift per pick, JS measurement for the
> remainder, and per-chip remove is impossible inside one `<button>`);
> a `maxVisible` input in a patch release.
>
> **Consequences.** Supersedes the floor half of D82 and the README's “floor”
> wording; `panel-metrics` expectations change; 0.7.1 is a patch because the
> overflow is an implementation defect, not a preference.

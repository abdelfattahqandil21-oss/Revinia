# Changelog

Per-package behavior changes. Pre-1.0: minor = breaking/feature, patch = fix.
A change is listed the moment it lands on `main`, not when npm is published.

## Prepared releases (unpublished)

### @rivinia/select 0.7.1 (prepared, not published)

Two fixes to the multi trigger, both found in a browser and proved in a browser:
the trigger no longer grows with every pick, and the picks it cannot show are
still announced. No public API changed — no new input, token or export — so this
is a patch.

- **Fixed: the multi trigger grew with every pick.** `--rv-select-width` was a
  `min-width` floor on an `inline-block` host whose value was `nowrap`, so
  content drove the width: eight picks took the control from 272px to 637.3px
  inside a 544px cell, and the open panel stayed at 272px while the trigger grew
  away from it. The token is now the control's **reference width** —
  `width: min(var(--rv-select-width, 14rem), 100%)`, `max-width: 100%`,
  `min-width: 0` — and the trigger fills it, so the panel keeps matching it.
  A flex row wider than the reference no longer shifts its siblings; a narrower
  container shrinks the control instead of overflowing it (proved at 12rem,
  96px and `--rv-select-width: 100%`).
- **Fixed: the multi trigger showed one label and hid the rest from everyone.**
  Multi mode now shows the first picked label plus a `+{count-1}` pill. The pill
  is `aria-hidden`, LTR-isolated with `<bdi dir="ltr">` (so `+7` never reads
  right-to-left), tabular and non-shrinking, and does not change the trigger's
  height. The full list — in pick order — is exposed as the trigger's
  **description** through `aria-describedby` and a clipped sibling, so a screen
  reader hears every selection without the visible name being repeated.
  Removing the first pick promotes the next label; clearing every pick removes
  the pill, the hidden element and the `aria-describedby` attribute.
- **The description follows the page language, live.** It is formatted with
  `Intl.ListFormat` in `documentElement.lang`, so `en` says
  "TypeScript, Angular, and Signals" and `ar` says "TypeScript وAngular
  وSignals". One `MutationObserver` per instance, created after the first
  browser render and disconnected on destroy, re-resolves the locale when
  `<html lang>` changes — no reload, no SSR observer. Invalid locales fall back
  to `en`, a missing `Intl.ListFormat` falls back to `join(', ')`, and the
  formatter is memoised per locale, so returning to a locale reuses the same
  instance. The helpers are internal: absent from `public-api.ts`, from the
  package `exports` map and from the FESM's exported surface, and the FESM's
  import list is unchanged.
- **Proven by** 135 unit tests in 17 files (24 new in
  `select-multi-summary.spec.ts`; `select-panel` and `panel-metrics` extended),
  and 54 real-browser tests — 18 each in Chromium, Firefox and WebKit 27.2 —
  from an SSR consumer built on the packed tarball. That matrix includes the
  hydration case: the server HTML carries the English description with
  `lang="en"`, the client sets `ar` in `main.ts` before bootstrap, hydration
  raises no `NG05xx`, and the description ends in Arabic. Also checked: the
  `@rivinia/i18n@0.8.0` picker host (inline-block, `min-inline-size: 14rem`)
  still gives the composed select 224px and one line per row, so removing the
  select's own floor does not regress the published picker.
- **Sizes and artifacts.** Core FESM byte-identical to 0.7.0
  (`rivinia-select.mjs`, 3,711 B raw / 1,279 B gzip / 1,121 B brotli); `/ui`
  +4,523 B raw / +1,063 B gzip / +803 B brotli (81,151 → 85,674 raw). Tarball
  70,904 B, 9 files, sha512 `bdc2ebd3…`. Version bump, tag, publish and push are
  still pending an explicit go-ahead.

### @rivinia/i18n 0.8.0 (published 2026-10-31)

The language picker: a third entry point, `@rivinia/i18n/select`, composed from
`@rivinia/select` instead of re-implementing a listbox. Additive — no core or `/ui`
signature changed, and the optional peer means consumers that do not import it pay
nothing.

- **`@rivinia/i18n/select`.** `RiviniaLanguageSelect` (`rv-language-select`) renders one
  row per configured language showing the native name, managed (`[manager]`) or
  presentational (`[languages]` + `[current]`). `languageSelectOptions()` and
  `LanguageSelectOption` are exported for consumers who want `rv-select` with their own
  trigger. Each row name carries `lang` and `dir`; the closed trigger is `rv-select`'s
  value span and inherits the page language.
- **Optional peer.** `@rivinia/select@^0.7.0` is declared optional and imported only by
  the `/select` FESM; the core and `/ui` FESMs in the tarball are byte-identical to
  0.7.2's, and the tarball grows only by the new entry's FESM, map and types.
- **Managed picks are last-wins.** Resolving an older `setLanguageAsync()` after a newer
  pick emits nothing, including when the newer pick is the language that is currently
  current — it makes no manager call but still supersedes the pending switch. The
  trigger follows the manager, never a superseded intent
  (`projects/i18n/tests/language-select.spec.ts`, fails without the guard).
- **The picker owns a width floor.** The host is `inline-block` with a 14rem minimum:
  `rv-select`'s own `min-width: min(14rem, 100%)` resolves that `100%` to 0 under a
  shrink-to-fit host, so the bare usage rendered `English` as `En / gli / sh`. Found in
  the packed build in a browser; the `i18n-e2e` suite now measures the host, the panel
  and the row line count in Chromium and Firefox, and fails when the floor is removed.
- Proven by 371 tests in 35 files; the `i18n-e2e` Playwright suite green (96 tests
  across Chromium, system Chrome and Firefox, four of them the new `/select` page); two
  clean consumers built from the packed tarball — one without the peer (no select code
  in any chunk) and one with it plus a lazy route (picker in a 45.71 kB / 10.72 kB
  chunk, no `rv-language-select` in the initial bundle); and 30 real-browser checks in
  Chromium and Firefox each over an `ar`/`en`/`de` demo (row `lang`/`dir`, managed pick
  setting `<html lang>` to the locale and `dir`, presentational pick leaving the
  manager on `ar`, zero console, page or network errors). WebKit was not run: the host
  lacks `libavif.so.16`.

### @rivinia/i18n 0.7.2 (published 2026-10-31)

- **Fixed: a view-transition switch kept the previous dictionary.** With
  `viewTransition.enabled`, `applyLanguage()` started the dictionary load
  before the transition callback changed `currentLanguage`. A cached
  dictionary applies synchronously, and `DictionaryStore._apply()` publishes
  only the dictionary whose language is current — so the new dictionary was
  discarded and the UI stayed in the old language. The first switch worked
  when `skipInitialTransition` ran it synchronously; every later switch did
  not. The load and `ensureFallback()` now run inside the transition callback,
  after `_currentLanguageId.set(id)`.
- Proven by two regression tests that hold the transition callback and switch
  twice — one through `setLanguage()`, one through the preload-first
  `setLanguageAsync()` path (`projects/i18n/tests/view-transition-switch.spec.ts`);
  both fail on the pre-fix code. Also the full i18n suite (347 tests), and the
  packed build in the `rv-tailwind` demo with
  `viewTransition` enabled: `ar → en → ar → en → ar → en`, with the heading,
  `<html lang>` and persisted language correct on every step and no console
  errors. No API change.

### @rivinia/select 0.7.0 (published 2026-10-30)

Eleven defects, all found by running the packed tarball in real browsers: the
first seven in a visible Chromium/Firefox/WebKit matrix against the packed
0.6.1 build, the rest in a consumer playground. It also adds a public feature
(`variant`), which makes it a minor under the rule above. 0.6.1 was prepared
and never published; its packaging changes ship here.

- **Packaging: the layered layout.** The package moved to
  `src/lib/{models,services,utils,providers,pipes}` with its specs in `tests/`,
  outside the source it ships, and it now declares `@angular/common` in its
  `peerDependencies` — the UI imports `NgComponentOutlet` /
  `NgTemplateOutlet` at runtime and the peer was undeclared. The public API,
  the entry points and the `exports` map are unchanged. The rest of that
  workspace batch is still prepared for the other five packages.

- **The panel scrolled sideways.** `overflow-y: auto` computes `overflow-x` to
  `auto`, and every row was `width: 100%` with its padding outside that 100%
  in the content box — so even a short list had 5–17px of horizontal overflow
  (measured `scrollWidth` 105–118 against a 101px `clientWidth`). Rows are now
  `border-box`, the panel is `overflow-x: hidden`, and a 60-character unbroken
  label wraps (`overflow-wrap: anywhere`) instead of pushing `scrollWidth` to
  475px.
- **The panel had a width of its own.** It carried a 16rem floor while the
  select's was 14rem, so two surfaces meant to read as one control stood
  apart with no consumer opt-in (measured: a 256px panel over a 224px
  trigger). The floor now lives only on the select (`--rv-select-width`, capped
  by the container), the trigger fills the select, and the panel takes exactly
  the trigger's width in every path — the anchor path already did that with
  `anchor-size(inline)` and the primitive's floor was overriding it. A
  container narrower than the floor shrinks both together and the labels wrap.
  The floor is capped by the container on purpose: 10rem (160px) is the
  smallest width that still fits a row on one line, and below it the select
  shrinks with its cell (measured 55–114px rows between 128px and 96px)
  instead of overflowing. The README now states that minimum.
  The panel is also `border-box` in every engine now — Firefox used to be 14px
  wider than the trigger it was aligned to — and the JS path no longer writes
  `min-width: 0` inline. The trigger is `border-box` for the same reason:
  `width: 100%` plus its 1px borders had made the button 2px wider than the
  select it fills, and the panel followed the button.
- **The width floor never applied off the grid.** The trigger's `min-width` was
  `min(--rv-select-width, 100%)`, but its containing block is a chain of
  shrink-to-fit boxes, so the percentage collapsed and the button sized itself
  to its content: measured 103px where the documentation promised 14rem. Only
  a select inside a grid cell (a definite width) honoured the floor. The floor
  moved to the host, whose containing block is the consumer's layout.
- **`*-end` placements sat off the trigger.** The CSS anchor path anchored to
  `.rv-select-popup-trigger`, the full-width hit area, while the JS path
  measured the `<button>` inside it: 128px apart on a 352px cell with a 224px
  button. Measured `bottom-end` panel at `x=528..752` with the button at
  `x=400..624` in Chromium and WebKit; Firefox, on the JS path, was correct.
  The select now anchors to the trigger button and takes `anchor-name` off the
  wrapper, so both paths measure the same element.
- **RTL panels aligned to the wrong edge in a mixed-direction page.** A
  `dir="rtl"` select inside an LTR document opened its panel left-aligned
  (measured 649..905 against a 649..752 trigger) in Chromium and WebKit, while
  Firefox, on the JS path, aligned the right edges. `position-area` span
  keywords resolve against the containing block, and a top-layer popover's
  containing block is the ICB — the root's direction, not the panel's. The
  component now compares its own computed direction with the root's and swaps
  the inline span keyword; `:dir()` cannot do that job because it follows the
  `dir` attribute rather than the CSS `direction` property (measured in both
  engines). The JS path reads computed direction too, so `<html dir>` no
  longer overrides a differently-directed subtree.
- **README: the ARIA section described a different component.** It promised
  `role="listbox"` / `option` / `aria-selected`, `aria-haspopup="listbox"` and
  `aria-multiselectable`; the shipped DOM is `menu` / `menuitem` /
  `menuitemcheckbox` with `aria-haspopup="menu"` and `aria-checked`. The
  README now documents the measured DOM.
- **`panelReady` fired once per instance, not once per open.** The panel lives
  inside `@if (open)`, so every reopen builds a new element, while the
  once-per-instance flag kept handing consumers the first one. A reopened
  virtual list then scrolled a detached node and nothing moved — found while
  building a 283-row governorate demo on the packed tarball. It now emits
  whenever the element differs from the last one handed over, the README says
  a consumer must rebind, and a repo e2e case (open → close → reopen) fails
  without the fix.

Documentation and tests, no behaviour change: the README's DI recipe bound
nothing — it showed `provideRiviniaSelect('multi')` next to a `<rv-select>`
that never received the controller, so the provided instance was described
but unused. The snippet now binds `[select]="controller"`, and an "Ownership
rules" block states that `mode` selects only the component-owned controller,
that an injected controller is bound explicitly and is one per injector, and
that sharing a controller is for one logical value (shared selection and
query, per-component panels, the last mirrored `options` wins). `mode` is
typed as the exported `RiviniaSelectMode`. Twelve tests pin the DI contract,
the mode precedence, the supported shared-controller configuration, and the
restore half of `setValue` / `setValues`.

- **The search scrolled away with the list.** The panel is the scrollport, so
  a plain first-child input left the viewport as soon as the list moved
  (measured: top 7px → −154px after a 300px scroll). The input now sits in a
  `position: sticky` bar that paints the panel surface. Pinning the input
  itself does not work — it paints transparent by design, so a sticky input
  lets rows slide visibly underneath (measured on the consumer override that
  did exactly that: `position: sticky` applied while the background computed
  to `rgba(0, 0, 0, 0)`). The bar owns the gap below the input and the panel
  declares `scroll-padding-top`, so a keyboard-scrolled row is not hidden
  under the bar. No new API: `--rv-select-search-bg`,
  `--rv-select-search-gap` and `--rv-select-search-offset` tune it.
- **A strip of the list showed above the pinned bar.** The scrollport's own
  top padding sits outside the bar's containing block, and a sticky box is
  clamped to that block, so `top: 0` stopped at the content edge and rows
  stayed visible in the 7px between the panel's border and the bar (measured
  6px padding + 1px border, at every scroll offset). The bar now carries that
  padding and the searchable panel drops it, so the bar's top edge is the
  scrollport's content edge. The input, the rows and `scroll-padding` measure
  exactly where they did before.
- **Reopening landed on the first row, not on the selection.** `(opened)` asks
  the inner controller to activate the current value before the rows have
  rendered, so the call returned `false` and the first row that registered won
  the open — the trigger showed Alexandria while the highlight sat on Cairo.
  The controller now holds a requested id while the menu is open and applies
  it when that row registers; a different row no longer claims the open, and
  any explicit navigation or close drops the request. Rows register after the
  open by design, so a registration must not double as a dependency: reading
  the registry inside the row's own effect made that effect re-run on every
  registration, and the query effect re-aimed at the first row on each of
  them. Both are `untracked()` now.
- **The active row could sit off-screen.** Focus moves with `preventScroll`
  and nothing else scrolled, so a reopen on a deep value opened at
  `scrollTop` 0 with the cursor below the fold, and Home/End/typeahead moved
  the active row without scrolling either. Every change of the active row now
  reveals it with `scrollIntoView({ block: 'nearest' })` — measured on the
  governorate list: reopen on the last one lands at `scrollTop` 131 with the
  row inside the panel, and wrapping past the end scrolls back to the first
  row, which stops exactly at the pinned bar's bottom edge (`scroll-padding`
  doing its job). A virtualised list that does not render the active row has
  nothing to reveal; its consumer owns scrolling, as the README now says.
- **Feature: `variant` on `<rv-select>`, forwarded to the panel it builds.**
  `'simple'` (the default) is byte-for-byte the pre-variant skin, so the
  default look does not change unless you ask for it. `'premium'` adds a 250ms
  entrance on the standard dropdown curve, a layered panel shadow, a 1px
  trigger shadow, a hover/active row wash, a thinner search field, a styled
  scrollbar, and a shimmering skeleton in the loading row. The value is
  reflected as `data-variant` and everything downstream is CSS — no branch in
  the component logic, no runtime cost when unused. Measured cost of shipping
  both skins: **+801 B brotli / +1,292 B gzip** on the UI chunk, 0 B on
  `@rivinia/select` headless.
- **The premium skin does not animate on close, on purpose.** The panel is a
  real top-layer element; holding it open to fade it out would swallow clicks
  aimed at whatever is underneath, hand `panelReady` a node that is about to
  disappear (the virtualiser would measure it), and let the next open latch
  onto the leaving element. Close stays instant.

### @rivinia/i18n 0.5.0

The 0.4.0 code-review set. 0.4.1 was never published, so its patch set ships
here as well; RIV-18 (the internal split) moves to 0.6.0.

- **Fix (0.4.1 scope).** Compact ICU selectors parse (`one{# item}`), an
  in-flight load shares the fetch but not the decision to apply it,
  `onMissingKey` runs outside `t()`'s computed, loader failures carry a typed
  `RiviniaLoadError` with the numeric status, and the devkit schematic peer is
  optional.
- **Performance (RIV-04, RIV-06).** The default `jsonLoader` ships in the main
  bundle (two fewer script requests before the first dictionary);
  `httpLoader`/`remoteLoader` stay lazy. ICU templates compile into a bounded
  AST cache (~13x on the 100k-render benchmark).
- **Feature (RIV-08, RIV-09, RIV-10, RIV-12, RIV-16).** ICU apostrophe
  quoting, `onMissingParam`/`warnOnMissingParam`, ISO-8601 `date` arguments,
  flat dotted dictionary keys, and `rivinia-i18n-keys --parity`.
- **Behavior change (RIV-08, RIV-11).** `''` now renders one apostrophe, and
  `<html lang>` uses the configured `locale` when present.
- **Privacy/API (RIV-13, RIV-15, RIV-17).** Persistence only after an explicit
  switch (`persist: false` opts out); `toggle()` warns above two languages;
  exports are classified Stable/Experimental/Internal and `languageChanged` is
  deprecated.
- **Packaging (RIV-14).** Repository/homepage/bugs/author/engines/publishConfig
  metadata; provenance is not wired because the repo has no CI workflow.
- **Fixed.** A cached switch after a load error left `loadingState` at
  `'error'`.

### @rivinia/i18n 0.4.0 (prepared, unpublished)

The production-hardening release. All API changes are additive; two behaviour
changes are called out at the end. 0.3.4 was never published, so its layout
move ships here and 0.3.4 is skipped on the registry.

- **The default loader works under SSR.** `jsonLoader()` fetched a relative
  `i18n/{lang}.json`, which Node's `fetch` rejects (`Failed to parse URL`), so
  the server rendered raw keys. Loaders now receive a `LoaderContext`
  (`baseUrl`, `isServer`) built from `REQUEST` + `<base href>` on the server
  and `document.baseURI` in the browser; the built-in loaders absolutize only
  when `isServer`. A custom SSR host must provide `REQUEST` (documented).
- **The SSR DOM cannot crash construction.** Domino throws
  `NotYetImplemented` on `baseURI`; the property read is now guarded.
- **`fallbackLanguage`.** Lookup is current → fallback → `defaultValue` → key.
  Fallback text renders with the FALLBACK locale's plural rules, loads in
  parallel and silently (never drives `loadingState`), and is transferred to
  the client.
- **Missing-key reporting.** `onMissingKey(event)`, a `missingKeys` signal, and
  `clearMissingKeys()`. Once per key per session, only after the current
  language has a dictionary, so a slow load produces no false positives.
- **`reload(language?)`.** Stale-while-revalidate with per-language generation
  counters: the visible dictionary stays until the fresh one arrives, and a
  response that was in flight is discarded instead of overwriting it.
- **ICU additions.** `{n, selectordinal, …}`, `offset:` (ICU4J semantics:
  `=N` matches the raw value, the category sees `value - offset`, `#` is
  formatted with `Intl.NumberFormat`), `{n, number}` with `percent` /
  `integer` / `::currency/XXX`, `{d, date}` with `short|medium|long|full`, and
  `Date` in `TranslateParams`.
- **`t(key, params?)` returns a `Signal<string>`.** A function `params` is
  invoked inside the computation, so the signals it reads are tracked. Missing
  keys are recorded in a microtask (a `computed` may not write signals).
- **Typed keys.** `RiviniaI18nKeyRegistry` is augmentable; `translate()`,
  `t()` and `RTranslatePipe` take `RegisteredI18nKey`, which resolves to
  `string` until a generated declaration narrows it. `rivinia-i18n-keys`
  (shipped as a `bin`) generates that file from a dictionary, with `--check`
  for CI.
- **The layout moved** (models/services/utils/providers/pipes, specs in
  `tests/`) — no exported path changed.

Behaviour changes:

1. `#` inside a plural is now formatted with `Intl.NumberFormat(locale)`, so a
   non-Latin numbering system renders its own digits (`ar-EG`: `٣`, was `3`).
   `en` and `ar` are unchanged.
2. An unresolved key logs `[rivinia/i18n] missing key "…"` once per session in
   dev mode. `warnOnMissingKey: false` or `onMissingKey` controls it.

Proven by 153 unit tests, 39 Playwright runs (chromium + system Chrome 156 +
Playwright Firefox 157) against a production CSR build, and 16 SSR checks
against a real `renderApplication` host (Arabic HTML, transfer payload, no
client refetch, hydration, post-hydration language switch).

### @rivinia/env 0.3.4 · @rivinia/http 0.5.4 · @rivinia/modal 0.6.2 · @rivinia/toast 0.5.2 · @rivinia/menu 0.4.0

- **The packages are organised into layers.** Every package used to keep its
  types, its controller, its helpers, its provider and its pipe in one flat
  `src/lib/`. Each package now follows the same layout:

  ```
  src/lib/models/       the types and the contracts — no behaviour
  src/lib/services/     the classes that DO something
  src/lib/utils/        pure functions and pure math
  src/lib/providers/    provide*() and inject*()
  src/lib/pipes/        the pipes
  ui/src/lib/components/<name>/   the .ts, the .html and the .css together
  tests/                the specs, outside the source the package ships
  ```

  The public API is unchanged — the same symbols are exported, from the same
  entry points, and the `exports` map never exposed an internal path.
- **The specs live in `tests/`.** `src/` now holds only what the package
  ships. The test target reaches the specs through `include`, so a suite can
  no longer be excluded by a glob that no longer matches.
- **The UI templates and styles are files.** `@rivinia/modal` and
  `@rivinia/toast` carried their template and their CSS inline; they now use
  `templateUrl` / `styleUrl`, as `@rivinia/select` and `@rivinia/menu` already
  did. The content moved verbatim.
- **The dead references are gone.** The workspace root pointed at two
  `proof-*` projects that no longer exist, which broke the build of every
  package that loaded the root tsconfig.
- `@rivinia/env` gained a test. It ships no runtime code — its public API
  is the `BaseEnvironment` type and everything it does happens in the
  schematic — so the test covers the seam between the two: the environment
  file the SHIPPED schematic scaffolds must satisfy the published type.

`@rivinia/menu` ships as **0.4.0**, a minor: a pointer open no longer
pre-selects a row, which is a deliberate interaction change, so a patch would
understate it. 0.3.6 was prepared and never published; 0.4.0 supersedes it and
is live on npm as of 2026-10-31. It also closes the usage and display defects
found in the 0.3.5 audit:

- **A click opens without choosing.** Pointer open goes through
  `toggle('none')`: no row is active and focus stays on the trigger. Enter,
  Space, ArrowDown and ArrowUp still open on the first/last enabled row, and
  the first arrow key after a click enters the list.
- **One highlight at a time.** The `:hover` wash is gone; hover moves the
  active row through the controller, so a hovered row and a keyboard-active
  row can no longer both look selected.
- **The panel is `border-box` with a 10rem floor and a 22rem cap.** The new
  `--rv-menu-max-width` token (default `22rem`, bounded by the viewport) stops
  a long label from stretching the panel (measured 513px → ≤352px). Labels
  wrap, a long word breaks, and rows are never ellipsized.
- **Generated `[items]` rows are `type="button"`.** Picking a row inside a
  `<form>` no longer submits it.
- **`aria-controls` exists only while the panel does**, and Tab closes the
  menu even when focus never left the trigger. In WebKit the trigger is
  re-seated after a close so Shift+Tab continues (measured: without it the
  key does nothing).
- **The opening animation grows from the trigger corner** in LTR, RTL and when
  the panel flips, via `transform-origin` custom properties and a new
  `data-rtl` panel hook.
- **Icons are documented as supported**: the library sizes any `svg` inside a
  row to 16px and tones it muted; the consumer supplies the stroke/fill.

Proven by 49 menu unit tests (was 41) and 57 Playwright cases per browser —
chromium, firefox and webkit all 57/57 — plus per-hunk mutation checks.

### @rivinia/env 0.3.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

### @rivinia/http 0.5.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaHttp } from
  '@rivinia/http';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/i18n 0.3.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaI18n } from
  '@rivinia/i18n';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/modal 0.6.1 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaModal } from
  '@rivinia/modal';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/toast 0.5.1 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaToast } from
  '@rivinia/toast';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/select 0.6.0 (BREAKING)

The select's private panel is renamed out of the `menu` namespace, and the
right-to-left placement is fixed.

**Why the rename:** the select shipped a private copy of the menu component
using the SAME selector (`rv-menu`) as `@rivinia/menu`. An app depending on
both packages hit

```
NG0912: Component ID generation collision detected. Components
'RiviniaMenuComponent' and 'RiviniaMenuComponent' with selector 'rv-menu'
generated the same component ID.
```

Angular registers one definition per colliding id, so the loser's `styles`
were never injected — the select's panel was silently rendered with the other
package's CSS.

**DOM / CSS changes** (only if you targeted the markup):

- `rv-select-menu` → `rv-select-popup`
- `.rv-select-menu-panel` → `.rv-select-popup-panel`
- `.rv-select-menu-trigger` → `.rv-select-popup-trigger`
- `[rvselectmenuitem]` → `[rvselectpopupitem]`
- `rvSelectMenuItem` / `rvSelectMenuTrigger` / `rvSelectMenuPanel` →
  `rvSelectPopupItem` / `rvSelectPopupTrigger` / `rvSelectPopupPanel`
- `--rv-select-menu-*` → `--rv-select-popup-*`

The `--rv-select-*` tokens are unchanged, and they are still bridged onto the
panel, so setting them on an ancestor of `rv-select` keeps working.

**One input renamed:** `[menuLabel]` → `[popupLabel]`.

Fixed:

- **The panel flew across the viewport in a right-to-left layout.** A
  specificity tie let the placement insets override the top-layer reset, so
  the panel pinned itself to the viewport edge instead of its trigger's
  (measured: trigger at `x=11..232`, panel at `x=708..929` in a 929px
  viewport). The top-layer rule now comes after the placement rules.
- **Reopening a single-mode select started at the first option** instead of
  the one already chosen, so arrowing to a long list meant walking past
  everything again. It now reopens on the current selection.
- **A select could overflow its row.** A `min-width` beats `max-width` in
  CSS, so a large `--rv-select-width` overflowed the cell and landed on the
  next select. The width is now capped by the container.

Added:

- `provideRiviniaSelect(mode)` / `injectRiviniaSelect()`, so the controller
  is in the injector and a test can replace it.
- `optionTemplate` — custom markup for an option row (icons, avatars, badges).
- `listTemplate` — replaces the whole list, for a virtualised one.
- `loading` / `loadingLabel` — a loader row under the list.
- `reachEnd` — emitted when the panel scrolls close to its end.
- A footer slot, `[rv-select-popup-footer]`, for a "Load more" button.
- `--rv-select-popup-animation` — the whole entrance as ONE token, so it
  never fights the cascade.
- Registered options are frozen, so the filtered list and the selection
  cannot disagree.

### @rivinia/menu 0.3.5

**Nothing to do.** No API, token or class name changed.

Fixed: the same right-to-left placement defect the select had — a panel in an
RTL layout drifted to the viewport edge instead of staying with its trigger.
The panel is now placed with CSS anchor positioning, so it follows its
trigger in both directions and takes the trigger's width.

### @rivinia/modal 0.6.0 (BREAKING)

**No forced colour scheme.** The dialog forced a dark palette under
`prefers-color-scheme: dark` and the toast forced a light one. Both
overrode an explicit consumer choice and contradicted the "no forced dark
mode" contract the other packages document. A dialog now follows the
consumer's scheme.

Added:

- `size` per dialog, so one host can show a small confirm over a wide form.
  The presets are `clamp()`, so they scale with the viewport.
- `coversOthers` — a dialog that hides the ones below it, for a flow where
  the detail view replaces the list view.
- `loadingOf` — a loader while a dialog's data is in flight.
- `data-caller` — the name of the component that opened the dialog, so the
  DevTools inspector points at its source.
- The dialog transitions its own box, and the stack change is wrapped in a
  view transition, so a dialog opening over another is a movement rather
  than a flicker.

### @rivinia/toast 0.5.0 (BREAKING)

**The list is in the browser's top layer.** It is a manual popover, so it is
no longer clipped by an `overflow: hidden` ancestor and it floats above a
modal dialog. Measured: the element at the toast's position is the toast, not
the dialog.

**The list must be MANAGED.** `<rv-toast-list>` without a `[manager]` renders
an empty list — no toast ever appears. Pass the manager:

```html
<rv-toast-list [manager]="toast" position="bottom-end" />
```

### @rivinia/theme 0.1.0 (new)

The shared design-token layer. One import, one place to set the whole
component ecosystem's colours:

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
}
```

Every component reads its own token first, then the semantic layer, then its
built-in default — so a consumer can theme one component, or all of them,
from one place. Adapters are included for Tailwind v4 and Bootstrap 5.3, and
an SCSS entry for `@use`.

### @rivinia/http 0.5.2

- Expanded the consumer guide with separate service, component, and template
  examples covering every request method.

### @rivinia/toast 0.4.2

- Clarified the standalone UI and headless examples with separate TypeScript
  and HTML files.

### @rivinia/modal 0.5.3

- Documented both decorator and signal view queries, component content through
  the modal host's `NgComponentOutlet`, scoped modal context injection, and
  rendering toast UI inside a native dialog.

### @rivinia/i18n 0.3.2

- Split the standalone component example into separate TypeScript and HTML
  files.

### @rivinia/env 0.3.2

- Added real `dev`, `stag`, and `prod` build configurations while retaining
  legacy configuration names; avoid sharing nested configuration state between
  generated aliases.
- Corrected the guide to match `ng build --configuration dev|stag|prod`.

### @rivinia/menu 0.3.4

- Replaced the unsupported NgModule example with standalone TypeScript and HTML
  examples and clarified menu template inputs and event-handler naming.

### @rivinia/select 0.4.2

- Expanded the standalone forms and UI examples with separate TypeScript and
  HTML files.

## select 0.4.0 (forms integration, unpublished)

### @rivinia/select

- **New — `FormValueControl<SelectChange>` integration.** `rv-select` now
  implements Angular 22's stable `FormValueControl` interface, so it works with
  Signal Forms (`[formField]`), Reactive Forms (`formControlName`) and
  Template-driven Forms (`ngModel`) — no `ControlValueAccessor`, no
  `NG_VALUE_ACCESSOR` provider, no manual callbacks.
- **New — `value` model signal** (the form-bound value), `disabled` input,
  `touched`/`touch` outputs, `errors`/`invalid` inputs (reflected as
  `aria-invalid` on the trigger).
- **Backward compatible:** `selectionChange` output is preserved for user-driven
  picks and `clear()`. External form writes do NOT emit `selectionChange`.
- **No feedback loops:** the sync effect only writes to the controller when the
  form value actually differs; user picks update both controller and `value`
  signal without re-triggering the effect.
- **New peer dependency:** `@angular/forms: ^22.0.0` (Signal Forms stable
  since 22.0). Does not narrow the existing `@angular/core` range.
- **Tests:** 15 new integration tests covering Reactive Forms, Template-driven
  Forms, Signal Forms, multi-select, disabled sync, clear, and backward
  compatibility. 43/45 total passing.

## select 0.3.1 (hint field + typeahead unification, unpublished)

### @rivinia/select

- **New — `hint?: string` on `RiviniaSelectOption`.** Rendered right-aligned in
  muted monospace (e.g. a keyboard shortcut). Typeahead matches on `label`
  only, never on the hint.
- **Typeahead unification:** Select already matched on `label`; Menu now matches
  on `label` (with `textContent` fallback) via the new `label` input on
  `rvMenuItem`. Both libraries now use the same rule: typeahead matches the
  accessible label, not hint/icon text.
- **Documented:** input naming difference (`select` vs `menu` controller inputs)
  is intentional, not a rename.

## select 0.3.0 (independence from @rivinia/menu, unpublished)

### Breaking / behaviour changes

- **`@rivinia/select` no longer depends on `@rivinia/menu`.** The UI entry
  point previously imported `RiviniaMenu`, `RiviniaMenuComponent` and
  `RiviniaMenuItem` from `@rivinia/menu`. These are now vendored into Select's
  own package (same source, compiled into Select's FESM). Consumers no longer
  need to install `@rivinia/menu` to use `rv-select`. The headless
  `RiviniaSelect` controller never depended on Menu.
- **`@rivinia/menu` removed from `peerDependencies`.** Only `@angular/core`
  remains.
- **Version bump to 0.3.0** (breaking architecture change).

### Added

- Vendored menu primitives: `RiviniaMenu` controller, `RiviniaMenuItem`
  directive, `RiviniaMenuComponent`, `computeMenuPosition`, and the placement
  types — all compiled into `@rivinia/select/ui`'s own FESM. No runtime
  import of `@rivinia/menu` remains (verified by FESM grep).

### Verified

- Build succeeds **without** `@rivinia/menu` installed or built.
- FESM imports: only `@angular/core` (core) and `@angular/core` + `@rivinia/select`
  (ui). Zero `@rivinia/menu` references.
- Unit tests: 28/28 passing. Menu regression: 32/32 passing.
- Consumer install + strict TS compile without `@rivinia/menu`: exit 0.
- Playwright: 6/6 select specs in Chromium and Firefox.

### Known limitations (unchanged)

WebKit, Tailwind, real screen readers, forced-colors remain unverified.
CVA and combobox deferred.

## select 0.3.0 (independence from @rivinia/menu, unpublished)

### Breaking / behaviour changes

- **`@rivinia/select` no longer depends on `@rivinia/menu`.** The UI entry
  point previously imported `RiviniaMenu`, `RiviniaMenuComponent` and
  `RiviniaMenuItem` from `@rivinia/menu`. These are now vendored into Select's
  own package (same source, compiled into Select's FESM). Consumers no longer
  need to install `@rivinia/menu` to use `rv-select`. The headless
  `RiviniaSelect` controller never depended on Menu.
- **`@rivinia/menu` removed from `peerDependencies`.** Only `@angular/core`
  remains.

### Added

- Vendored menu primitives: `RiviniaMenu` controller, `RiviniaMenuItem`
  directive, `RiviniaMenuComponent`, `computeMenuPosition`, and the placement
  types — all compiled into `@rivinia/select/ui`'s own FESM. No runtime
  import of `@rivinia/menu` remains (verified by FESM grep).

### Verified

- Build succeeds **without** `@rivinia/menu` installed or built.
- FESM imports: only `@angular/core` (core) and `@angular/core` + `@rivinia/select`
  (ui). Zero `@rivinia/menu` references in FESM and `.d.ts`.
- Unit tests: 28/28 passing. Menu regression: 32/32 passing.
- Consumer install + strict TS compile without `@rivinia/menu`: exit 0.
- Playwright: 6/6 select specs in Chromium and Firefox.

### Known limitations (unchanged)

WebKit, Tailwind, real screen readers, forced-colors remain unverified.
CVA and combobox deferred.

## select 0.2.0 (independent audit & hardening, unpublished)

### Breaking / behaviour changes

- **Theming tokens renamed and isolated.** Select no longer reads
  `--rv-menu-*`. It now consumes its own `--rv-select-*` namespace
  (`--rv-select-bg`, `-fg`, `-border`, `-muted`, `-radius`, `-shadow`,
  `-width`). Existing selectors that themed Select through `--rv-menu-*`
  must move to `--rv-select-*` — see README -> Migration.
- **Forced dark mode removed.** The `@media (prefers-color-scheme: dark)`
  block that overrode consumer values on the trigger is gone. Tokens are now
  `var(--rv-select-*, fallback)` values, so an ancestor theme always wins.
- **Select no longer changes Menu appearance.** Tokens are bridged onto the
  panel element only, scoped under `.rv-select-panel`, so a `--rv-select-*`
  value never reaches a neighbouring `rv-menu` and vice versa.

### Added

- **Accessible-name inputs on `rv-select`:** `label` (visible caption + the
  trigger's `aria-labelledby`), `ariaLabel` (explicit fallback name),
  `menuLabel` (the opened panel's `aria-label`, falling back to the caption),
  `searchLabel` (filter box name, default 'Search options').
- **`clear()` on `rv-select`** — clears the selection and emits
  `selectionChange` with the same payload shape as a pick (`null` single,
  `[]` multi).
- **Honest semantics.** Comments and docs no longer claim a "combobox
  pattern": the component is a filterable menu (`role="menu"` with
  `menuitem` options) because focus physically moves into the option list.
  See README -> Accessibility.

### Fixed

- `toggle()` on a single-mode controller is now a documented no-op that
  returns `false` instead of writing to `values` while `isSelected` reads
  `value` (the two signals could disagree).
- `clear()` at the headless level is documented as silent; the component
  layer is what announces it.
- `--rv-select-width` is the only token Select owned before; it is now
  joined by bg/fg/border/muted/radius/shadow.

### Tests

- 13 (existing) + 15 (new) = **28 passing** unit tests in Chromium/jsdom:
  keyboard (ArrowDown/Up skip disabled, Enter, Escape, Tab into the list,
  typing isolation), accessible names, `clear()`, single-mode `toggle()`
  rejection.
- Playwright: new `e2e/select/select.spec.ts` covering single, multi, search,
  outside click, theme isolation (measured CSS values) and accessible names.
- Menu regression: 32/32 still green.

### Verified

Unit 28/28, menu 32/32, builds 2 entry points, `check:docs` 0 failures,
Prettier clean. NOT published. WebKit, Tailwind, real screen readers and
forced-colors remain unverified.

## select 0.1.1 (install-blocker patch, unpublished)

Packaging only — no source, API, styling or behavior change.

### @rivinia/select

- **Fix — `npm install` failed against any Menu newer than 0.1.x.** The peer
  range was `@rivinia/menu: ^0.1.0`, and in `0.x` semver `^0.1.0` means
  `>=0.1.0 <0.2.0`. With `@rivinia/menu@0.3.1` published, a plain
  `npm install @rivinia/select @rivinia/menu` terminated with `ERESOLVE`:
  `Could not resolve dependency: peer @rivinia/menu@"^0.1.0" from
@rivinia/select@0.1.0`. The range is now
  `"^0.1.0 || ^0.2.0 || ^0.3.0"`.
- **The range is widened, not loosened.** Every Menu version it accepts was
  type-checked against the published Select 0.1.0 types: `0.1.0` and `0.3.1`
  both compile clean. `^0.4.0` is deliberately excluded — no Menu 0.4.x exists
  or has been tested. This is **not** a breaking change for consumers: it only
  accepts versions that already worked.

### Verified

`npm pack` inspected (8 files, no specs). Clean consumer installs without
`--legacy-peer-deps` for Select 0.1.1 + Menu 0.1.0, Select 0.1.1 + Menu 0.3.1,
and the documented `npm install @rivinia/select @rivinia/menu`. `tsc --noEmit
--strict` against the packed artifact + registry Menu. NOT published.

## env 0.3.0 (breaking: short environment names, unpublished)

### @rivinia/env

- **Breaking — environment names shortened.** `development`/`staging`/`production`
  are no longer accepted; use `dev`/`stage`/`prod` (aliases `stag`/`stage` still
  work). Migration: replace `--environments=development,staging,production` with
  `--environments=dev,stage,prod`. The Angular CLI configuration names
  (`development`, `staging`, `production`) are unchanged — only the schematic's
  option values changed.
- **Files unchanged:** `environment.staging.ts` / `environment.prod.ts` filenames
  are kept for compatibility with existing projects.
- **Tests:** updated to use short names; all pass.

## env 0.3.0 (breaking: short environment names, unpublished)

### @rivinia/env

- **Breaking — environment names shortened.** `development`/`staging`/`production`
  are no longer accepted as schematic option values; use `dev`/`stage`/`prod`
  (aliases `stag`/`stage` still work). Migration: replace
  `--environments=development,staging,production` with `--environments=dev,stage,prod`.
  The Angular CLI configuration names (`development`, `staging`, `production`)
  are unchanged — only the schematic's option values changed.
- **Files unchanged:** `environment.staging.ts` / `environment.prod.ts` filenames
  are kept for compatibility with existing projects.
- **Tests:** 14 passing (updated to use short names).

## menu 0.3.2 (typeahead label support, unpublished)

### @rivinia/menu

- **New — `label` input on `rvMenuItem`.** When set, typeahead matches on this
  instead of the row's `textContent`. Defaults to `null` → falls back to
  `textContent`. Fixes the inconsistency where typeahead matched hints/icons
  text. Additive, non-breaking.
- **Typeahead** now reads `data-rv-label` (set from the `label` input) with
  `textContent` fallback.

## menu 0.3.1 (published as a single release; 0.2.0/0.3.0 were never on npm)

Only `0.1.0` was ever published. Everything below ships together as `0.3.1`.

### Breaking / behaviour changes

- **`label` → `menuLabel` on `rv-menu`.** The input names the _menu_ (it maps to
  the panel's `aria-label`), while `RiviniaMenuItemData.label` names a _row_;
  the old name was an ambiguity trap. Migrate: `label="…"` / `[label]="…"` →
  `menuLabel="…"` / `[menuLabel]="…"`.
- **Forced dark mode removed.** The library shipped `prefers-color-scheme: dark`
  defaults, which also over-rode consumer tokens in dark mode. Design tokens are
  now `var(--token, fallback)` values, so your theme always wins. Opt in yourself
  (README → Styling).
- **Tab / Shift+Tab step focus explicitly.** Focus now moves to the tab stop
  before/after the _trigger_. Previously the browser re-entered the still-mounted
  panel and focus was then lost to `<body>` (reproduced on Chromium and Firefox).

### Added

- **Declarative `[items]`.** `<rv-menu [items]="rows" (picked)="…">` renders,
  registers and manages the rows itself — no controller, no `register()`, no item
  markup. Rows use the **same** `rvMenuItem` directive as the composable path, so
  keyboard, focus and click handling are not implemented twice. Combining
  `[items]` with projected `rvMenuItem` throws by design.
- **`panelClass` / `itemClass`** to style the generated panel and rows.
- **camelCase projection attributes** (`rvMenuTrigger`, `rvMenuPanel`) alongside
  the dashed ones.
- **`RiviniaMenuItemData`** (from both entry points) and **`MenuPick`**
  (from `@rivinia/menu/ui`) types.

### Fixed

- **Items registering after the panel opened could not be activated.** With
  `[items]` rows render only once `open()` is true, so `openMenu()` ran against an
  empty registry: no highlight and ArrowDown could not move (`activeId` stayed
  `null`). The first enabled row registered after an open now claims the initial
  activation.
- **`[disabled]` changes at runtime never reached the registry** (registration
  ran once in `ngOnInit`); renames are now de-registered.
- **A static `disabled` attribute on a native `<button rvMenuItem>`** landed on
  the DOM property instead of the directive input, so the row reported
  `aria-disabled="false"`.
- **Consumer CSS variables set on an ancestor were ignored** because the panel
  declared the defaults on itself. Tokens are now fallbacks (README →
  ViewEncapsulation).

### Verified

32 unit tests, 49 Playwright scenarios on Chromium and 49 on Firefox (all green),
`npm pack` inspected (6 files, no specs), and the packed `0.3.1` tarball
installed into a clean consumer app where both README examples compile verbatim
and were exercised in a real browser. **Tailwind, WebKit and real screen-reader
testing remain unverified.** NOT published.

## menu 0.2.0 (accessibility audit, unpublished)

### @rivinia/menu

- **P0 — disabled items could be activated with Enter.** An item that became
  disabled _after_ receiving focus stayed `activeId`, and `pickFocused()`
  trusted it. Enter then emitted `picked` for a disabled row (measured: an
  all-disabled menu emitted `picked=one`). `pickFocused()` now re-validates
  against the live registry. Regression test verified by negative control.
- **P0 — opening could strand focus on `<body>`.** The deferred-focus flag was
  cleared before confirming the panel existed, so a pass that raced panel
  insertion silently dropped focus forever. The flag now survives until the
  panel is present, and measurement state is reset on every open so a second
  render pass is guaranteed.
- **P0 — outside pointer-down stole focus.** Closing on an outside click pulled
  focus back to the trigger, fighting the browser and hijacking focus from what
  the user actually clicked. Outside clicks now close without restoring focus;
  Escape and Tab-close still do.
- **P1 — the typeahead buffer survived a close**, so the next open started
  mid-word. It is now per-open (reset in `doClose`).
- **New:** `label` input (panel `aria-label`), stable per-instance panel `id`
  with `aria-controls` on the trigger, `checked` items (`menuitemcheckbox` +
  `aria-checked`), pure `computeMenuPosition` + rect types exported.
- **Tests:** 23 unit tests, 33 Playwright scenarios (Chromium) against a real
  Angular production fixture, axe-core clean. README rewritten against the
  verified API.

## modal 0.5.1 (packaging fix, published 2026-10-16)

### @rivinia/modal

- **Packaging fix:** `@rivinia/modal/ui` imports `NgComponentOutlet` /
  `NgTemplateOutlet` from `@angular/common` at runtime, but `@angular/common`
  was missing from `peerDependencies` (release-gate failure found by FESM
  grep). Declared `"@angular/common": "^22.0.0"`. No API change.

## menu 0.1.0 / select 0.1.0 (new packages, published 2026-10-16)

### @rivinia/menu

- **New package (0.1.0):** headless per-instance menu controller
  (`open/activeId/items` signals, item registry, keyboard navigation model
  skipping disabled items with wrap) + secondary `@rivinia/menu/ui`
  (`rv-menu`, `rvMenuItem`, placements, roving focus, outside-click,
  focus return). Zero new runtime dependencies.

### @rivinia/select

- **New package (0.1.0):** headless select controller (`options/query/filtered`
  signals, accent-insensitive search, single `value` / multi `values`,
  `syncOptions` for input mirroring) + secondary `@rivinia/select/ui`
  (`rv-select` on top of `rv-menu`: searchable filter box, single-pick-close,
  multi-toggle-stays-open with checks, empty state, chevron). Peer-depends on
  `@rivinia/menu`. Rich per-option custom content stays with raw `rv-menu`.

## 2026-10-16 — toast 0.4.0

### @rivinia/toast

- **T-06 (feature):** new secondary entry `@rivinia/toast/ui` — ready-made
  `RiviniaToastList` (managed `[manager]` + presentational `[toasts]`, six
  logical positions defaulting to `bottom-end`, kind rail vs `richColors`,
  `role="status"`, hover/focus pause, 150 ms exit snapshots). Zero new
  runtime dependencies. Headless entry unchanged and UI-free.

## 2026-10-16 — modal 0.5.0

### @rivinia/modal

- **M-09 (feature):** new secondary entry `@rivinia/modal/ui` — ready-made
  `RiviniaModalDialog` (native `<dialog>`, header/content/footer slots,
  sizes, positions incl. side panels, directional animations, CSS-var
  theming) + `RiviniaModalHost` adapter + ref-counted scroll lock. Zero new
  runtime dependencies. Headless entry unchanged and UI-free.
- **M-10 (feature):** dialog `description` input (`aria-describedby`),
  top-aligned header, focus-to-title rule, responsive bottom-sheet mapping.

## 2026-10-15 — http 0.5.0

### @rivinia/http

- **H-05 (breaking):** global `unwrap`/`unwrapKey` configuration removed from
  `provideRiviniaHttp()`. Unwrapping is strictly per request:
  `{ unwrap: true, unwrapKey }` with a mandatory key (no default).
  A missing key now throws `RiviniaHttpUnwrapError` instead of silently
  passing the body through. Migrate each applicable call (see the README
  migration note); `ng add` no longer asks about unwrapping.
- **H-06 (feature):** `RiviniaHttpUnwrapError` (`key` + `endpoint` + raw
  `body`; body never interpolated into the message) shared by plain methods
  and `getResource` (surfaces as `resource.error()`).
- **H-07 (breaking):** `getBlob`/`getText`/`getResponse`/`postResponse` take
  `RiviniaRawOptions` — unwrap fields are rejected at compile time instead
  of silently ignored.

## 2026-10-15 — toast 0.3.1

### @rivinia/toast

- **T-05 (fix):** generation tracking no longer leaks across show/dismiss
  cycles (`_generations` entry deleted on dismiss, cleared in `dismissAll`).
- Description wording no longer claims a nonexistent "UI outlet".

## 2026-10-15 — modal 0.4.0

### @rivinia/modal

- **M-07 (feature):** additive readonly `closing` (status `closing`) and
  `visible` (active + closing) signals in strategy display order.
  `active`/`queued`/`top` semantics unchanged.
- **M-08 (fix):** public snapshots (`active`, `queued`, `closing`, `visible`,
  `top`, `findByRef`) no longer expose `guards`, `closingTimer`,
  `ownerCleanup`, `generation`, `openedSeq`; state updates consistently
  immutable.

## 2026-10-15 — i18n 0.3.0

### @rivinia/i18n

- **I-08 (breaking):** default loader path `assets/i18n` → `i18n` (files in
  `public/i18n/`, served from the site root; matches the app template's
  `{ "glob": "**/*", "input": "public" }`). Migration: move
  `src/assets/i18n/*.json` → `public/i18n/*.json`, or pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`. `ng-add` starter, schema descriptions,
  README and JSDoc synced.
- **I-09 (fix):** language cookie gets `Secure` automatically on `https:`
  (never on `localhost`); server never writes cookies (unchanged).
- **Cleanup:** removed dead `_supported` getter and redundant
  `standalone: true` on `RTranslatePipe` (Angular 20+ default).

## 2026-10-13 — env 0.2.0

### @rivinia/env

- **New package (0.2.0):** `BaseEnvironment` contract + `ng-add` scaffolding
  with environment multi-select, short aliases (`dev`/`stag`/`prod`) and
  per-environment output directories. Typed `environment.model/dev/staging/prod`
  files (version snapshotted from the app's `package.json`) and wiring
  `production`/`staging` file replacements (staging copied from production when
  present). Never overwrites, never removes user config; `development`
  untouched by design.

## 2026-10-13 — http 0.4.0, toast 0.3.0, modal 0.3.0, i18n 0.2.0

### @rivinia/http

- **H-03 (feature):** opt-in backend-envelope validation via an `envelope`
  policy (`successKey`/`errorKey`, default `isSuccess`/`error`). A failed
  envelope throws a typed `RiviniaHttpEnvelopeError` (body + code) instead of
  flowing into `next()` as success; in `getResource` it surfaces as
  `resource.error()`. Off by default; per-call policy replaces global.
  `getResponse`/`postResponse` validate too (raw body kept); binary/text
  paths are exempt (non-JSON by construction).
- **H-02 (feature):** `getResource` accepts signals and reactive functions for
  `params`/`headers`/`context` (evaluated per request, like `httpResource`).
  New `ReactiveInput<T>` type. URL was already reactive; the rest was static.
- **H-04 (feature):** `getResponse`/`postResponse` expose raw status + headers
  (pagination counts, 201 `Location`), plus `getText` for raw text. Raw by
  design — compose `unwrapAs`/`assertEnvelope` yourself when needed.
- **H-01 (breaking fix):** `unwrapAs` unwraps exactly one envelope level.
  Nested payloads (`{ data: { data, page } }`) are returned whole; recursive
  unwrapping silently dropped sibling fields. No `recursive` option — file an
  issue if a double-wrapped backend genuinely needs it.

### @rivinia/toast

- **T-04 (fix):** overflow eviction prefers the oldest timed, actionless toast;
  persistent errors with actions are evicted only when nothing else can go.
- **T-03 (fix):** a kind change re-resolves the per-kind default duration
  unless the toast carries an explicit duration (explicit is sticky forever).
- **T-01 (breaking fix):** `pause()`/`resume()` track suspension explicitly.
  Persistent toasts can never pause, so hover-leave no longer dismisses them;
  `resume()` on anything unpaused returns `false`. Toasts expose `paused`.
  Updating a paused toast stores the new remaining without re-arming.

### @rivinia/modal

- **M-06 (fix):** concurrent `requestDismiss` calls share one in-flight guard
  run (identical results) instead of double-prompting.
- **M-05 (fix):** registry entries are deleted on settle — queued-cancelled
  and rejected opens leave no residue.
- **M-04 (breaking fix):** opening with an already-destroyed owner settles
  `owner-destroyed` immediately without adding a ghost instance (previously
  threw NG0205 after adding).
- **M-02 (breaking fix):** global `dismiss` config is actually read. Merge
  order: built-in defaults < global < preset < per-call, field-by-field (an
  absent key never clobbers).
- **M-03 (feature):** `openModal` accepts a raw `TemplateRef`, a component
  `Type`, or a full descriptor (overloads preserve `TData`/`TResult`);
  component `inputs` via options. README quick start compiles again.
- **M-01 (breaking fix):** owner teardown promotes the queue like any other
  removal. Same-owner queued requests still settle `owner-destroyed` (via
  their own owner callback); independently-owned ones activate.

### @rivinia/i18n

- **I-07 (feature):** `injectRiviniaI18n<L>()` preserves the language union and
  `defineRiviniaI18n(config)` binds config + accessors with inference, so
  unconfigured ids fail compilation (`@ts-expect-error` covered).
- **I-06 (feature):** `Language.locale` (BCP-47) drives Intl formatting and ICU
  plurals (`ar-EG` digits, not bare-`ar` Latin); formatters cached by
  locale + options.
- **I-05 (breaking fix):** `setLanguageAsync` aborts on load failure —
  language, direction and dictionary stay untouched.
- **I-04 (fix):** browser detection follows priority order (exact then base
  tag per entry) instead of scanning all exact matches first.
- **I-01 (feature):** `provideRiviniaI18n()` loads the initial language during
  setup (SSR waits via `PendingTasks`). New `preload: false` opt-out, inline
  `translations` seed (network refresh still wins; failures preserve the
  seed), and a `ready` signal. Behavior change: upgrading apps now fetch at
  startup where previously nothing loaded.
- **I-02 (breaking fix):** dictionaries reach visible signals only for the
  currently intended language (replaces the request-token guard, which blocked
  legitimate same-language loads). Explicit preloads of other languages stay
  cached without touching the UI.
- **I-03 (feature):** SSR gaps closed — `<html dir/lang>` via injected
  `DOCUMENT` (server-rendered, no first-paint shift), `'cookie'` storage
  strategy (server reads the request cookie, browser writes it), `TransferState`
  hydration (no double fetch). Server-only paths are code-reviewed, not
  server-executed (no platform-server in this workspace).

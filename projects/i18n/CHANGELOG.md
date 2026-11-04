# @rivinia/i18n

From 1.0.0 this package follows **strict semver**: only a major may break, a new
config key, export, token or loader hook is a minor, and a patch never changes
what a page renders. The contract is wider than the export list: **the
`provideRiviniaI18n` config keys**, the pipe name (`rvTranslate`), **the loader
descriptor contract — including the `LoaderContext` a custom loader receives**,
the ICU placeholder rules, the `--rv-i18n-*` token names, and the declaration
shape `rivinia-i18n-keys` generates (`RiviniaI18nKeyRegistry`). Changing any of
those is a major; adding one is a minor. A new token is always additive — the
toggle and the picker read `var(--rv-i18n-<name>, var(--rv-<semantic>, <previous
value>))`.

Coming from 0.8.0: **nothing to do** — 1.0.0 removes no name and renames none.
The removals a consumer already met were in 0.6.0 (`RTranslatePipe` /
`rTranslate`), recorded below, and the freeze that fixed what ships is
[`docs/API-SURFACE-1.0.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/API-SURFACE-1.0.md).
The README is the start-here tier; everyday patterns and the reference live in
[`docs/i18n/`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/docs/i18n),
one topic per page. This file keeps what a consumer of this package needs,
including the migration notes for 0.6.0 and 0.4.0.

## 1.0.0-rc.3

**No config key, export, pipe, token, loader hook or behavior changed** — the code in
this release is the code of `1.0.0-rc.2`. The version exists because a published version
is immutable and `1.0.0-rc.2` shipped a `CHANGELOG.md` whose newest heading was still
`## 1.0.0-rc.1`, and because every repository link in the READMEs now points at an
immutable release tag instead of the moving `main` branch.

- **Documentation links are pinned to this release.** The asset and docs links in
  `README.md` resolve through the `i18n/v1.0.0-rc.3` tag, so the document read from the
  installed package can never be redirected to a `main` that has moved on.
- **Nothing a consumer imports moved**: 35 names at `.`, 5 at `./ui`, 5 at `./select`,
  the `rvTranslate` pipe, the ICU rules and the shape `rivinia-i18n-keys` generates are
  as frozen in the API surface document.
- **The optional `@rivinia/select` peer stays at `^1.0.0-rc.1` on purpose.** That range
  admits every select `1.x` — each rc and the stable release alike — and excludes a 2.0,
  which is what a peer wants. It is deliberately not `^1.0.0` yet: a caret on `1.0.0`
  excludes prereleases, so an app installing this rc alongside `@rivinia/select@next`
  would get an `ERESOLVE` the day the file is changed and not before. The flip belongs
  with the `1.0.0` release, where both sides exist.

## 1.0.0-rc.2

Documentation only, and the first release of this package whose own changelog entry had
to be written after the fact (see above). What it carried was the `Package version` line
in `README.md`; the optional `@rivinia/select` peer stayed at `^1.0.0-rc.1`. No config
key, export, pipe, token, loader hook or behavior changed.

## 1.0.0-rc.1

- **The optional `@rivinia/select` peer is now `^1.0.0-rc.1`** (it was `^0.7.0`, a
  pre-1.0 caret so narrow that a select 0.8 or 1.0 conflicted with it). The range
  admits every select 1.x release, the rc and the final alike, and excludes a 2.0 —
  verified with `semver.satisfies` against the installed semver 7.8.5. Nothing
  changes for an app that never imports `@rivinia/i18n/select`: the peer stays
  `optional` in `peerDependenciesMeta`.
- **The toggle reads the theme's accent.** `--rv-accent` paints the focus ring
  and the held-down fill (16% over the button's own background). Both read
  `var(--rv-accent, currentColor)`, so a page that does not import
  `@rivinia/theme` renders exactly as before (snapshot-proved).
- **Forced colors.** `@media (forced-colors: active)` switches the button to
  `Canvas`/`CanvasText`, `Highlight`/`HighlightText` while held, and
  `GrayText` at full opacity when disabled. While held, the focus ring is
  `CanvasText` — a `Highlight` ring on the `Highlight` fill cannot be seen. The
  toggle has no motion, so `prefers-reduced-motion` has nothing to reduce.

## 0.8.0 - 2026-10-31

The language picker: a third entry point, `@rivinia/i18n/select`, composed from
`@rivinia/select` instead of re-implementing a listbox. Additive — no core or `/ui`
signature changed, and no new dependency for consumers that do not import it.

- **`@rivinia/i18n/select` entry point.** Own FESM and types chunk, exported as
  `exports["./select"]`. `@rivinia/select` (`^0.7.0`) is declared as an **optional**
  peer: the core and `/ui` entry points never import it, so an application that does
  not import `@rivinia/i18n/select` neither installs the peer nor pays for its code.
  The core and `/ui` FESMs in this tarball are byte-identical to 0.7.2's.
- **`RiviniaLanguageSelect` (`rv-language-select`).** One trigger, one option per
  configured language, in declared order, showing the native name. Managed
  (`[manager]`, structurally satisfied by `RiviniaI18n`) or presentational
  (`[languages]` + `[current]`); a manager wins over the presentational inputs. The
  managed path goes through `setLanguageAsync()`, which never rejects, so the trigger
  never keeps a failed pick: after a failure it falls back to the manager's current
  language.
- **A later intent outvotes a switch still in flight.** Managed picks are
  last-wins: resolving an older `setLanguageAsync()` after the user has picked again
  emits nothing. That includes re-picking the language that is _currently_ current —
  no manager call is made for it, but it still supersedes the pending switch, whose
  confirmation must not surface as a change the user never asked for
  (`projects/i18n/tests/language-select.spec.ts`, holds the manager's promise open and
  re-picks the current language; it fails without the guard).
- **Each row name carries `lang` and `dir`.** `العربية` is pronounced as Arabic and
  laid out right-to-left even while the page runs `en`; the language id is an
  accessible hint when the native name differs from it. The closed trigger is
  `rv-select`'s own value span and inherits the page language — the marking starts at
  the panel (documented in the README).
- **`languageSelectOptions(languages)` and `LanguageSelectOption`.** The pure mapper
  the component uses, exported for consumers who want `rv-select` with their own
  trigger or row. It preserves order and resolves each name as `nativeName` →
  `Intl.DisplayNames` → id, the same rule as `/ui`.
- **`RiviniaLanguageManager` and `LanguageLike` are re-exported** from this entry, so
  a consumer importing only `/select` does not need `@rivinia/i18n/ui` on the side.
- **The picker owns a width floor.** The host is `inline-block` with
  `min-inline-size: 14rem`. `rv-select`'s own `min-width: min(14rem, 100%)` cannot
  supply it: inside a shrink-to-fit host that `100%` resolves to `0`, so a bare
  `<rv-language-select [manager]="i18n" />` rendered the trigger, the panel and every
  row one character wide, and `English` wrapped as `En / gli / sh`. Caught in the
  packed build in a browser, not by a build or a test double; the `i18n-e2e` suite now
  measures the host, the panel and the row line count in Chromium and Firefox, and both
  geometry tests fail when the floor is removed.
- Packaging/build: the new entry consumes `@rivinia/select/ui` from dist, so
  `build:select` runs before `build:i18n`. No new byte budget for anyone else: the
  tarball grows by the `/select` FESM, its map and its types, and the pack gate checks
  the built FESM — only `fesm2022/rivinia-i18n-select.mjs` may mention
  `@rivinia/select/ui`.
- Proven end-to-end: 371 tests in 35 files; the repo's `i18n-e2e` Playwright suite
  green (96 tests across Chromium, system Chrome and Firefox, four of them the new
  `/select` page); two clean consumers built from the packed tarball — one without the
  peer (its JS contains no select code at all) and one with the peer and a lazy route
  (the picker lands in a 45.71 kB / 10.72 kB chunk, zero occurrences of
  `rv-language-select` in the initial bundle); and a real-browser run of the packed
  build in Chromium and Firefox, 30 checks each over a three-language `ar`/`en`/`de`
  demo: rows' `lang`/`dir`, managed pick flipping `<html lang>` to the locale
  (`de-DE`) and `dir`, a presentational pick leaving the manager untouched, and no
  console, page or network errors. WebKit was **not run** — the host is missing
  `libavif.so.16`, so MiniBrowser cannot launch.

## 0.7.2 - 2026-10-30

- **Fixed: a view-transition switch kept the previous dictionary.** With
  `viewTransition.enabled`, `applyLanguage()` started the dictionary load
  before the transition callback changed `currentLanguage`. A cached
  dictionary applies synchronously, and `DictionaryStore._apply()` publishes
  only the dictionary whose language is current — so the new dictionary was
  discarded and the UI stayed in the old language. The first switch worked
  when `skipInitialTransition` ran it synchronously; every later switch did
  not. The load and `ensureFallback()` now run inside the transition callback,
  after `_currentLanguageId.set(id)`.
- Two regression tests hold the transition callback and switch twice — one
  through `setLanguage()`, one through the preload-first `setLanguageAsync()`
  path (`projects/i18n/tests/view-transition-switch.spec.ts`); both fail on
  the pre-fix code. The packed build was
  also exercised in the `rv-tailwind` demo with `viewTransition` enabled:
  `ar → en → ar → en → ar → en`, with the heading, `<html lang>` and persisted
  language correct on every step and no console errors. No API change.

## 0.7.1 - 2026-10-29

0.7.0 was never published; this release ships it unchanged and adds one option and one
documentation fix.

- **New `warnOnLoadError` option.** A dictionary that fails to load leaves every key
  unresolved, so the page renders raw key names — until now in complete silence unless the
  consumer configured `onLoadError`. The default now logs a `console.error` **once per
  language per session** in dev mode (`isDevMode() && !onLoadError`), matching
  `warnOnMissingKey`/`warnOnMissingParam`; `false` silences it, `true` keeps it in
  production. A consumer `onLoadError` keeps owning reporting and still fires on every
  failure (the warning is deduped, the handler is not). Additive — no signature changed.
- **Fixed:** the `provideRiviniaI18n` JSDoc example that hoisted `const AR`/`const EN` did
  not type-check — without an annotation the literals widen to `string` and fail the
  `Language` check. The example now uses `as const`, the form the package's own tests use.
  Documentation only.
- **`defaultLanguage` is now optional.** Omitted, it resolves to the first entry of
  `languages`, so the common config only lists the languages. An explicitly provided value
  must be a non-empty id present in `languages`: `''`, whitespace, `null`, a non-string or
  an unknown id now throws at construction with a named message instead of letting
  `undefined` become the current language. Additive — existing configs that pass a valid
  id behave exactly as before.
- **Duplicate or empty language ids now throw.** `languages` is validated once at
  construction: the same id twice (`[AR, EN, AR]`) or an entry without a non-empty `id`
  fails with a `[rivinia/i18n] …` error. Until now a duplicate passed silently and then
  broke `find`, `next()`/`previous()` and every lookup by id, because only the first
  matching entry is reachable.
- **New `init` command: languages are collected once, not typed as objects.**
  `npx rivinia-i18n-keys init` asks for each language (id, native name, direction), asks
  which one is the default, then writes `src/app/i18n/languages.ts` (a
  `defineRiviniaI18n` module that also exports a typed `injectI18n`) and an empty
  `public/i18n/<id>.json` per language. Ids, directions and duplicates are validated
  before anything is written, existing dictionaries are kept, and a hand-written
  `languages.ts` is never replaced without `--force`.
  `--languages ar:العربية:rtl,en:English:ltr` runs the same thing non-interactively.
  Additive: the binary keeps its key-generation and parity flags.
- **A duplicate id in an inline `languages` list is now a compile error too.**
  `provideRiviniaI18n` / `defineRiviniaI18n` gained a conditional type parameter that scans
  the literal tuple and demands a `duplicateLanguageId` property, so the same mistake is
  caught while typing instead of at bootstrap. The scan needs the array literal: an
  explicit `<L>` union or a hoisted list still compiles and is caught by the runtime check.
  Call sites that already compiled are unaffected — the extra parameter is `const` and
  defaulted, so inference is unchanged.
- **The README is organized in three levels.** _Start here_ (install, generate the list,
  first translation), _Everyday use_ (translating, plurals, switching, dictionaries,
  toggle, SSR) and _Reference_ (every option, loader, ICU rule, UI input, export tier and
  migration). The new part teaches ICU pluralization from a wrong `count === 1` check
  through the six Arabic categories and the difference between `=0` and `zero`; no
  previous detail was dropped. Documentation only.

## 0.7.0 - 2026-10-29

The first UI in the package: a two-language toggle from the secondary entry point
`@rivinia/i18n/ui`. Additive — no core signature changed, so nothing is breaking this
time.

- **`@rivinia/i18n/ui` entry point.** Own FESM and types chunk, exported as
  `exports["./ui"]`. No new peer dependencies: the UI imports `@angular/core` at
  runtime and core **types only** (`import type { Direction }`) from `@rivinia/i18n`.
- **`RiviniaLanguageToggle` (`rv-language-toggle`).** One inner `<button>` that
  switches to the other of exactly two languages. The button — not the host and not
  `<html>` — carries the target's `lang` and `dir` (`dir="auto"` when the entry omits
  it), so the accessible name is pronounced and laid out in the destination language.
  Managed (`[manager]`, structurally satisfied by `RiviniaI18n`) or presentational
  (`[languages]` + `[current]` + `[busy]`); a manager wins over the presentational
  inputs.
- **`RiviniaLanguageTrigger` (`rvLanguageTrigger`).** An `<ng-template>` rendered
  inside the button in place of the default name span, receiving
  `{ $implicit, busy }`. Rendered through the view container, so `@angular/common` is
  not a peer and `<ng-content>` is never used.
- **`RiviniaLanguageManager`, `LanguageLike`.** The four-member structural contract
  the toggle drives, and the language entry it renders (`dir` optional).
- **The default icon.** The button leads with a globe drawn in `currentColor`,
  `aria-hidden` and outside the accessible name. It is sized by
  `--rv-i18n-toggle-icon-size` (`1.5em` — 21px at the shipped `0.875rem` type) inside a
  stretched grid box, so the mark and a consumer icon are sized by layout rather than by
  a descendant rule that view encapsulation cannot apply to consumer nodes. The artwork
  is retuned for 21px: the source's latitudes are dropped and its meridian narrowed,
  because they fill in below ~22px at a legible stroke weight.
- **`[icon]`.** A `TemplateRef` that replaces the default globe. Rendered through a view
  container in a view hook — the same path as the trigger template — so the nodes stay
  consumer-owned and `@angular/common` stays out of the peer list.
- **Behaviour.** Three or more languages: `aria-disabled="true"` plus one dev-mode
  warning per instance, never silent cycling through the first two. Busy:
  `aria-busy="true"` only, a `progress` cursor, activation ignored in the handler and
  never queued. `languageChange` fires only after `setLanguageAsync` resolves **and**
  the manager's current language is the target; a failed load emits nothing and leaves
  the UI untouched. `[disabled]` sets the native attribute.
- **Styling.** `--rv-i18n-toggle-*` tokens falling back to the `--rv-*` semantics,
  logical properties and `rem` only, plus `--rv-i18n-toggle-icon-size`; `data-busy`,
  `data-disabled` and `data-languages="2" | "many"` on the host, plus the documented
  class hooks. Hover and active are 8% and 16% of `currentColor` mixed **over** the
  button's own fill — as bare ink the pressed state was invisible (4/255 from hover),
  and as a `background` shorthand the base fill was dropped, which made a dark button
  turn see-through.
- **Experimental tier.** Every export of `@rivinia/i18n/ui` is Experimental in this
  release (decision 2 of `SPEC-0.6-ui.md`, closed 2026-10-29): members may change
  without a deprecation cycle until the entry point is promoted to Stable.
- **Tested.** Unit specs for the component, the manager contract, the trigger
  template, the icon surface, the name lookup and the export surface; Playwright on
  chromium, chrome and firefox (no WebKit, D39) for keyboard activation, focus
  retention, the direction matrix, the painted icon size and the token, and a trigger
  template's foreign-language fragment; SSR smoke for the server HTML and clean
  hydration. WebKit 27.2 was driven by hand for the icon pass, which is what found the
  consumer-icon sizing defect; it is not part of the recorded matrix.
- **Docs.** README section for the entry point, including the WCAG 2.5.3 warning for
  trigger templates and the `switchStrategy` caveat: the toggle always calls
  `setLanguageAsync()`, which preloads first even in an `'instant'` app.

## 0.6.0

The core split (RIV-18) and the pre-release API cleanup. Breaking, as a pre-1.0 minor
may be: the library never had a released compatibility contract, so the transitional
names were removed instead of carried to 1.0.

- **RIV-18 (internal):** `RiviniaI18n` (915 lines, eight responsibilities) is now a
  facade over five plain collaborators: `MessageFormatter` (ICU render + bounded
  `Intl` memo), `MissingKeyReporter` (dedupe, microtask flush, `missingKeys`),
  `LanguageStorage` (local/session/cookie, persist-after-switch, initial language),
  `DocumentDirectionApplier` (`<html dir/lang>`, view transition) and
  `DictionaryStore` (cache, shared in-flight fetch, generations, TransferState,
  loading counter, fallback slot). None is exported; they take constructor
  arguments instead of DI tokens, and each has direct unit tests.
- **`rvTranslate` replaces `rTranslate` (breaking):** `RvTranslatePipe` keeps the
  package prefix (`angular.json` already sets `prefix: "rv"`). `RTranslatePipe` and
  the `rTranslate` selector were removed — no alias, no deprecation window.
- **`languageChanged` removed (breaking):** it was the same signal as
  `currentLanguage`.
- **`loadTranslations(id, { silent })` → `loadTranslations(id)` (breaking):** the
  option was declared but never read; background loads are internal.
- **Unbounded map removed:** the `Intl` number/date memo is now a 40-entry LRU, the
  same ceiling as the `formatIcu` caches; the emitted output is unchanged.
- **`loadedTranslations` is `readonly`:** a public `Signal` was assignable before;
  no consumer can reasonably depend on writing it.
- **Behaviour:** none intended. The characterization test (`fallback-after-init`)
  and the SSR smoke suite were added before the split and pass unchanged after it.

Migration from 0.5.0 — three names, and the core split is internal:

1. **The pipe is `rvTranslate`.** `RTranslatePipe` (`rTranslate`) was removed with
   no alias to keep:

   ```html
   <!-- before -->
   {{ 'booking.seats' | rTranslate: { count: seats } }}
   <!-- after -->
   {{ 'booking.seats' | rvTranslate: { count: seats } }}
   ```

2. **`languageChanged` is gone.** It was the same signal as `currentLanguage`;
   switch your reads to `currentLanguage`.
3. **`loadTranslations(id, { silent })` is now `loadTranslations(id)`.** `silent`
   never did anything — background loads are an internal concern.

## 0.5.0

The 0.4.0 code-review set. 0.4.1 was never published, so its fixes ship here;
RIV-18 (the internal split) moves to 0.6.0.

- **RIV-01 (fix):** compact ICU templates parse. `one{# item}` (no space
  before `{`) was read as the selector `one{# item`, so translation-tool
  output was returned raw. Plural, select, selectordinal and exact `=N` are
  covered, including the Arabic six forms.
- **RIV-02 (fix):** an in-flight load shares the FETCH, not the decision to
  apply it. A background fallback load joined by an explicit language switch
  used to finish silently and never reach the UI; the dictionary is now
  applied against the state at resolution time. `loadingState` follows a
  counter of non-background loads, and `onLoadError` fires once per failed
  fetch.
- **RIV-03 (packaging):** `@angular-devkit/schematics` is an OPTIONAL peer
  (`peerDependenciesMeta`). `ng add` still requires it — the Angular CLI
  provides it — but a plain install no longer warns.
- **RIV-04 (performance):** the default `jsonLoader` and its URL helper ship in
  the main bundle. The app initializer used to fetch two extra chunks before
  the first dictionary; `httpLoader`/`remoteLoader` stay lazy.
- **RIV-05 (fix):** `onMissingKey` runs from the deferred missing-key flush,
  not inside `t()`'s computed. A handler that writes a signal no longer
  throws NG0600; once-per-key dedupe and lookup order are unchanged.
- **RIV-06 (performance):** ICU templates compile once into a cached AST.
  Rendering the same plural 100k times is ~13x faster; output is unchanged.
- **RIV-07 (feature):** loader failures throw `RiviniaLoadError`
  (`url`, `status`, `language`) with the message
  `[rivinia/i18n] Failed to load 'URL' (HTTP STATUS)`. HTTP/2 leaves
  `statusText` empty, so the numeric status is always present.
- **RIV-08 (feature, behavior change):** ICU apostrophe quoting. `''` renders
  one apostrophe (it previously rendered two), and `'{'`…`'}'` quotes literal
  braces.
- **RIV-09 (DX):** missing message arguments are reported via `onMissingParam`
  (once per key/param, from a microtask) with a dev-mode warning controlled by
  `warnOnMissingParam`. Output keeps the placeholder.
- **RIV-10 (feature):** `date` arguments accept strict ISO-8601 strings.
  Invalid strings still render raw.
- **RIV-11 (behavior change):** `<html lang>` now uses the language `locale`
  when configured (`ar` + `ar-EG` → `lang="ar-EG"`); without a locale the id is
  used, as before.
- **RIV-12 (feature):** dictionaries may keep dotted keys flat
  (`{ "app.title": "…" }`). A flat key wins over a nested path on collision, and
  the CLI warns.
- **RIV-13 (DX):** `toggle()` is documented as a two-language flip and warns in
  dev mode when more than two languages are configured.
- **RIV-14 (packaging):** `repository`, `homepage`, `bugs`, `author`,
  `engines` (Angular 22's supported Node range), `publishConfig.access`, and
  this changelog are part of the published tarball.
- **RIV-15 (API):** every export is classified Stable/Experimental/Internal in
  the README; internal helpers carry `@internal`; `languageChanged` is
  deprecated in favour of `currentLanguage`.
- **RIV-16 (feature):** `rivinia-i18n-keys --parity --dir public/i18n --base en`
  reports missing keys, extra keys and placeholder mismatches (including
  arguments nested in plural/select branches), and exits 1 for CI.
- **RIV-17 (privacy):** the language is persisted only after an explicit
  switch, never on first load; writes already reflected in storage are skipped.
  `persist: false` disables persistence.
- **Fix:** switching to a cached language after a failed load left
  `loadingState` at `'error'`; it now returns to `'idle'`.

## 0.4.0

The production-hardening release. Additive API; two behaviour changes.

- **SSR-safe loaders.** `LoaderContext` (`baseUrl`, `isServer`) built from
  `REQUEST` + `<base href>` on the server and `document.baseURI` in the
  browser. The built-in loaders absolutize only on the server, so a custom SSR
  host must provide `REQUEST`.
- **`fallbackLanguage`.** Lookup is current → fallback → `defaultValue` → key.
  Fallback text renders with the fallback locale's plural rules, loads in
  parallel and silently, and is transferred to the client.
- **Missing-key reporting.** `onMissingKey(event)`, a `missingKeys` signal and
  `clearMissingKeys()`, once per key per session and only after the current
  language has a dictionary.
- **`reload(language?)`.** Stale-while-revalidate with per-language
  generations; a response in flight when `reload()` runs is discarded.
- **ICU additions.** `selectordinal`, `offset:`, `{n, number}` with
  `percent`/`integer`/`::currency/XXX`, `{d, date}` with
  `short|medium|long|full`, and `Date` in `TranslateParams`.
- **`t(key, params?)` returns `Signal<string>`.** Function params are tracked.
- **Typed keys.** Augmentable `RiviniaI18nKeyRegistry`; the
  `rivinia-i18n-keys` CLI generates it, with `--check` for CI.

Behaviour changes: `#` inside a plural uses the locale's digits
(`ar-EG`: `٣`), and an unresolved key warns once per session in dev mode.

Migration from 0.3.3 — everything below is additive; no export was removed and no
import path changed. Two behaviour changes are worth reading:

1. **`#` in a plural now uses the locale's digits.** It is formatted with
   `Intl.NumberFormat(locale)` instead of the raw number, so a locale whose default
   numbering system is not Latin (for example `ar-EG`) renders `٣` where it used to
   render `3`. `en` and `ar` are unchanged.
2. **Missing keys warn in dev mode.** A key that resolves to nothing now logs
   `[rivinia/i18n] missing key "…"` once per session when `isDevMode()` is true. Set
   `warnOnMissingKey: false`, or pass `onMissingKey`, to control it.

The default loader is unchanged (`i18n/{language}.json`); `jsonLoader({ path:
'assets/i18n' })` keeps the old layout. The internal source layout moved
(models/services/utils/providers/pipes), but nothing under `src/` was ever exported.

## 0.3.0

- **Breaking:** the default `jsonLoader()` path is `i18n` (files in
  `public/i18n/`), not `assets/i18n`. Pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`.
- The language cookie gets `Secure` automatically on `https:` (never on
  `localhost`); the server never sets cookies.

## 0.2.0

- ICU select/plural, locale-aware number and date formatting, browser language
  detection, RTL direction, and the `rTranslate` pipe.

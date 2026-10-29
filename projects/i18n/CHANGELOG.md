# @rivinia/i18n

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.

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

## 0.3.0

- **Breaking:** the default `jsonLoader()` path is `i18n` (files in
  `public/i18n/`), not `assets/i18n`. Pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`.
- The language cookie gets `Secure` automatically on `https:` (never on
  `localhost`); the server never sets cookies.

## 0.2.0

- ICU select/plural, locale-aware number and date formatting, browser language
  detection, RTL direction, and the `rTranslate` pipe.

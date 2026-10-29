# @rivinia/i18n

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.

## 0.6.0 (unreleased)

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

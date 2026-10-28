# @rivinia/i18n

Pre-1.0 policy: a minor bump may break, a patch is a bug fix.

## 0.4.1 (unreleased)

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
- **RIV-05 (fix):** `onMissingKey` runs from the deferred missing-key flush,
  not inside `t()`'s computed. A handler that writes a signal no longer
  throws NG0600; once-per-key dedupe and lookup order are unchanged.
- **RIV-07 (feature):** loader failures throw `RiviniaLoadError`
  (`url`, `status`, `language`) with the message
  `[rivinia/i18n] Failed to load 'URL' (HTTP STATUS)`. HTTP/2 leaves
  `statusText` empty, so the numeric status is always present.
- **RIV-03 (packaging):** `@angular-devkit/schematics` is an OPTIONAL peer
  (`peerDependenciesMeta`). `ng add` still requires it — the Angular CLI
  provides it — but a plain install no longer warns.
- **RIV-14 (packaging):** `repository`, `homepage`, `bugs`, `author`,
  `engines` (Angular 22's supported Node range), `publishConfig.access`, and
  this changelog are part of the published tarball.

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

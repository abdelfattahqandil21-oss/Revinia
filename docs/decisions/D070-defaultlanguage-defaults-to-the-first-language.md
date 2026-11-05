## 2026-10-29 — D70: `defaultLanguage` defaults to the first language

- **Default.** `defaultLanguage?: T` — omitted, it resolves to `languages[0].id`. A config
  that only lists languages is now complete; the initial language is the first one
  declared, which is also the order the toggle/`next()`/`previous()` already walk.
- **Loud resolution, once.** `resolveDefaultLanguage()` runs as a field initializer above
  `LanguageStorage` and throws a named message for an empty `languages` array, a first
  entry without a non-empty `id`, and an explicit `defaultLanguage` that is `''`,
  whitespace, `null`, a non-string, or an id not in `languages`. The alternative — falling
  back silently — turned a typo into `currentLanguage() === undefined` and a `dir`/locale
  read against the wrong entry, which only surfaces much later. Only `undefined` means
  "use the default"; JS/JSON callers that pass `null` get the error, not a guess.
- **Already defaults, nothing to change.** `storageStrategy` (`'local'`) and `loader`
  (`jsonLoader()` with `i18n/{language}.json`) were defaults before this entry; the README
  now names the loader path explicitly so the "customize the folder" hop is one option
  away.
- **`fallbackLanguage` stays explicit.** Defaulting it to the last language id would make
  array order load-bearing for correctness, not just ordering: a key counts as missing
  only when absent from the current *and* the fallback dictionary, so a silent fallback
  suppresses `missingKeys`/warnings for every language that happens to share keys with the
  last one. That is a behaviour change, not a convenience default — it would need its own
  minor.
- **Versioning.** 0.7.1 — additive; every config that passed a valid id behaves identically.

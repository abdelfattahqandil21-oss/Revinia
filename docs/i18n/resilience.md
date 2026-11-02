# @rivinia/i18n — missing keys, fallback and failures

Back to [the README](../../projects/i18n/README.md) ·
[translating text](translating.md) · [switching the language](switching.md) ·
[the API](api.md)

## Missing keys

A key is missing only when it is absent from the current dictionary, absent from
the fallback dictionary, and no `defaultValue` was supplied. It is reported
**once per key per session**, and only once the current language actually has a
dictionary — so a slow load never produces false positives.

```ts
provideRiviniaI18n({
  defaultLanguage: 'ar',
  languages: [
    { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
    { id: 'en', nativeName: 'English', dir: 'ltr' },
  ],
  fallbackLanguage: 'en',
  onMissingKey: ({ key, language, fallbackLanguage }) =>
    report(key, { language, fallbackLanguage }),
});
```

```html
@if (i18n.missingKeys().length) {
<p role="status">{{ i18n.missingKeys().length }} untranslated keys</p>
}
```

Without `onMissingKey`, a `console.warn` is logged once per key in dev mode. Set
`warnOnMissingKey: false` to silence it, or `true` to keep it in production.
`i18n.clearMissingKeys()` resets the report, which is what a test harness needs
between cases.

## Missing parameters

A message that needs `{name}` but receives no `name` keeps the placeholder — it
is never replaced with `undefined`. Report it the same way as missing keys:

```ts
provideRiviniaI18n({
  // …
  onMissingParam: ({ key, param, language }) => report(param, { key, language }),
});
```

Without `onMissingParam`, dev mode logs one warning per (key, param) pair. Set
`warnOnMissingParam: false` to silence it. The hook is delivered from a
microtask, so it may write signals, and `i18n.clearMissingParams()` resets the
dedupe.

## Fallback language

Lookup order for `translate(key)`:

1. current dictionary — rendered with the **current** locale;
2. fallback dictionary — rendered with the **fallback** locale;
3. `defaultValue` — current locale;
4. the key itself.

Rule 2's locale is deliberate: an English plural template borrowed by an Arabic
UI must use English plural rules (2 categories), not Arabic (6).

The fallback dictionary loads in parallel with the initial language and
**silently** — a fallback failure reaches `onLoadError` but never sets
`loadingState` to `'error'`, because the current dictionary is what the UI needs.
It is transferred with the rest of the state, so hydration does not fetch it
again. With `preload: false`, the fallback works from cache/inline dictionaries
only.

## Load failures

A dictionary that fails to load leaves **every** key unresolved, so the page
renders raw key names. Initialization never rejects: the failure lands on
`loadingState` and `loadingError`, and with the default
`switchStrategy: 'instant'` the language has already flipped — use
`'preload-first'` if you want a failed load to abort the switch instead.

```ts
provideRiviniaI18n({
  defaultLanguage: 'ar',
  languages: [
    { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
    { id: 'en', nativeName: 'English', dir: 'ltr' },
  ],
  onLoadError: (language, error) => report(error, { language }),
});
```

Without `onLoadError`, a `console.error` is logged **once per language per
session** in dev mode, so a retry loop cannot flood the console. Set
`warnOnLoadError: false` to silence it, or `true` to keep it in production. A
failing fallback dictionary is reported the same way but never flips
`loadingState` (see [fallback language](#fallback-language)).

The error handed to `onLoadError` and published on `loadingError` is a
`RiviniaLoadError`, which carries `url`, `status` and `language`. Nothing
rejects: `loadTranslations()` resolves with `{}` and `reload()` resolves `false`,
so the reporting hooks are the only way a failure reaches your code.

## Reloading a dictionary

```ts
await i18n.reload(); // current + fallback; drops every other cached language
await i18n.reload('en'); // one language; applied only if it is the current one
```

`reload()` is stale-while-revalidate: the visible dictionary stays on screen
until the fresh one arrives, so a reload never flashes raw keys. Each language
carries a generation counter, so a response that was in flight when `reload()`
ran is discarded instead of overwriting the new one. It never rejects — failures
land on `loadingState`, `loadingError` and `onLoadError`.

A typical deploy hook:

```ts
window.addEventListener('focus', () => void i18n.reload());
```

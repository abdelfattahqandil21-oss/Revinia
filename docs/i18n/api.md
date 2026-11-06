# @rivinia/i18n — the API

Back to [the README](../../projects/i18n/README.md) ·
[translating text](translating.md) · [switching the language](switching.md) ·
[ICU messages](icu.md) · [dictionaries and SSR](dictionaries.md)

> **Naming note:** the service is `RiviniaI18n`, injected through
> `injectRiviniaI18n()` or the generated `injectI18n`. The rendered DOM belongs
> to the UI entry points: `rv-language-toggle` and `rv-language-select`. The core
> renders nothing.

## What each entry point exports

```ts
import {
  provideRiviniaI18n,
  defineRiviniaI18n,
  injectRiviniaI18n,
  RiviniaI18n,
  RvTranslatePipe,
  jsonLoader,
  httpLoader,
  remoteLoader,
  customLoader,
  formatIcu,
} from '@rivinia/i18n';

import { RiviniaLanguageToggle, RiviniaLanguageTrigger } from '@rivinia/i18n/ui';
import { RiviniaLanguageSelect, languageSelectOptions } from '@rivinia/i18n/select';
```

Importing `RiviniaLanguageToggle` from `@rivinia/i18n` is a compile error, and so is
importing `RiviniaI18n` from `@rivinia/i18n/ui` — the UI entry points re-export only
their own components and the types they need. `@rivinia/select` is reached only
through `@rivinia/i18n/select`; see
[bundle isolation](select.md#optional-peer-and-bundle-isolation).

## Configuration

Every option, its default and what it does. The config is one object passed to
`provideRiviniaI18n()` or `defineRiviniaI18n()`.

### The options that change behaviour

- **`loader`** — where dictionaries come from. The default `jsonLoader()` reads
  `/i18n/{language}.json`. Use a path for an `assets/` layout, `httpLoader` for an
  API, `customLoader` for in-memory data. `httpLoader`/`remoteLoader` are lazy
  chunks; the default stays in the main bundle because it runs before first paint.
  Full details in [dictionaries and SSR](dictionaries.md).
- **`switchStrategy`** — `'instant'` (default) flips the id immediately and the
  dictionary follows; `'preload-first'` waits for the dictionary and keeps the old
  language when loading fails. Choose `'preload-first'` when a flash of raw keys is
  worse than a slower switch.
- **`preload`** — `true` (default) loads the initial language during provider setup,
  and SSR waits for it. `false` for apps that ship inline dictionaries or load by
  hand with `loadTranslations()`.
- **`fallbackLanguage`** — the second dictionary for keys missing from the current
  one. It loads silently and its text is rendered with its own locale.
- **`detectBrowser`** — `true` matches `navigator.languages` on the first visit; a
  stored preference always wins. Off by default, so no surprise language.
- **`persist` / `storageStrategy`** — whether and where an explicit switch is
  remembered. `'cookie'` also works on the server, so the first paint matches the
  user's choice.
- **`translations`** — inline seeds painted before any network load; a loader
  response still wins.

| Option               | Type                                          | Default                          | Meaning                                                                       |
| -------------------- | --------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `languages`          | `readonly Language<T>[]`                      | —                                | Supported languages (`id`, `nativeName`, `dir`, optional `locale`).           |
| `defaultLanguage`    | `T`                                           | first of `languages`             | Initial language on a first visit; must be a non-empty configured id.         |
| `fallbackLanguage`   | `T`                                           | none                             | Second lookup dictionary; must be one of `languages`.                         |
| `loader`             | `LoaderDescriptor<T>`                         | `jsonLoader()`                   | Dictionary source.                                                            |
| `translations`       | `Partial<Record<T, Record<string, unknown>>>` | none                             | Inline seeds, painted before any network load; a loader response still wins.  |
| `preload`            | `boolean`                                     | `true`                           | Load the initial language during provider setup.                              |
| `detectBrowser`      | `boolean`                                     | `false`                          | Match `navigator.languages` on first visit (a stored choice wins).            |
| `storageStrategy`    | `'local' \| 'session' \| 'cookie' \| 'none'`  | `'local'`                        | Persistence; `'cookie'` also works on the server through `REQUEST`.           |
| `storageKey`         | `string`                                      | `'rivinia.i18n.language'`        | Storage key.                                                                  |
| `switchStrategy`     | `'instant' \| 'preload-first'`                | `'instant'`                      | `'preload-first'` waits for the dictionary; a failure keeps the old language. |
| `autoApplyDirection` | `boolean`                                     | `true`                           | Write `<html lang>` and `<html dir>`.                                         |
| `onLoadError`        | `(language, error) => void`                   | none                             | Dictionary load failure. Initialization never rejects because of it.          |
| `warnOnLoadError`    | `boolean`                                     | `isDevMode() && !onLoadError`    | `console.error` once per language when a dictionary fails to load.            |
| `onMissingKey`       | `(event) => void`                             | none                             | Unresolved key; suppresses the default warning.                               |
| `warnOnMissingKey`   | `boolean`                                     | `isDevMode() && !onMissingKey`   | `console.warn` once per key.                                                  |
| `onMissingParam`     | `(event) => void`                             | none                             | Missing message argument; suppresses the default warning.                     |
| `warnOnMissingParam` | `boolean`                                     | `isDevMode() && !onMissingParam` | `console.warn` once per (key, param).                                         |
| `persist`            | `boolean`                                     | `true`                           | Persist the language after an explicit switch. First load writes nothing.     |
| `viewTransition`     | `ViewTransitionConfig`                        | none                             | Document view transition on language change.                                  |

The config is validated once at construction: `languages` must be a non-empty array
with a non-empty, **unique** `id` per entry, and `defaultLanguage` /
`fallbackLanguage` (when provided) must name one of those ids. Anything else throws a
`[rivinia/i18n] …` error at bootstrap instead of degrading into an undefined current
language.

A repeated id written inline (`languages: [AR, EN, AR]`) is also a **compile error**:
`provideRiviniaI18n` and `defineRiviniaI18n` require the property
`duplicateLanguageId`, which only the type checker sees. The check reads the array
literal, so it does not fire when the union is supplied explicitly
(`provideRiviniaI18n<'ar' | 'en'>(…)`) or the list is hoisted into a variable — both
forms still throw the runtime error above.

## Signals

| Signal                  | Type                                     | Meaning                                                 |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `currentLanguage`       | `Signal<L>`                              | Active language id.                                     |
| `currentLanguageObject` | `Signal<Language<L>>`                    | The active language entry.                              |
| `languages`             | `Signal<readonly Language<L>[]>`         | Supported languages.                                    |
| `dir` / `isRtl`         | `Signal<Direction>` / `Signal<boolean>`  | Document direction.                                     |
| `locale`                | `Signal<string>`                         | BCP-47 locale driving `Intl` and plural rules.          |
| `loadingState`          | `Signal<'idle' \| 'loading' \| 'error'>` | Current dictionary status.                              |
| `loadingError`          | `Signal<unknown>`                        | Last load failure.                                      |
| `isLoading`             | `Signal<boolean>`                        | `loadingState() === 'loading'`.                         |
| `ready`                 | `Signal<boolean>`                        | Initial content settled — the one to gate skeletons on. |
| `loadedTranslations`    | `Signal<Record<string, unknown>>`        | The active dictionary.                                  |
| `missingKeys`           | `Signal<readonly string[]>`              | Unresolved keys, insertion order, deduplicated.         |

`loaderContext` (not a signal, but the same platform facts the loaders get) is a
readonly `LoaderContext` built once at construction: `REQUEST` + `<base href>` on the
server, `document.baseURI` in the browser. It is what makes the default loader work
under SSR instead of fetching a relative URL Node cannot parse, and it is public
because a hand-written loader can read it.

## Methods

| Method                                     | Result                     | Notes                                                                                          |
| ------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `translate(key, params?)`                  | `string`                   | Key lookup + ICU rendering.                                                                    |
| `translate(key, defaultValue, params?)`    | `string`                   | A supplied `defaultValue` is not reported as missing.                                          |
| `translate({ en: 'Hi', ar: 'أهلاً' })`     | `string`                   | Inline map: current → fallback → first value → `''`.                                           |
| `t(key, params?)`                          | `Signal<string>`           | Same chain as a `computed`; params may be a function of signals.                               |
| `setLanguage(id)` / `setLanguageAsync(id)` | `void` / `Promise<void>`   | Follows `switchStrategy`.                                                                      |
| `toggle()` / `next()` / `previous()`       | `void`                     | `toggle()` flips the first two languages (dev warning with more); `next()`/`previous()` cycle. |
| `loadTranslations(id)`                     | `Promise<Record<…>>`       | Preload without switching.                                                                     |
| `reload(language?)`                        | `Promise<boolean>`         | Invalidate + refetch; never rejects.                                                           |
| `formatNumber(value, options?)`            | `string`                   | `Intl.NumberFormat` bound to `locale`.                                                         |
| `formatDate(value, options?)`              | `string`                   | `Intl.DateTimeFormat` bound to `locale`.                                                       |
| `getLanguage(id)`                          | `Language<L> \| undefined` | Lookup.                                                                                        |
| `initialize()`                             | `Promise<void>`            | Called by the provider; idempotent.                                                            |
| `clearMissingKeys()`                       | `void`                     | Reset the missing-key report.                                                                  |
| `clearMissingParams()`                     | `void`                     | Reset the missing-parameter dedupe.                                                            |

`RvTranslatePipe` (`rvTranslate`) delegates to `translate()`. It is impure by
necessity — the service reads signals on every call — so prefer `t()` or component
code for long lists.

## Types

| Type                                                     | Shape                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Language<T>`                                            | `{ id: T, nativeName?, dir, locale? }` — the entry everything else reads.     |
| `Direction`                                              | `'ltr' \| 'rtl'`.                                                             |
| `Translation<L>`                                         | a per-language inline map, the argument of the inline `translate()` overload. |
| `TranslateParams`                                        | the params object (or function) a message is rendered with; accepts `Date`.   |
| `StorageStrategy`                                        | `'local' \| 'session' \| 'cookie' \| 'none'`.                                 |
| `SwitchStrategy`                                         | `'instant' \| 'preload-first'`.                                               |
| `RiviniaI18nConfig`                                      | the whole config object above.                                                |
| `TranslationLoader`, `LoaderDescriptor`, `LoaderContext` | the loader contract, in [dictionaries and SSR](dictionaries.md).              |
| `HttpLoaderOptions`, `RemoteLoaderOptions`               | the two network loaders' options.                                             |
| `MissingKeyEvent`, `MissingParamEvent`                   | what the reporting hooks receive.                                             |
| `RiviniaLoadError`                                       | the error handed to `onLoadError`: `url`, `status`, `language`.               |
| `RegisteredI18nKey`, `RiviniaI18nKeyRegistry`            | the typed-key seam, in [the CLI](cli.md#typed-keys).                          |
| `ViewTransitionConfig`, `ViewTransitionInfo`             | Experimental; see [switching](switching.md#view-transitions).                 |

## API stability

Every export is classified so the 1.0 freeze is predictable. **Internal** symbols
exist only so the package's own tests can import them; they may move to an
`@rivinia/i18n/internal` entry point (or disappear) before 1.0. The freeze
([`docs/releases/1.0/API-SURFACE.md`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/releases/1.0/API-SURFACE.md))
kept the four that are published — `parseCookie`, `serializeCookie`,
`browserLanguages`, `detectBrowserLanguage` — on their current paths and says out
loud that a patch release may still change them.

| Export                                                                                         | Kind                | Tier         |
| ---------------------------------------------------------------------------------------------- | ------------------- | ------------ |
| `RiviniaI18n`                                                                                  | service             | Stable       |
| `provideRiviniaI18n`, `defineRiviniaI18n`, `injectRiviniaI18n`                                 | providers           | Stable       |
| `RvTranslatePipe` (`rvTranslate`)                                                              | pipe                | Stable       |
| `RiviniaI18nConfig`                                                                            | type                | Stable       |
| `Language`, `Direction`, `Translation`, `TranslateParams`, `StorageStrategy`, `SwitchStrategy` | types               | Stable       |
| `RiviniaLoadError`                                                                             | class               | Stable       |
| `MissingKeyEvent`, `MissingParamEvent`                                                         | types               | Stable       |
| `TranslationLoader`, `LoaderDescriptor`, `LoaderContext`                                       | types               | Stable       |
| `jsonLoader`, `httpLoader`, `remoteLoader`, `customLoader`                                     | loader factories    | Stable       |
| `HttpLoaderOptions`, `RemoteLoaderOptions`                                                     | types               | Stable       |
| `formatIcu`, `IcuFormatOptions`                                                                | ICU API             | Stable       |
| `RegisteredI18nKey`, `RiviniaI18nKeyRegistry`                                                  | typed-keys types    | Stable       |
| `ViewTransitionConfig`, `ViewTransitionInfo`                                                   | types               | Experimental |
| `ViewTransitionService`                                                                        | service             | Internal     |
| `parseCookie`, `serializeCookie`                                                               | cookie helpers      | Internal     |
| `browserLanguages`, `detectBrowserLanguage`                                                    | helpers             | Internal     |
| `RiviniaLanguageToggle` (`rv-language-toggle`), `RiviniaLanguageTrigger` (`rvLanguageTrigger`) | `/ui` components    | Experimental |
| `RiviniaLanguageManager`, `LanguageLike`, `RiviniaLanguageTriggerContext`                      | `/ui` types         | Experimental |
| `RiviniaLanguageSelect` (`rv-language-select`)                                                 | `/select` component | Experimental |
| `languageSelectOptions`                                                                        | `/select` helper    | Experimental |
| `LanguageSelectOption`                                                                         | `/select` type      | Experimental |
| `LanguageLike`, `RiviniaLanguageManager` (re-exported)                                         | `/select` types     | Experimental |

Every symbol above is exported from the entry point named in its row, and
`projects/i18n/tests` imports the same public paths a consumer uses.

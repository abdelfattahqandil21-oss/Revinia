# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

A headless Angular language manager built on signals. Key-based JSON
dictionaries, inline translations, RTL/LTR document attributes, lazy loaders,
ICU plural/select messages, browser-language detection, and `Intl` number/date
formatting — with SSR that actually works and no runtime dependency beyond
Angular.

- Package version: **0.4.0**
- Peer dependency: **`@angular/core` `^22.0.0`** (plus `@angular-devkit/schematics` for `ng add`)
- Entry point: **`@rivinia/i18n`** (single public entry point)
- `sideEffects: false`; no runtime import beyond `@angular/core`; loaders are lazy chunks
- No `HttpClient` peer — the built-in loaders use `fetch`

## Quick features

- **Signal-first state.** `currentLanguage`, `dir`, `loadingState`, `missingKeys` and
  `locale` are readonly signals; changes only via methods.
- **Zero-config dictionaries.** `jsonLoader()` reads `i18n/{language}.json` — the
  `public/i18n/` layout Angular serves at the site root.
- **SSR-correct URLs.** On the server the loader builds an absolute URL from
  `REQUEST` + `<base href>`; the browser uses `document.baseURI`.
- **TransferState hydration.** Dictionaries rendered on the server are not fetched again
  by the client (measured in the e2e app).
- **Fallback language.** Current dictionary → fallback dictionary → `defaultValue` → key.
  Fallback text keeps the fallback locale's plural rules.
- **Missing-key reporting.** `onMissingKey`, a `missingKeys` signal, and a dev-mode
  warning — once per key per session, never a false positive during loading.
- **`reload()`.** Stale-while-revalidate: the visible dictionary stays on screen until
  the fresh one arrives.
- **ICU subset with the six Arabic plural forms.** `plural`, `selectordinal`, `offset:`,
  `select`, `number`/`date` styles, nesting, and `#`.
- **`t()` returns a `Signal<string>`**, so a field re-renders on a language switch or on a
  signal read by its params function.
- **Typed keys.** A generated `.d.ts` turns a typo into a compile error; without it every
  string key stays legal.
- **Persistence + detection.** local/session/cookie storage, `navigator.languages` match,
  `<html lang>` and `<html dir>` kept in sync.

## Install

```bash
npm install @rivinia/i18n
pnpm add @rivinia/i18n
yarn add @rivinia/i18n
bun add @rivinia/i18n
```

With the CLI schematic (wires a starter provider into `app.config.ts`):

```bash
ng add @rivinia/i18n
```

`ng add` asks for the language ids (comma-separated; the first is the default) and
whether to detect the browser language. It only inserts an import and a
`provideRiviniaI18n({…})` call, is idempotent, and skips with a warning — never an
error — when it does not recognize the workspace.

## Imports

```ts
import {
  provideRiviniaI18n,
  defineRiviniaI18n,
  injectRiviniaI18n,
  RiviniaI18n,
  RTranslatePipe,
  jsonLoader,
  httpLoader,
  remoteLoader,
  customLoader,
  formatIcu,
} from '@rivinia/i18n';
```

## API stability

Every export is classified so the 1.0 freeze is predictable. **Internal** symbols
exist only so the package's own tests can import them; they may move to an
`@rivinia/i18n/internal` entry point (or disappear) before 1.0.

| Export                                                                                | Kind             | Tier         |
| ------------------------------------------------------------------------------------- | ---------------- | ------------ |
| `RiviniaI18n`                                                                         | service          | Stable       |
| `provideRiviniaI18n`, `defineRiviniaI18n`, `injectRiviniaI18n`                        | providers        | Stable       |
| `RTranslatePipe`                                                                      | pipe             | Stable       |
| `RiviniaI18nConfig`                                                                   | type             | Stable       |
| `Language`, `Direction`, `Translation`, `TranslateParams`, `StorageStrategy`, `SwitchStrategy` | types    | Stable       |
| `RiviniaLoadError`                                                                    | class            | Stable       |
| `MissingKeyEvent`, `MissingParamEvent`                                                | types            | Stable       |
| `TranslationLoader`, `LoaderDescriptor`, `LoaderContext`                              | types            | Stable       |
| `jsonLoader`, `httpLoader`, `remoteLoader`, `customLoader`                            | loader factories | Stable       |
| `HttpLoaderOptions`, `RemoteLoaderOptions`                                            | types            | Stable       |
| `formatIcu`, `IcuFormatOptions`                                                       | ICU API          | Stable       |
| `RegisteredI18nKey`, `RiviniaI18nKeyRegistry`                                         | typed-keys types | Stable       |
| `ViewTransitionConfig`, `ViewTransitionInfo`                                          | types            | Experimental |
| `ViewTransitionService`                                                               | service          | Internal     |
| `parseCookie`, `serializeCookie`                                                      | cookie helpers   | Internal     |
| `browserLanguages`, `detectBrowserLanguage`                                           | helpers          | Internal     |

`languageChanged` is deprecated: `currentLanguage` is the same signal.

## Quick start

```ts
// src/app/i18n.config.ts
import { defineRiviniaI18n } from '@rivinia/i18n';

export const i18n = defineRiviniaI18n({
  defaultLanguage: 'ar',
  languages: [
    { id: 'ar', nativeName: 'العربية', dir: 'rtl', locale: 'ar-EG' },
    { id: 'en', nativeName: 'English', dir: 'ltr', locale: 'en-GB' },
  ],
  fallbackLanguage: 'en',
});
```

```ts
// src/app/app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { i18n } from './i18n.config';

export const appConfig: ApplicationConfig = {
  providers: [i18n.provide()],
};
```

```ts
// src/app/header.ts
import { Component } from '@angular/core';
import { RTranslatePipe } from '@rivinia/i18n';
import { i18n } from './i18n.config';

@Component({
  selector: 'app-header',
  imports: [RTranslatePipe],
  template: `
    <h1>{{ title() }}</h1>
    <p>{{ 'booking.seats' | rTranslate: { count: seats } }}</p>
    <button type="button" (click)="use('en')">English</button>
  `,
})
export class Header {
  private readonly service = i18n.inject();
  readonly title = this.service.t('app.title');
  readonly seats = 3;

  use(id: 'ar' | 'en'): void {
    this.service.setLanguage(id);
  }
}
```

`defineRiviniaI18n()` keeps the `'ar' | 'en'` union through `provide()` and `inject()`.
`provideRiviniaI18n(config)` + `injectRiviniaI18n<'ar' | 'en'>()` do the same without the
wrapper.

`provideRiviniaI18n()` registers an app initializer that loads the initial language
before first paint (SSR waits through `PendingTasks`). `ready()` becomes true when the
first content is available or initial loading has settled.

## Configuration

| Option               | Type                                        | Default                            | Meaning                                                                     |
| -------------------- | ------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `languages`          | `readonly Language<T>[]`                    | —                                  | Supported languages (`id`, `nativeName`, `dir`, optional `locale`).          |
| `defaultLanguage`    | `T`                                         | —                                  | Must be one of `languages`; validated at construction.                       |
| `fallbackLanguage`   | `T`                                         | none                               | Second lookup dictionary; must be one of `languages`.                        |
| `loader`             | `LoaderDescriptor<T>`                       | `jsonLoader()`                     | Dictionary source.                                                           |
| `translations`       | `Partial<Record<T, Record<string, unknown>>>` | none                              | Inline seeds, painted before any network load; a loader response still wins. |
| `preload`            | `boolean`                                   | `true`                             | Load the initial language during provider setup.                             |
| `detectBrowser`      | `boolean`                                   | `false`                            | Match `navigator.languages` on first visit (a stored choice wins).           |
| `storageStrategy`    | `'local' \| 'session' \| 'cookie' \| 'none'` | `'local'`                          | Persistence; `'cookie'` also works on the server through `REQUEST`.          |
| `storageKey`         | `string`                                    | `'rivinia.i18n.language'`          | Storage key.                                                                 |
| `switchStrategy`     | `'instant' \| 'preload-first'`              | `'instant'`                        | `'preload-first'` waits for the dictionary; a failure keeps the old language. |
| `autoApplyDirection` | `boolean`                                   | `true`                             | Write `<html lang>` and `<html dir>`.                                        |
| `onLoadError`        | `(language, error) => void`                 | none                               | Dictionary load failure. Initialization never rejects because of it.         |
| `onMissingKey`       | `(event) => void`                           | none                               | Unresolved key; suppresses the default warning.                              |
| `warnOnMissingKey`   | `boolean`                                   | `isDevMode() && !onMissingKey`     | `console.warn` once per key.                                                 |
| `onMissingParam`     | `(event) => void`                           | none                               | Missing message argument; suppresses the default warning.                    |
| `warnOnMissingParam` | `boolean`                                   | `isDevMode() && !onMissingParam`   | `console.warn` once per (key, param).                                        |
| `persist`            | `boolean`                                   | `true`                             | Persist the language after an explicit switch. First load writes nothing.    |
| `viewTransition`     | `ViewTransitionConfig`                      | none                               | Document view transition on language change.                                 |

## Dictionaries

The default loader fetches `i18n/{language}.json`. For a standard Angular app that
means `public/i18n/en.json` served as `/i18n/en.json`. An existing
`assets/i18n/` layout is one option away:

```ts
import { httpLoader, jsonLoader, remoteLoader } from '@rivinia/i18n';

jsonLoader(); // /i18n/{language}.json
jsonLoader({ path: 'assets/i18n' }); // /assets/i18n/{language}.json
httpLoader({ endpoint: 'https://api.example.com/i18n' }); // …/{language}
remoteLoader({
  url: (language) => `https://api.example.com/v2/${language}`,
  headers: { Authorization: 'Bearer …' },
});
```

Loader implementations are resolved lazily: `httpLoader` and `remoteLoader` are
separate chunks until first use. The default `jsonLoader` is part of the main
bundle — it runs in the app initializer, where a lazy chunk would put two extra
script requests between the main bundle and the dictionary fetch. A loader can
also be in-memory:

```ts
import { customLoader } from '@rivinia/i18n';

const inMemory = customLoader(async (language: 'ar' | 'en') => ({
  ar: { greeting: 'مرحبًا' },
  en: { greeting: 'Hello' },
})[language]);
```

A custom `TranslationLoader` receives the platform context:

```ts
import type { LoaderDescriptor, LoaderContext, TranslationLoader } from '@rivinia/i18n';

const filesystem: LoaderDescriptor<'ar' | 'en'> = {
  resolve: async (context?: LoaderContext): Promise<TranslationLoader<'ar' | 'en'>> => ({
    load: async (language) =>
      context?.isServer
        ? JSON.parse(await readFile(`i18n/${language}.json`, 'utf8'))
        : (await fetch(new URL(`i18n/${language}.json`, context?.baseUrl)).then((r) => r.json())),
  }),
};
```

`LoaderContext.baseUrl` is an absolute, directory-like base (`document.baseURI` in the
browser; `<base href>` resolved against the request on the server). `isServer` means
"there is a server request context", which is what makes relative URLs fetchable.

## Translation API

### Signals

| Signal                  | Type                                | Meaning                                                        |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `currentLanguage`       | `Signal<L>`                         | Active language id.                                            |
| `currentLanguageObject` | `Signal<Language<L>>`               | The active language entry.                                     |
| `languageChanged`       | `Signal<L>`                         | **Deprecated** — same signal as `currentLanguage`.                     |
| `languages`             | `Signal<readonly Language<L>[]>`    | Supported languages.                                           |
| `dir` / `isRtl`         | `Signal<Direction>` / `Signal<boolean>` | Document direction.                                        |
| `locale`                | `Signal<string>`                    | BCP-47 locale driving `Intl` and plural rules.                  |
| `loadingState`          | `Signal<'idle' \| 'loading' \| 'error'>` | Current dictionary status.                                 |
| `loadingError`          | `Signal<unknown>`                   | Last load failure.                                             |
| `isLoading`             | `Signal<boolean>`                   | `loadingState() === 'loading'`.                                |
| `ready`                 | `Signal<boolean>`                   | Initial content settled — the one to gate skeletons on.         |
| `loadedTranslations`    | `Signal<Record<string, unknown>>`   | The active dictionary.                                         |
| `missingKeys`           | `Signal<readonly string[]>`         | Unresolved keys, insertion order, deduplicated.                 |

### Methods

| Method                                        | Result                | Notes                                                                 |
| --------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| `translate(key, params?)`                     | `string`              | Key lookup + ICU rendering.                                            |
| `translate(key, defaultValue, params?)`       | `string`              | A supplied `defaultValue` is not reported as missing.                  |
| `translate({ en: 'Hi', ar: 'أهلاً' })`        | `string`              | Inline map: current → fallback → first value.                          |
| `t(key, params?)`                             | `Signal<string>`      | Same chain as a `computed`; params may be a function of signals.       |
| `setLanguage(id)` / `setLanguageAsync(id)`    | `void` / `Promise<void>` | Follows `switchStrategy`.                                          |
| `toggle()` / `next()` / `previous()`          | `void`                | `toggle()` flips the first two languages (dev warning with more); `next()`/`previous()` cycle. |
| `loadTranslations(id, { silent? })`           | `Promise<Record<…>>`  | Preload without switching.                                            |
| `reload(language?)`                           | `Promise<boolean>`    | Invalidate + refetch; never rejects.                                  |
| `formatNumber(value, options?)`               | `string`              | `Intl.NumberFormat` bound to `locale`.                                |
| `formatDate(value, options?)`                 | `string`              | `Intl.DateTimeFormat` bound to `locale`.                              |
| `getLanguage(id)`                             | `Language<L> \| undefined` | Lookup.                                                          |
| `initialize()`                                | `Promise<void>`       | Called by the provider; idempotent.                                   |
| `clearMissingKeys()`                          | `void`                | Reset the missing-key report.                                         |
| `clearMissingParams()`                        | `void`                | Reset the missing-parameter dedupe.                                   |

`RTranslatePipe` (`rTranslate`) delegates to `translate()`. It is impure by necessity —
the service reads signals on every call — so prefer `t()` or component code for long
lists.

## ICU messages

Supported subset (MF1): `{name}` interpolation, `{n, plural, …}` (with `offset:`),
`{n, selectordinal, …}`, `{x, select, …}`, `#`, `{n, number[, style]}`,
`{d, date[, style]}`, and nesting.

```json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}",
  "guests": "{n, plural, offset:1 =0 {Nobody} =1 {Only you} one {You and # other} other {You and # others}}",
  "place": "{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
  "amount": "{value, number, ::currency/USD}",
  "ratio": "{value, number, percent}",
  "day": "{value, date, long}"
}
```

- Categories come from `Intl.PluralRules(locale)`, so Arabic gets all six forms
  (`zero`, `one`, `two`, `few`, `many`, `other`) with no dependency.
- `offset:` follows ICU: `=N` matches the **raw** value, the category is selected with
  `value - offset`, and `#` renders `value - offset` in the locale's digits.
- `number` styles: `percent`, `integer`, `::currency/XXX`. `date` styles:
  `short`/`medium`/`long`/`full`. Anything else is unsupported.
- Unsupported or malformed constructs never throw: the raw `{…}` segment is returned
  as-is and parsing continues.
- `{name}` interpolation is `String(value)`; use `{n, number}` when formatting matters.
- `''` renders one apostrophe. A single apostrophe immediately before `{` or `}` (and
  `#` inside a plural) starts a quoted literal that ends at the next apostrophe:
  `It''s '{'x'}'` → `It's {x}`. A lone apostrophe elsewhere (`Don't`) is unchanged.
- `date` accepts a `Date`, epoch milliseconds, or a strict ISO-8601 string
  (`2026-10-28`, `2026-10-28T12:00:00Z`). Invalid input keeps the raw segment. Plain
  `{d}` on a `Date` uses `String()` — use `{d, date, …}` for localized output.
- Templates are compiled once into a cached AST, so a message rendered on every
  change-detection pass is not re-parsed.

## Missing keys

A key is missing only when it is absent from the current dictionary, absent from the
fallback dictionary, and no `defaultValue` was supplied. It is reported **once per key
per session**, and only once the current language actually has a dictionary — so a slow
load never produces false positives.

```ts
provideRiviniaI18n({
  defaultLanguage: 'ar',
  languages: […],
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

## Missing parameters

A message that needs `{name}` but receives no `name` keeps the placeholder — it is
never replaced with `undefined`. Report it the same way as missing keys:

```ts
provideRiviniaI18n({
  // …
  onMissingParam: ({ key, param, language }) => report(param, { key, language }),
});
```

Without `onMissingParam`, dev mode logs one warning per (key, param) pair. Set
`warnOnMissingParam: false` to silence it. The hook is delivered from a microtask,
so it may write signals, and `i18n.clearMissingParams()` resets the dedupe.

## Fallback language

Lookup order for `translate(key)`:

1. current dictionary — rendered with the **current** locale;
2. fallback dictionary — rendered with the **fallback** locale;
3. `defaultValue` — current locale;
4. the key itself.

Rule 2's locale is deliberate: an English plural template borrowed by an Arabic UI must
use English plural rules (2 categories), not Arabic (6).

The fallback dictionary loads in parallel with the initial language and **silently** — a
fallback failure reaches `onLoadError` but never sets `loadingState` to `'error'`, because
the current dictionary is what the UI needs. It is transferred with the rest of the state,
so hydration does not fetch it again. With `preload: false`, the fallback works from
cache/inline dictionaries only.

## Reloading a dictionary

```ts
await i18n.reload(); // current + fallback; drops every other cached language
await i18n.reload('en'); // one language; applied only if it is the current one
```

`reload()` is stale-while-revalidate: the visible dictionary stays on screen until the
fresh one arrives, so a reload never flashes raw keys. Each language carries a generation
counter, so a response that was in flight when `reload()` ran is discarded instead of
overwriting the new one. It never rejects — failures land on `loadingState`,
`loadingError` and `onLoadError`.

A typical deploy hook:

```ts
window.addEventListener('focus', () => void i18n.reload());
```

## `t()` signals

```ts
readonly title = this.i18n.t('app.title');
readonly items = this.i18n.t('cart.items', () => ({ count: this.count() }));
```

A function `params` is invoked inside the computation, so the signals it reads are
tracked: changing `count` re-renders the text without touching the language. `t()` is a
`computed` over the same resolution chain as `translate()`, and missing keys are recorded
in a microtask because Angular forbids signal writes inside a `computed`.

Use it for component fields. For a template expression that runs on every change
detection, `translate()` or the pipe is cheaper.

## Typed keys

The registry is empty by default, so `RegisteredI18nKey` resolves to `string` and nothing
breaks. Generate the declaration from a dictionary to make a typo a compile error:

```bash
npx rivinia-i18n-keys
# → src/i18n-keys.d.ts
npx rivinia-i18n-keys --source public/i18n/en.json --out src/i18n-keys.d.ts
npx rivinia-i18n-keys --check   # exit 1 when the file is stale (CI)
npx rivinia-i18n-keys --parity --dir public/i18n --base en
```

```ts
// src/i18n-keys.d.ts — generated, do not edit
import '@rivinia/i18n';

declare module '@rivinia/i18n' {
  interface RiviniaI18nKeyRegistry {
    readonly keys: 'app.title' | 'app.save' | 'booking.seats';
  }
}
```

With that file in the program:

```ts
i18n.translate('app.title'); // ok
i18n.t('app.titel'); // TS error: not assignable to 'app.title' | …
i18n.translate(`status.${code}` as RegisteredI18nKey); // dynamic key, explicit
```

The CLI flattens nested objects to dot paths, keeps literal dotted keys as-is, keeps
string leaves only, warns about non-string leaves and key collisions (the flat key
wins), sorts keys for stable diffs, and escapes quotes. It has no dependencies and
ships with the package (`rivinia-i18n-keys`).

`--parity` compares every `<language>.json` in `--dir` against `--base` and reports,
sorted: keys missing from a language, keys extra to it, and ICU placeholders used by
the base string but absent from the translation. Placeholders inside plural/select
branches are compared too; branch text itself is never read as a parameter. Any
mismatch exits 1, so CI fails on the common "added to `en.json`, forgot `ar.json`" bug.

## SSR

The default loader works on the server: `REQUEST` plus `<base href>` produce an absolute
URL, so Node's `fetch` never sees a relative path. The rendered dictionaries go into the
`TransferState`, and the browser reads them instead of fetching again.

- **A custom SSR host must provide `REQUEST`.** `renderApplication` does not add it;
  `@angular/ssr` does. Without it the service cannot build an absolute URL on the server
  and the default loader fails there — the same as any other library that needs the
  request origin.
- **Provide the serializer in the app injector.** `renderApplication` serializes the
  *platform* `TransferState`, while `bootstrapApplication` gives the app its own root
  injector, so dictionaries loaded by the service land in a different instance. Register
  a `BEFORE_APP_SERIALIZED` callback (or `provideServerRendering()`) in the app providers.
- **Serve the CSR shell as the template.** With `outputMode: 'server'` the builder
  prerenders `browser/index.html`, so that file already contains a rendered app and its
  own `ng-state` script. Use `browser/index.csr.html` as the render template; otherwise
  the response carries two scripts with the same id and the client reads the empty one.
- `storageStrategy: 'cookie'` reads the request cookie on the server and writes it in the
  browser, so the first paint matches the user's choice. Local/session storage fall back
  to the default language or browser detection on the server.
- `provideClientHydration(withEventReplay())` is the standard client side; the clean CSR
  shell carries no event-dispatch contract script, so an event fired before hydration
  completes is not replayed.

A complete, runnable host lives in `projects/i18n-e2e` (`node:http` +
`renderApplication`, no Express), with `e2e/ssr-smoke.mjs` asserting the raw HTML, the
server log, the transfer payload, the absence of a client refetch, and hydration.

## Migration: 0.3.3 → 0.4.0

Everything below is additive; no export was removed and no import path changed. Two
behaviour changes are worth reading:

1. **`#` in a plural now uses the locale's digits.** It is formatted with
   `Intl.NumberFormat(locale)` instead of the raw number, so a locale whose default
   numbering system is not Latin (for example `ar-EG`) renders `٣` where it used to
   render `3`. `en` and `ar` are unchanged.
2. **Missing keys warn in dev mode.** A key that resolves to nothing now logs
   `[rivinia/i18n] missing key "…"` once per session when `isDevMode()` is true. Set
   `warnOnMissingKey: false`, or pass `onMissingKey`, to control it.

New in 0.4.0: `fallbackLanguage`, `onMissingKey`, `warnOnMissingKey`, `missingKeys`,
`clearMissingKeys()`, `reload()`, `t()`, the typed-key registry and the
`rivinia-i18n-keys` CLI, ICU `selectordinal`/`offset:`/`{n, number}`/`{d, date}`, and
`Date` in `TranslateParams`. The default loader is unchanged (`i18n/{language}.json`);
`jsonLoader({ path: 'assets/i18n' })` keeps the old layout. The internal source layout
moved (models/services/utils/providers/pipes) but nothing under `src/` was ever
exported.

## License

MIT.

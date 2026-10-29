# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

A headless Angular language manager built on signals. Key-based JSON
dictionaries, inline translations, RTL/LTR document attributes, lazy loaders,
ICU plural/select messages, browser-language detection, and `Intl` number/date
formatting — with SSR that actually works and no runtime dependency beyond
Angular.

- Package version: **0.6.0**
- Peer dependency: **`@angular/core` `^22.0.0`** (plus `@angular-devkit/schematics` for `ng add`)
- Entry points: **`@rivinia/i18n`** (headless core) and **`@rivinia/i18n/ui`**
  (the standalone language toggle)
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
  RvTranslatePipe,
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

| Export                                                                                         | Kind             | Tier         |
| ---------------------------------------------------------------------------------------------- | ---------------- | ------------ |
| `RiviniaI18n`                                                                                  | service          | Stable       |
| `provideRiviniaI18n`, `defineRiviniaI18n`, `injectRiviniaI18n`                                 | providers        | Stable       |
| `RvTranslatePipe` (`rvTranslate`)                                                              | pipe             | Stable       |
| `RiviniaI18nConfig`                                                                            | type             | Stable       |
| `Language`, `Direction`, `Translation`, `TranslateParams`, `StorageStrategy`, `SwitchStrategy` | types            | Stable       |
| `RiviniaLoadError`                                                                             | class            | Stable       |
| `MissingKeyEvent`, `MissingParamEvent`                                                         | types            | Stable       |
| `TranslationLoader`, `LoaderDescriptor`, `LoaderContext`                                       | types            | Stable       |
| `jsonLoader`, `httpLoader`, `remoteLoader`, `customLoader`                                     | loader factories | Stable       |
| `HttpLoaderOptions`, `RemoteLoaderOptions`                                                     | types            | Stable       |
| `formatIcu`, `IcuFormatOptions`                                                                | ICU API          | Stable       |
| `RegisteredI18nKey`, `RiviniaI18nKeyRegistry`                                                  | typed-keys types | Stable       |
| `ViewTransitionConfig`, `ViewTransitionInfo`                                                   | types            | Experimental |
| `ViewTransitionService`                                                                        | service          | Internal     |
| `parseCookie`, `serializeCookie`                                                               | cookie helpers   | Internal     |
| `browserLanguages`, `detectBrowserLanguage`                                                    | helpers          | Internal     |
| `RiviniaLanguageToggle` (`rv-language-toggle`), `RiviniaLanguageTrigger` (`rvLanguageTrigger`) | `/ui` components | Experimental |
| `RiviniaLanguageManager`, `LanguageLike`, `RiviniaLanguageTriggerContext`                      | `/ui` types      | Experimental |

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
import { RvTranslatePipe } from '@rivinia/i18n';
import { i18n } from './i18n.config';

@Component({
  selector: 'app-header',
  imports: [RvTranslatePipe],
  template: `
    <h1>{{ title() }}</h1>
    <p>{{ 'booking.seats' | rvTranslate: { count: seats } }}</p>
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

| Option               | Type                                          | Default                          | Meaning                                                                       |
| -------------------- | --------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `languages`          | `readonly Language<T>[]`                      | —                                | Supported languages (`id`, `nativeName`, `dir`, optional `locale`).           |
| `defaultLanguage`    | `T`                                           | —                                | Must be one of `languages`; validated at construction.                        |
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
| `onMissingKey`       | `(event) => void`                             | none                             | Unresolved key; suppresses the default warning.                               |
| `warnOnMissingKey`   | `boolean`                                     | `isDevMode() && !onMissingKey`   | `console.warn` once per key.                                                  |
| `onMissingParam`     | `(event) => void`                             | none                             | Missing message argument; suppresses the default warning.                     |
| `warnOnMissingParam` | `boolean`                                     | `isDevMode() && !onMissingParam` | `console.warn` once per (key, param).                                         |
| `persist`            | `boolean`                                     | `true`                           | Persist the language after an explicit switch. First load writes nothing.     |
| `viewTransition`     | `ViewTransitionConfig`                        | none                             | Document view transition on language change.                                  |

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

const inMemory = customLoader(
  async (language: 'ar' | 'en') =>
    ({
      ar: { greeting: 'مرحبًا' },
      en: { greeting: 'Hello' },
    })[language],
);
```

A custom `TranslationLoader` receives the platform context:

```ts
import type { LoaderDescriptor, LoaderContext, TranslationLoader } from '@rivinia/i18n';

const filesystem: LoaderDescriptor<'ar' | 'en'> = {
  resolve: async (context?: LoaderContext): Promise<TranslationLoader<'ar' | 'en'>> => ({
    load: async (language) =>
      context?.isServer
        ? JSON.parse(await readFile(`i18n/${language}.json`, 'utf8'))
        : await fetch(new URL(`i18n/${language}.json`, context?.baseUrl)).then((r) => r.json()),
  }),
};
```

`LoaderContext.baseUrl` is an absolute, directory-like base (`document.baseURI` in the
browser; `<base href>` resolved against the request on the server). `isServer` means
"there is a server request context", which is what makes relative URLs fetchable.

## Translation API

### Signals

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

### Methods

| Method                                     | Result                     | Notes                                                                                          |
| ------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `translate(key, params?)`                  | `string`                   | Key lookup + ICU rendering.                                                                    |
| `translate(key, defaultValue, params?)`    | `string`                   | A supplied `defaultValue` is not reported as missing.                                          |
| `translate({ en: 'Hi', ar: 'أهلاً' })`     | `string`                   | Inline map: current → fallback → first value.                                                  |
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

`RvTranslatePipe` (`rvTranslate`) delegates to `translate()`. It is impure by necessity —
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

## The language toggle — `@rivinia/i18n/ui`

A second entry point ships a two-language toggle and the template that replaces its
default label:

```ts
import { RiviniaLanguageToggle, RiviniaLanguageTrigger } from '@rivinia/i18n/ui';
```

**Every export of this entry point is Experimental in 0.7.0** (D68):
`RiviniaLanguageToggle`, `RiviniaLanguageTrigger`, `RiviniaLanguageTriggerContext`,
`RiviniaLanguageManager` and `LanguageLike`. The five symbols may change — or lose
members — without a deprecation cycle until the entry point is promoted to Stable, which
needs the browser matrix and one release of consumer use first. The core entry point
keeps its own tiers; this one moves none of them.

The control flips between exactly two languages. The button shows the language it
switches **to** — the label is the destination — and the inner `<button>` owns the
accessible name, `lang` and `dir`, so the name is pronounced and laid out in its own
language even when the page runs the other direction. The host element is the API: write
`<rv-language-toggle>`, style through the hooks below, and never reach for the button.

### Managed, with `RiviniaI18n`

`RiviniaI18n` satisfies `RiviniaLanguageManager` structurally, so pass the service
directly. Managed state wins: `[languages]`, `[current]` and `[busy]` are ignored while
`manager` is set.

```ts
import { Component, inject } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';
import { RiviniaLanguageToggle } from '@rivinia/i18n/ui';

@Component({
  selector: 'app-header',
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle [manager]="i18n" [label]="switchLabel()" />`,
})
export class Header {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);
  readonly switchLabel = this.i18n.t('common.switchLanguage');
}
```

`label` is the _action_ fragment, appended after the language name. The button above is
rendered as:

```html
<button
  type="button"
  class="rv-language-toggle__button"
  lang="ar"
  dir="rtl"
  aria-label="العربية, Switch language"
>
  <span class="rv-language-toggle__icon">
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><!-- globe --></svg>
  </span>
  <span class="rv-language-toggle__name">العربية</span>
</button>
```

`label` is never translated for you — the UI entry point imports core types only, so the
app passes an already translated string (a `t()` signal re-renders on a language switch).

### Presentational, without a manager

```html
<rv-language-toggle
  [languages]="languages"
  [current]="language()"
  [busy]="switching()"
  label="Switch language"
  (languageChange)="language.set($event)"
/>
```

With no manager, `languages` + `current` describe the state, `busy` supplies the loading
state, and `languageChange` is the only side effect. Presentational mode is synchronous:
there is nothing to await, so the event fires on activation.

### The icon

The button leads with a mark: a globe drawn in `currentColor`, so it inherits the
button's colour, hover, active and disabled states without extra styling. It is
`aria-hidden` and `focusable="false"`, and it contributes nothing to the accessible
name — `aria-label` on the button supplies that (D57).

`[icon]` replaces it with a template. The template is rendered as-is inside a
`1.5em` square box that stretches it on both axes, so an `<svg>` needs no `width` or
`height` of its own:

```ts
@Component({
  imports: [RiviniaLanguageToggle],
  template: `
    <ng-template #swapIcon>
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M10 24h36M38 16l8 8-8 8M54 40H18M26 32l-8 8 8 8" />
      </svg>
    </ng-template>
    <rv-language-toggle [manager]="i18n" [icon]="swapIcon" [label]="switchLabel()" />
  `,
})
export class Header {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);
  readonly switchLabel = this.i18n.t('common.switchLanguage');
}
```

Two constraints come from that box:

- **Draw in `currentColor`.** A hard-coded fill ignores the hover and disabled states.
- **Design at the painted size.** The default is `1.5em` — 21px at the shipped
  `0.875rem` type — and the mark is drawn at `stroke-width="4.4"` on a 64-unit viewBox
  so it lands at ~1.4px. Artwork authored for a 16px or 24px grid is usually too dense
  here: fine latitudes and extra meridians fill in below roughly 22px. Resize with
  `--rv-i18n-toggle-icon-size` rather than by hand, and a consumer icon follows the same
  token.

A consumer icon drawn inside `rvLanguageTrigger` instead of `[icon]` sits after the
button's own mark, so pass `[icon]` when replacing it.

### With a trigger template

`rvLanguageTrigger` replaces the default name span inside the button. The template
receives the target entry as `$implicit` and `busy`, and inherits the button's `lang` and
`dir`:

```html
<rv-language-toggle [manager]="i18n" label="Switch language">
  <ng-template rvLanguageTrigger let-language let-busy="busy">
    <svg aria-hidden="true" focusable="false"><!-- consumer-provided icon --></svg>
    <span [lang]="language.id">{{ language.nativeName }}</span>
    @if (busy) {
    <span class="spinner" aria-hidden="true"></span>
    }
  </ng-template>
</rv-language-toggle>
```

Set `lang` explicitly on any text inside the template that is **not** in the target
language — a "current language" hint, an English action word, a flag's alt text — because
it would otherwise inherit the target's `lang` and be pronounced and laid out as that
language.

> **WARNING — the template's visible text must be a prefix of the accessible name.**
> The name is computed from the target language, not read from the template's DOM, so
> the library cannot see what the template renders. Whatever text the template shows the
> user must remain a prefix of that name (WCAG 2.5.3 / D57). `label` is appended after
> the language name, so it cannot repair a template whose visible text comes first: such
> a template must be changed, not the name. A template that renders العربية under an
> accessible name of English, Switch language is a voice-control failure — the user says
> what they see and nothing matches. Icon-only triggers are safe: no visible text, no
> prefix to violate, and the name is still non-empty. `label` is required with a custom
> template; a dev-mode warning fires without it.

A text suffix is bidi-fragile, so it belongs to the name's run. When the template adds
words after the name — ", Switch language", a count, a code — put the punctuation inside
the element that holds the name and keep the whole label in one element. As the first
character of an LTR fragment a comma is pushed to the far edge of an RTL button, far from
the name it closes, and the button's `gap` then separates it from that name in both
directions. The proof page under `projects/i18n-e2e` renders exactly this case.

### Inputs and output

| Input       | Type                      | Default | Meaning                                                                     |
| ----------- | ------------------------- | ------- | --------------------------------------------------------------------------- |
| `manager`   | `RiviniaLanguageManager`  | none    | Managed mode: the source of truth for languages, current and busy.          |
| `languages` | `readonly LanguageLike[]` | `[]`    | Presentational languages; the button shows the entry that is not `current`. |
| `current`   | `string`                  | none    | Presentational current language id.                                         |
| `label`     | `string`                  | none    | Action fragment appended to the name; required with a template.             |
| `busy`      | `boolean`                 | `false` | Presentational loading state; ignored with a manager.                       |
| `disabled`  | `boolean`                 | `false` | The app's own switch: sets the native `disabled` attribute.                 |
| `icon`      | `TemplateRef \| null`     | `null`  | Replaces the default globe; the template fills the icon box.                |

`languageChange` emits the id that is now current — see the contract below.

`LanguageLike` is `{ id, nativeName?, dir?, locale? }`: `dir` absent renders `dir="auto"`,
and `locale` is what Intl.DisplayNames uses when `nativeName` is missing.

### Two languages exactly

| `languages().length` | Renders                                                          |
| -------------------- | ---------------------------------------------------------------- |
| 0 or 1               | nothing: an empty host with no `data-*` attribute                |
| 2                    | the toggle                                                       |
| 3 or more            | one button with `aria-disabled="true"` plus one dev-mode warning |

Three or more never cycles through the first two. The button keeps its name and stays in
the tab order (`aria-disabled`, not the native attribute) so a keyboard or screen-reader
user can reach it and learn that the shape is wrong for the data; the count guard also
wins over a transient busy state, so the verdict does not alternate. Use a select, a menu,
or your own control for three or more languages.

### Busy, failure and the emission contract

- **Busy is announced, not asserted away.** While the manager reports
  `loadingState() === 'loading'` (or `[busy]` is true, presentational) the button carries
  `aria-busy="true"` and nothing else, its cursor turns to `progress`, and activation is
  ignored in the handler rather than queued. The label, the fill and the colours do not
  move: a switch is a plain wait, and the spinner belongs to the product's template.
  Focus stays where it is; the component never moves it.
- **`languageChange` confirms, it does not intend.** In managed mode the event fires only
  after `setLanguageAsync(target)` resolves **and** `currentLanguage() === target`.
  Activating the current language emits nothing. An overlapping switch that loses the
  core's last-resolved-wins race is silent, because the check runs after the await.
- **A failure emits nothing and shows nothing.** `setLanguageAsync` aborts on a failed
  load, so the visible language, the direction and the label stay as they were.
  `RiviniaLanguageManager` is four members and includes neither `loadingError` nor
  `onLoadError`: read `RiviniaI18n.loadingError` or pass `onLoadError` in the config, and
  render your own message next to the toggle.
- **`switchStrategy` caveat.** The toggle always calls `setLanguageAsync()`, which waits
  for the dictionary and then applies, regardless of `switchStrategy`. An app configured
  with `'instant'` still gets the preload-first path through this control — that is what
  makes the confirmation above meaningful.

### SSR and the language name

The component renders the same markup on the server and touches no browser global. The
name resolves as `nativeName` → Intl.DisplayNames → the raw id, cached per
(locale, id). Supply `nativeName` when the server's CLDR data might differ from the
browser's: it short-circuits the lookup, so the server HTML and the first client render
cannot disagree.

### Styling

Sizes are `rem`, properties are logical, and every token falls back to a `--rv-*`
semantic value. Override the custom property, not the declaration:

| Token                               | Falls back to | Default                                             |
| ----------------------------------- | ------------- | --------------------------------------------------- |
| `--rv-i18n-toggle-bg`               | `--rv-bg`     | `transparent`                                       |
| `--rv-i18n-toggle-fg`               | `--rv-fg`     | `currentColor`                                      |
| `--rv-i18n-toggle-border`           | `--rv-border` | `currentColor`                                      |
| `--rv-i18n-toggle-radius`           | `--rv-radius` | `0.5rem`                                            |
| `--rv-i18n-toggle-shadow`           | `--rv-shadow` | `none`                                              |
| `--rv-i18n-toggle-font`             | `--rv-font`   | `inherit`                                           |
| `--rv-i18n-toggle-padding`          | —             | `0.5rem 0.75rem`                                    |
| `--rv-i18n-toggle-gap`              | —             | `0.5rem`                                            |
| `--rv-i18n-toggle-size`             | —             | `0.875rem`                                          |
| `--rv-i18n-toggle-icon-size`        | —             | `1.5em`                                             |
| `--rv-i18n-toggle-hover-bg`         | —             | `color-mix(in srgb, currentColor 8%, transparent)`  |
| `--rv-i18n-toggle-active-bg`        | —             | `color-mix(in srgb, currentColor 16%, transparent)` |
| `--rv-i18n-toggle-focus-ring`       | —             | `2px solid currentColor`                            |
| `--rv-i18n-toggle-focus-offset`     | —             | `0.125rem`                                          |
| `--rv-i18n-toggle-disabled-opacity` | —             | `0.45`                                              |

The border and font tokens are a **colour** and a **font family**, not shorthands: the
declaration supplies `1px solid` and `font-family`, so `--rv-border` and `--rv-font` from
`@rivinia/theme` flow through unchanged instead of producing an invalid shorthand.

Hover and active default to 8% and 16% of `currentColor` mixed **over** the button's own
background, so a dark `--rv-bg` keeps its fill instead of turning see-through. A value
you set for `--rv-i18n-toggle-hover-bg` or `--rv-i18n-toggle-active-bg` replaces the whole
fill, not just the tint.

The hooks that are safe to depend on:

- the host `rv-language-toggle` — with `[data-busy]`, `[data-disabled]` and
  `[data-languages="2" | "many"]`; `data-disabled` mirrors the `[disabled]` input only,
  so a stylesheet can tell "the app disabled this" apart from "this shape is wrong for
  the data" (which is `data-languages="many"` plus `aria-disabled="true"`);
- `rv-language-toggle__button`, `rv-language-toggle__icon` and
  `rv-language-toggle__name` on the inner elements.

With 0 or 1 languages the host is empty and carries no `data-*` attribute at all, so a
`[data-languages]` selector has nothing to match by design. There is no error state to
style.

### Recipes: inside a menu or beside a select (Experimental, untested)

Neither recipe is covered by this release's test matrix; the select in particular is the
supported shape for three or more languages, not something the toggle turns into.

- **Inside a menu.** The toggle is a plain `<button>` in normal flow, so it can sit in a
  panel that already exists — `@rivinia/menu/ui` ships the menu primitives. The menu's
  focus trap and keyboard model with this control inside it have **not** been tested.
- **Beside a native `<select>`.** For three or more languages, bind the select to the
  service and leave the toggle out:

  ```html
  <select (change)="i18n.setLanguage($any($event.target).value)">
    @for (lang of i18n.languages(); track lang.id) {
    <option [value]="lang.id" [selected]="lang.id === i18n.currentLanguage()" [lang]="lang.id">
      {{ lang.nativeName }}
    </option>
    }
  </select>
  ```

  `@rivinia/select/ui` ships a richer popup if the native control is not enough; using it
  with this service is **untested**.

### No flags

The library ships one neutral mark — a globe — and no flag imagery. Flag icons for
languages are politically ambiguous and the W3C i18n guidance recommends against them.
A globe does not name a language it cannot represent, and it says "switch language"
without saying which. An app that wants its own mark passes `[icon]`, or draws one
inside `rvLanguageTrigger`; either way the accessible name is unaffected.

## SSR

The default loader works on the server: `REQUEST` plus `<base href>` produce an absolute
URL, so Node's `fetch` never sees a relative path. The rendered dictionaries go into the
`TransferState`, and the browser reads them instead of fetching again.

- **A custom SSR host must provide `REQUEST`.** `renderApplication` does not add it;
  `@angular/ssr` does. Without it the service cannot build an absolute URL on the server
  and the default loader fails there — the same as any other library that needs the
  request origin.
- **Provide the serializer in the app injector.** `renderApplication` serializes the
  _platform_ `TransferState`, while `bootstrapApplication` gives the app its own root
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

## Migration: 0.5.0 → 0.6.0

0.6.0 is a breaking minor (the pre-1.0 policy allows it). The core split (RIV-18) is
internal — no signature changed — but three compatibility names are gone:

1. **The pipe is `rvTranslate`.** `RTranslatePipe` (`rTranslate`) was removed; the
   package prefix is `rv`, and there is no alias to keep:

   ```html
   <!-- before -->
   {{ 'booking.seats' | rTranslate: { count: seats } }}
   <!-- after -->
   {{ 'booking.seats' | rvTranslate: { count: seats } }}
   ```

2. **`languageChanged` is gone.** It was the same signal as `currentLanguage`; switch
   your reads to `currentLanguage`.
3. **`loadTranslations(id, { silent })` is now `loadTranslations(id)`.** `silent` never
   did anything — background loads are an internal concern.

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

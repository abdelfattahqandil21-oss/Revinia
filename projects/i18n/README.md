# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

A headless Angular language manager built on signals. It supports key-based
JSON dictionaries, inline translations, RTL/LTR document attributes, lazy
loaders, ICU plural/select messages, browser-language detection, and
ECMAScript internationalization number/date formatting.

- Package version: **0.3.2**
- Peer dependency: **`@angular/core` `^22.0.0`**
- No `tslib` or `HttpClient` peer dependency. Built-in loaders use `fetch`.

## Install and configure

```bash
npm install @rivinia/i18n
ng add @rivinia/i18n
```

`ng add` prompts for language IDs and whether to enable browser detection; the
first language becomes the default. It wires a starter provider into a
standalone app's `app.config.ts`. You can configure it yourself instead:

```ts
// src/app/i18n.config.ts
import { defineRiviniaI18n, jsonLoader } from '@rivinia/i18n';

export const i18nConfig = defineRiviniaI18n({
  defaultLanguage: 'en',
  languages: [
    { id: 'en', nativeName: 'English', dir: 'ltr', locale: 'en-US' },
    { id: 'ar', nativeName: 'العربية', dir: 'rtl', locale: 'ar-EG' },
  ],
  detectBrowser: true,
  switchStrategy: 'preload-first',
  loader: jsonLoader(),
});
```

```ts
// src/app/app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { i18nConfig } from './i18n.config';

export const appConfig: ApplicationConfig = {
  providers: [i18nConfig.provide()],
};
```

`defineRiviniaI18n()` binds the config to typed accessors, so
`i18nConfig.inject()` retains the `'en' | 'ar'` language type. Alternatively,
use `provideRiviniaI18n(config)` in the providers array and
`injectRiviniaI18n<'en' | 'ar'>()` in an injection context.

Defaults: `preload: true`, `detectBrowser: false`, local-storage persistence,
and automatic `<html lang>`/`<html dir>` updates. A stored supported language
always wins over browser detection. Use `storageStrategy: 'none'` to disable
persistence; `'session'` and `'cookie'` are also supported.

## Dictionaries

By default, `jsonLoader()` fetches `i18n/{language}.json` from the site root.
For Angular apps using the standard `public/` static-file directory, put
dictionaries at `public/i18n/en.json`, `public/i18n/ar.json`, and so on. Make
sure your host serves those files at `/i18n/{language}.json`.

If an existing app still serves dictionaries from `assets/i18n/`, keep that
layout with `jsonLoader({ path: 'assets/i18n' })` instead.

```json
// public/i18n/en.json
{
  "booking": {
    "seats": "{count, plural, =0 {No seats} one {# seat} other {# seats}}"
  }
}
```

```json
// public/i18n/ar.json
{
  "booking": {
    "seats": "{count, plural, zero {لا مقاعد} one {مقعد واحد} two {مقعدان} few {# مقاعد} many {# مقعدًا} other {# مقعد}}"
  }
}
```

The default loader does not use `HttpClient`. To use a different JSON path or
an endpoint, pass a loader descriptor:

```ts
import { httpLoader, jsonLoader, remoteLoader } from '@rivinia/i18n';

jsonLoader({ path: '/my-i18n' }); // fetches /my-i18n/{language}.json
httpLoader({ endpoint: 'https://api.example.com/i18n' }); // appends /{language}
remoteLoader({
  url: (language) => `https://api.example.com/v2/${language}`,
  headers: { Authorization: 'Bearer …' },
});
```

All loaders are resolved lazily; their fetch implementations are loaded only
when needed. A custom loader can also use an in-memory dictionary or another
data source:

```ts
import { customLoader } from '@rivinia/i18n';

const inMemoryLoader = customLoader(async (language: 'en' | 'ar') => {
  const dictionaries = {
    en: { greeting: 'Hello' },
    ar: { greeting: 'مرحبًا' },
  };
  return dictionaries[language];
});
```

Pass that descriptor as `loader: inMemoryLoader` in the provider config.

## Use in a standalone component

`provideRiviniaI18n()` registers an app initializer that loads the initial
language before first paint. The `ready` signal becomes true when initial
content is available or initial loading has settled; it is more useful for
initial skeletons than `isLoading`.

```ts
// src/app/header.component.ts
import { Component } from '@angular/core';
import { RTranslatePipe } from '@rivinia/i18n';
import { i18nConfig } from './i18n.config';

@Component({
  selector: 'app-header',
  imports: [RTranslatePipe],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly i18n = i18nConfig.inject();
  readonly seatCount = 3;
  readonly price = 12.5;
}
```

```html
<!-- src/app/header.component.html -->
@if (i18n.ready()) {
<p>{{ i18n.translate({ en: 'Welcome', ar: 'أهلاً' }) }}</p>
<p>{{ 'booking.seats' | rTranslate: { count: seatCount } }}</p>
<p>{{ i18n.formatNumber(price, { style: 'currency', currency: 'USD' }) }}</p>
<button type="button" (click)="i18n.setLanguage('ar')">العربية</button>
<button type="button" (click)="i18n.setLanguage('en')">English</button>
} @else {
<p>Loading…</p>
}
```

For key lookup, `translate('booking.seats', { count: 3 })` is also available.
Missing keys return the key itself, or the supplied fallback:
`translate('missing.key', 'Not available')`. Inline language maps fall back to
their first value if the active language is absent. `RTranslatePipe` is
impure so it reevaluates when the language changes; for long lists, prefer
calling `translate()` in component code.

## Loading, switching, and SSR

- Initial language loading is enabled by default. Set `preload: false` to skip
  the initial request; the service then marks `ready()` true immediately.
- `translations` can seed inline dictionaries before the initial request. A
  successful loader response replaces the seed; if loading fails, the seed
  remains visible. For an app with no network, pair inline translations with
  a `customLoader` or disable preloading as appropriate.
- Load failures do not reject provider initialization. Inspect
  `loadingState()`/`loadingError()` or handle them with `onLoadError`; lookups
  still fall back to the key or supplied fallback.
- `switchStrategy: 'instant'` changes language immediately and loads in the
  background. `'preload-first'` waits for the new dictionary; a failed load
  leaves the current language and direction unchanged. You can also call and
  await `setLanguageAsync(id)` explicitly.
- `loadTranslations(id)` preloads a dictionary without switching. Dictionaries
  are cached by language; out-of-order responses do not replace the currently
  displayed language.
- For SSR, dictionaries are transferred to the browser to avoid a second
  fetch. `storageStrategy: 'cookie'` reads the request cookie on the server
  and writes it in the browser, keeping the initial language consistent.
  Local/session storage are unavailable on the server and fall back to the
  configured default or browser detection.

## ICU messages and formatting

The supported ICU subset is plain `{name}` interpolation, `{count, plural,
...}`, `{gender, select, ...}`, nested messages, exact numeric selectors such
as `=0`, and `#` inside a plural. Selection follows the platform's plural
rules for the configured locale; dictionaries can provide all six Arabic
categories. This is not full ICU MessageFormat; date/time and number
formatting are separate `formatDate()` and `formatNumber()` methods. Malformed
or unsupported messages render as raw text rather than throwing.

Set `locale` on a language entry when the language ID alone is not the desired
formatting locale. For example, the Arabic-Egypt locale can request its
appropriate digit conventions.

## Public API

| Export                                                                                                                                          | Kind               | Purpose                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `provideRiviniaI18n(config)`                                                                                                                    | Provider           | Configure languages, loader, persistence, startup loading, and switching.  |
| `defineRiviniaI18n(config)`                                                                                                                     | Helper             | Bind config and preserve the configured language union in `inject()`.      |
| `RiviniaI18n`, `injectRiviniaI18n()`                                                                                                            | Service / function | Language, direction, loading, translation, switching, and formatting APIs. |
| `RTranslatePipe`                                                                                                                                | Pipe               | Template pipe named `rTranslate`.                                          |
| `jsonLoader`, `httpLoader`, `remoteLoader`, `customLoader`                                                                                      | Loaders            | Lazy descriptors for fetch-based or custom dictionary loading.             |
| `formatIcu`, `detectBrowserLanguage`, `browserLanguages`                                                                                        | Utilities          | Format the supported ICU subset; inspect browser language matches.         |
| `parseCookie`, `serializeCookie`                                                                                                                | Utilities          | Cookie strategy helpers.                                                   |
| `ViewTransitionService`                                                                                                                         | Service            | View-transition integration used by the optional config.                   |
| `Language`, `Translation`, `TranslateParams`, `RiviniaI18nConfig`, `StorageStrategy`, `SwitchStrategy`, `LoaderDescriptor`, `TranslationLoader` | Types              | Configuration, dictionary, and loader types.                               |

## License

MIT.

# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

Headless language manager for Angular 22+. Signals, RTL/LTR, lazy loaders,
ICU plurals (all six Arabic forms), browser detection, Intl formatting —
zero DOM opinions beyond `<html dir/lang>`, zero styling.

- Version: **0.3.0**
- Requires: **Angular `^22.0.0`**, `tslib`

## Install

```bash
npm install @rivinia/i18n
ng add @rivinia/i18n   # asks default language + browser detection, wires an ar/en starter
```

## Dictionaries by convention (no config needed)

Key-based `translate('booking.seats')` works out of the box with the conventional
layout — the default loader fetches `i18n/{language}.json`
(`public/i18n/ar.json`, `public/i18n/en.json`, … served from the site root;
modern Angular templates map `public/` via `{ "glob": "**/*", "input": "public" }`).
Override only when you differ:

```json
// public/i18n/ar.json
{ "booking": { "seats": "{count, plural, zero {لا مقاعد} one {مقعد واحد} other {# مقاعد}}" } }
```

```ts
// custom path / HTTP endpoint / in-memory (first truth wins):
provideRiviniaI18n({ loader: jsonLoader({ path: '/my-i18n' }), ... });
provideRiviniaI18n({ loader: httpLoader({ endpoint: 'https://api.example.com/i18n' }), ... });
// inline-only apps (zero network): loader: customLoader(async () => ({}))
```

Loaders code-split: fetch implementations load on first use only.

> **Migration (0.3.0 — breaking default):** the default
> loader path changed from `assets/i18n` to `i18n`. Move
> `src/assets/i18n/*.json` → `public/i18n/*.json` (served from the site root),
> or keep the old layout explicitly with
> `jsonLoader({ path: 'assets/i18n' })`.

## Startup loading (no raw keys on first paint)

`provideRiviniaI18n()` registers an app initializer that loads the initial
language before first paint (SSR waits via `PendingTasks`):

```ts
provideRiviniaI18n({
  // ...
  preload: false, // opt out: load manually instead
  translations: { ar: { hello: 'مرحبا' } }, // inline seed: instant, zero network,
}); // a successful loader response still wins
```

Gate skeletons on the `ready` signal (true once initial content is available),
not on `isLoading`. Load failures never reject setup — they land on
`loadingError`/`onLoadError` with safe fallbacks preserved.

## Persistence and SSR

- `storageStrategy: 'cookie'` syncs SSR and browser through one cookie:
  the server reads the request cookie (correct first paint, no hydration
  mismatch), the browser writes it. `local`/`session` fall back to the
  default language on the server.
- Dictionaries loaded on the server travel to the browser via `TransferState`
  (no double fetch). The `<html dir/lang>` effect uses injected `DOCUMENT`,
  so it renders on the server too.

```ts
// app.config.ts
import { provideRiviniaI18n } from '@rivinia/i18n';

providers: [
  provideRiviniaI18n({
    defaultLanguage: 'ar',
    languages: [
      { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
      { id: 'en', nativeName: 'English', dir: 'ltr' },
    ],
  }),
];
```

## Quick start

```ts
export class Header {
  i18n = injectRiviniaI18n();
  save = () => this.i18n.translate({ ar: 'حفظ', en: 'Save' });
  seats = (n: number) => this.i18n.translate('booking.seats', { count: n });
}
```

```json
// public/i18n/en.json
{ "booking": { "seats": "{count, plural, one {# seat} other {# seats}}" } }
```

```html
<p>{{ i18n.translate({ ar: 'مرحبا', en: 'Hello' }) }}</p>
<p>{{ 'booking.seats' | rTranslate:{ count: seats() } }}</p>
```

## API

| Export                                            | Kind         | Purpose                                                                                                                               |
| ------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaI18n(config)`                      | provider     | languages, default, storage (+`cookie`), loader, `detectBrowser?` (off), `switchStrategy?`, `preload?`, `translations?` (inline seed) |
| `RiviniaI18n`                                     | `@Service()` | signals (`locale`, `ready`) + `translate/setLanguage(toggle/next/previous)/loadTranslations/formatNumber/formatDate`                  |
| `injectRiviniaI18n()`                             | function     | shorthand, preserves the language union; `defineRiviniaI18n(config)` binds config + accessors with inference                          |
| `jsonLoader/httpLoader/remoteLoader/customLoader` | loaders      | lazy code-split dictionaries (fetch, no HttpClient)                                                                                   |
| `formatIcu(template, params, locale)`             | util         | ICU subset: plural/select/`#`/nesting via native `Intl.PluralRules`                                                                   |
| `detectBrowserLanguage(ids, langs)`               | util         | in-order priority + base-tag fallback (`ar-EG` → `ar`), pure/testable                                                                 |
| `parseCookie/serializeCookie`                     | utils        | cookie strategy primitives (server header / browser cookie)                                                                           |
| `RTranslatePipe`                                  | pipe         | `rTranslate` (impure by necessity — prefer `translate()` in code for lists)                                                           |
| types                                             | types        | `RiviniaI18nConfig`, `Language` (+`locale?`), `Translation`, `LoaderDescriptor`, …                                                    |

Dictionaries commit to visible signals only for the currently intended
language — out-of-order responses stay cached. `setLanguageAsync` aborts on
load failure (language, direction and dictionary untouched). ICU subset is
deliberately small (`plural`/`select` only) — full ICU belongs to
FormatJS, not to a 10 kB core. Malformed templates render raw, never throw.
Stored preference always beats browser detection; detection runs only when
nothing is stored. `switchStrategy: 'preload-first'` (or `setLanguageAsync`)
avoids raw-key flashes on route switches.

## License

MIT.

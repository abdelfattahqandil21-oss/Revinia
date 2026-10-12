# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

Headless language manager for Angular 22+. Signals, RTL/LTR, lazy loaders,
ICU plurals (all six Arabic forms), browser detection, Intl formatting —
zero DOM opinions beyond `<html dir/lang>`, zero styling.

- Version: **0.1.1**
- Requires: **Angular `^22.0.0`**, `tslib`

## Install

```bash
npm install @rivinia/i18n
ng add @rivinia/i18n   # asks default language + browser detection, wires an ar/en starter
```

## Dictionaries by convention (no config needed)

Key-based `translate('booking.seats')` works out of the box with the conventional
layout — the default loader fetches `assets/i18n/{language}.json`
(`assets/i18n/ar.json`, `assets/i18n/en.json`, …). Override only when you differ:

```json
// src/assets/i18n/ar.json
{ "booking": { "seats": "{count, plural, zero {لا مقاعد} one {مقعد واحد} other {# مقاعد}}" } }
```

```ts
// custom path / HTTP endpoint / in-memory (first truth wins):
provideRiviniaI18n({ loader: jsonLoader({ path: '/my-i18n' }), ... });
provideRiviniaI18n({ loader: httpLoader({ endpoint: 'https://api.example.com/i18n' }), ... });
// inline-only apps (zero network): loader: customLoader(async () => ({}))
```

Loaders code-split: fetch implementations load on first use only.

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
// assets/i18n/en.json
{ "booking": { "seats": "{count, plural, one {# seat} other {# seats}}" } }
```

```html
<p>{{ i18n.translate({ ar: 'مرحبا', en: 'Hello' }) }}</p>
<p>{{ 'booking.seats' | rTranslate:{ count: seats() } }}</p>
```

## API

| Export | Kind | Purpose |
|---|---|---|
| `provideRiviniaI18n(config)` | provider | languages, default, storage, loader, `detectBrowser?` (off), `switchStrategy?` |
| `RiviniaI18n` | `@Service()` | signals + `translate/setLanguage(toggle/next/previous)/loadTranslations/formatNumber/formatDate` |
| `injectRiviniaI18n()` | function | shorthand for `inject(RiviniaI18n)` |
| `jsonLoader/httpLoader/remoteLoader/customLoader` | loaders | lazy code-split dictionaries (fetch, no HttpClient) |
| `formatIcu(template, params, locale)` | util | ICU subset: plural/select/`#`/nesting via native `Intl.PluralRules` |
| `detectBrowserLanguage(ids, langs)` | util | priority match + base-tag fallback (`ar-EG` → `ar`), pure/testable |
| `RTranslatePipe` | pipe | `rTranslate` (impure by necessity — prefer `translate()` in code for lists) |
| types | types | `RiviniaI18nConfig`, `Language`, `Translation`, `LoaderDescriptor`, … |

ICU subset is deliberately small (`plural`/`select` only) — full ICU belongs to
FormatJS, not to a 10 kB core. Malformed templates render raw, never throw.
Stored preference always beats browser detection; detection runs only when
nothing is stored. `switchStrategy: 'preload-first'` (or `setLanguageAsync`)
avoids raw-key flashes on route switches.

## License

MIT.

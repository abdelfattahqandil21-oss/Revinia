# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

A headless Angular language manager built on signals. Key-based JSON
dictionaries, inline translations, RTL/LTR document attributes, lazy loaders,
ICU plural/select messages, browser-language detection, and `Intl` number/date
formatting — with SSR that actually works and no runtime dependency beyond
Angular.

Concretely: the text lives in JSON files, components ask for a key, and the whole
app — text, direction, dates, numbers — follows the language the user picked.
Arabic is a first-class target, not an afterthought of an English layout.

- Package version: **0.8.0**
- Peer dependency: **`@angular/core` `^22.0.0`** (plus `@angular-devkit/schematics` for `ng add`,
  and an optional `@rivinia/select` `^0.7.0` for the `/select` entry point)
- Entry points: **`@rivinia/i18n`** (headless core), **`@rivinia/i18n/ui`**
  (the standalone language toggle) and **`@rivinia/i18n/select`** (the
  multi-language picker)
- `sideEffects: false`; no runtime import beyond `@angular/core`; loaders are lazy chunks
- No `HttpClient` peer — the built-in loaders use `fetch`

## What you get

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

## Contents

Three levels. Stop at the one that answers your question.

| Tier                   | What it covers                                                      | Start at                              |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| **Start here** (5 min) | install, generate the language list, render a first translation     | [Quick start](#quick-start)           |
| **Everyday use**       | translating, plurals, switching, dictionaries, the toggle, SSR      | [Translating text](#translating-text) |
| **Reference**          | every option, loader, ICU rule, UI input, export tier and migration | [Configuration](#configuration)       |

## Start here

These three sections are everything needed to run an app. The rest can wait.

### Install

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

### Quick start

#### 1. Generate the language list

```bash
npx rivinia-i18n-keys init
```

It asks for each language (id, native name, direction) and the default one, then
writes `src/app/i18n/languages.ts` plus one empty dictionary per language under
`public/i18n/`. Without a terminal:

```bash
npx rivinia-i18n-keys init --languages ar:العربية:rtl,en:English:ltr --default en
```

#### 2. Register it once, at bootstrap

```ts
// src/app/app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { i18n } from './i18n/languages';

export const appConfig: ApplicationConfig = {
  providers: [i18n.provide()],
};
```

#### 3. Translate

```ts
// src/app/header.ts
import { Component } from '@angular/core';
import { RvTranslatePipe } from '@rivinia/i18n';
import { injectI18n } from './i18n/languages';

@Component({
  selector: 'app-header',
  imports: [RvTranslatePipe],
  template: `
    <h1>{{ title() }}</h1>
    <p>{{ 'booking.seats' | rvTranslate }}</p>
    <button type="button" (click)="i18n.setLanguage('en')">English</button>
  `,
})
export class Header {
  readonly i18n = injectI18n();
  readonly title = this.i18n.t('app.title');
}
```

Then the two dictionaries, same keys in both:

```jsonc
// public/i18n/ar.json
{ "app": { "title": "الحجوزات" }, "booking": { "seats": "المقاعد" } }
```

```jsonc
// public/i18n/en.json
{ "app": { "title": "Bookings" }, "booking": { "seats": "Seats" } }
```

Both `title()` and the pipe update on the click, and the direction of the page flips
with the language — nothing else is wired by hand.

#### Without the terminal

The same setup, written by hand: `provideRiviniaI18n(config)` and
`injectRiviniaI18n<'ar' | 'en'>()` are the primitives the generated module wraps.

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

### What you just configured

Each entry of `languages` answers four questions:

| Field        | Answers                                                                                                              | Required |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | -------- |
| `id`         | The key everything else uses: JSON filename, stored preference, `currentLanguage()`, `setLanguage('…')`.             | yes      |
| `nativeName` | How the language calls itself in a switcher (`العربية`, not "Arabic"). Falls back to `Intl.DisplayNames`, then `id`. | no       |
| `dir`        | The document direction while this language is active. Explicit, not guessed — `he` and `ur` exist.                   | yes      |
| `locale`     | BCP-47 locale for `Intl` and plural rules. Defaults to `id`.                                                         | no       |

`locale` is the one that surprises people: a bare `ar` formats Latin digits (`3`),
while `ar-EG` formats Arabic-Indic ones (`٣`). When the dictionary is read by Arabic
readers, pass `ar-EG`.

The generated module keeps the union literal, so the type of `id` is `'ar' | 'en'` and
`setLanguage('fr')` does not compile. Registering the provider also installs an app
initializer that loads the first dictionary before the first paint — `ready()` turns
true when that initial load has settled, which is the signal to gate skeletons on.

## Everyday use

The patterns a real app needs, with the smallest correct example for each.

### Translating text

Keys are dot paths into the JSON file: `{"booking": {"seats": "Seats"}}` becomes
`booking.seats`. Three ways to read one:

```html
<!-- template: the pipe -->
<p>{{ 'booking.seats' | rvTranslate: { count: seats } }}</p>
```

```ts
// component field: a signal that re-renders on a language switch
readonly title = this.i18n.t('app.title');
// params may be a function of signals — the text follows both language and count
readonly seats = this.i18n.t('booking.seats', () => ({ count: this.count() }));
```

```ts
// plain TypeScript
this.i18n.translate('app.save');
this.i18n.translate('app.title', 'Untitled'); // defaultValue: never reported as missing
this.i18n.translate({ en: 'Hello', ar: 'أهلاً' }); // inline map
```

`t()` is a `computed`, so it is the right tool for component fields. The pipe is impure
by necessity and re-runs on every change-detection pass: fine for a page, wasteful for
a thousand rows. A key that resolves nowhere renders as the key itself and is reported
— see [Missing keys](#missing-keys).

### Plurals that survive translation

"1 item / 2 items" looks like a single `if`:

```ts
const label = count === 1 ? `${count} item` : `${count} items`;
```

That line is already wrong in Arabic. English has two plural forms; Arabic has six, and
which one applies is decided by the number in a way English never trained you for:

| count | English category | Arabic category | Arabic text    |
| ----- | ---------------- | --------------- | -------------- |
| 0     | `other`          | `zero`          | سلتك فارغة     |
| 1     | `one`            | `one`           | لديك عنصر واحد |
| 2     | `other`          | `two`           | لديك عنصران    |
| 3     | `other`          | `few`           | لديك 3 عناصر   |
| 11    | `other`          | `many`          | لديك 11 عنصرًا |
| 100   | `other`          | `other`         | لديك 100 عنصر  |

The words around the number also change — gender, case, the shape of the noun — so
gluing `count + ' items'` together cannot produce a correct Arabic sentence.

ICU MessageFormat puts the decision inside the message:

```text
{count, plural,
  =0 {Your cart is empty}
  one {You have one item in your cart}
  other {You have # items in your cart}
}
```

- `count` is the parameter you pass: `translate('cart.items', { count: 3 })`.
- `plural` picks a branch from that number.
- `=0` matches the value **exactly**, in every language.
- `one` and `other` are plural **categories**, selected by `Intl.PluralRules(locale)`.
  English only ever selects `one` and `other`.
- `#` is the number, formatted for the locale — `٣` under `ar-EG`, `3` under `ar`.

The same message in Arabic names the categories Arabic actually has:

```text
{count, plural,
  =0 {سلتك فارغة}
  one {لديك عنصر واحد}
  two {لديك عنصران}
  few {لديك # عناصر}
  many {لديك # عنصرًا}
  other {لديك # عنصر}
}
```

`zero`, `one`, `two`, `few`, `many` and `other` are the six CLDR categories for Arabic.
They are not `if` branches you can reorder: the category is computed from the number and
the locale, so one message yields six Arabic forms and two English ones with no code
change. In Arabic, 3–10 select `few`, 11–99 select `many`, and 100 selects `other`.

Note the difference between `=0` and `zero`. `=0` is an exact-value rule that works
everywhere; `zero` is a category only some languages select — an English message with a
`zero {…}` branch never shows it, because English at 0 resolves to `other`. For an empty
state, use `=0`.

`select`, `selectordinal`, `offset:` and the number/date styles are in the
[ICU reference](#icu-messages).

### Switching the language

```ts
this.i18n.setLanguage('ar'); // flips now; the dictionary follows (default strategy)
await this.i18n.setLanguageAsync('ar'); // resolves once the dictionary is in place
this.i18n.toggle(); // flips the first two configured languages
```

`setLanguage()` is synchronous and obeys `switchStrategy`; `setLanguageAsync()` always
waits for the dictionary, which is why the toggle uses it — a failed load leaves the
previous language in place instead of an empty page.

Everything visual is a signal, so nothing needs wiring:

```ts
readonly language = this.i18n.currentLanguage; // Signal<'ar' | 'en'>
readonly direction = this.i18n.dir; // Signal<'rtl' | 'ltr'> — also written on <html dir>
readonly locale = this.i18n.locale; // Signal<string>
readonly ready = this.i18n.ready; // gate skeletons on this
```

Numbers and dates follow the same locale:

```ts
this.i18n.formatNumber(1234.5); // ar-EG → ١٬٢٣٤٫٥
this.i18n.formatDate(Date.now(), { dateStyle: 'long' });
```

The choice survives a reload in `localStorage` under `rivinia.i18n.language`, and is only
written after the user actually switches (`persist`). On a first visit,
`detectBrowser: true` matches `navigator.languages` (`ar-EG` → `ar`); a stored choice
always wins. All of it is configurable — [Configuration](#configuration).

### Where translations live

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

### Generating the language module

Writing the language list by hand is the one boilerplate this package still asked for.
`init` collects it once and writes the module plus one empty dictionary per language:

```bash
npx rivinia-i18n-keys init
# [rivinia/i18n] Language id (ar, en, ar-EG …): ar
#   Native name [العربية]:
#   Direction (ltr/rtl) [rtl]:
#   Another language? (Y/n): y
# [rivinia/i18n] Language id (ar, en, ar-EG …): en
#   Native name [English]:
#   Direction (ltr/rtl) [ltr]:
#   Another language? (y/N): n
# [rivinia/i18n] Default language — (1) ar  (2) en [1]:
```

That writes `src/app/i18n/languages.ts`:

```ts
// Generated by `npx rivinia-i18n-keys init`. Re-run the command to regenerate.
import { defineRiviniaI18n } from '@rivinia/i18n';

export const i18n = defineRiviniaI18n({
  defaultLanguage: 'ar',
  languages: [
    { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
    { id: 'en', nativeName: 'English', dir: 'ltr' },
  ],
});

/** The typed language manager — call inside an injection context. */
export const injectI18n = i18n.inject;
```

and `public/i18n/ar.json` / `public/i18n/en.json` (each `{}`; an existing dictionary is
kept untouched). The module keeps the `'ar' | 'en'` union, so the components stay short:

```ts
// src/app/app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { i18n } from './i18n/languages';

export const appConfig: ApplicationConfig = {
  providers: [i18n.provide()],
};
```

```ts
// any component — field initializer or constructor body
import { injectI18n } from './i18n/languages';

private readonly i18n = injectI18n();
```

`i18n.config` is the same object, so `i18n.config.languages` stays `'ar' | 'en'` wherever
it is imported.

`dir` is explicit rather than derived at runtime, so an Urdu or Hebrew dictionary cannot
silently render left-to-right. Ids, directions and duplicates are validated before
anything is written; `--languages ar:العربية:rtl,en:English:ltr` skips the questions for
CI, `--dry-run` prints the files, and a `languages.ts` that was not written by this
command is only replaced with `--force`.

### Typed keys

Every key is a plain `string` until you generate the declaration. One command turns the
dictionary into a union type, so a typo fails the build instead of reaching the screen:

```bash
npx rivinia-i18n-keys # public/i18n/en.json → src/i18n-keys.d.ts
```

Re-run it when keys change, or let CI run `--check`. The flags, the flattening rules and
`--parity` are in the [typed-keys reference](#typed-keys-reference).

### The language toggle

The second entry point ships a two-language switch:

```ts
import { RiviniaLanguageToggle } from '@rivinia/i18n/ui';
// <rv-language-toggle [manager]="i18n" label="Switch language" />
```

The button shows the language it switches **to**, carries `lang` and `dir` on its own
button, and works with the service (`[manager]`) or without it (`[languages]` +
`[current]` + `(languageChange)`). **Experimental in 0.7.1** — custom icons, trigger
templates, presentational mode, styling hooks and the accessibility contract are in the
[toggle reference](#toggle-reference).

### The language select

The toggle flips between exactly two languages. For `ar`, `en`, `de`, … use the
third entry point, which composes `@rivinia/select` into a list:

```bash
npm install @rivinia/select
```

```ts
import { RiviniaLanguageSelect } from '@rivinia/i18n/select';
// <rv-language-select [manager]="i18n" label="Language" />
```

Every language becomes one row, in the order declared, with its native name. Each row
name carries `lang` and `dir`, so `العربية` is pronounced as Arabic even while the page
runs `en`. The closed trigger is `rv-select`'s own text and carries no `lang`, so the
marking starts at the panel. Managed mode (`[manager]`) calls `setLanguageAsync` and emits
`(languageChange)` only after the switch is confirmed; presentational mode
(`[languages]` + `[current]`) emits synchronously. `searchable` adds the filter box for
long lists, and `variant="premium"` applies the select's premium skin.

`@rivinia/select` is an **optional peer**: the core and `/ui` entry points never
import it, so an application that does not import `@rivinia/i18n/select` does not
install it and its bundle does not grow. The full contract is in the
[select reference](#select-reference).

### Server-side rendering

The default loader works on the server: `REQUEST` plus `<base href>` produce an absolute
URL, and the rendered dictionaries travel in `TransferState`, so the client does not
fetch them twice. A custom host has to provide `REQUEST`, serialize the app-level
`TransferState` and use the CSR shell as the template — all three, with the reasons, are
in the [SSR reference](#ssr-reference).

## Reference

The complete surface. Ordered by API, not by learning path.

### Configuration

Every option, its default and what it does.

#### The options that change behaviour

- **`loader`** — where dictionaries come from. The default `jsonLoader()` reads
  `/i18n/{language}.json`. Use a path for an `assets/` layout, `httpLoader` for an API,
  `customLoader` for in-memory data. `httpLoader`/`remoteLoader` are lazy chunks; the
  default stays in the main bundle because it runs before first paint.
- **`switchStrategy`** — `'instant'` (default) flips the id immediately and the
  dictionary follows; `'preload-first'` waits for the dictionary and keeps the old
  language when loading fails. Choose `'preload-first'` when a flash of raw keys is worse
  than a slower switch.
- **`preload`** — `true` (default) loads the initial language during provider setup, and
  SSR waits for it. `false` for apps that ship inline dictionaries or load by hand with
  `loadTranslations()`.
- **`fallbackLanguage`** — the second dictionary for keys missing from the current one.
  It loads silently and its text is rendered with its own locale.
- **`detectBrowser`** — `true` matches `navigator.languages` on the first visit; a stored
  preference always wins.
- **`persist` / `storageStrategy`** — whether and where an explicit switch is remembered.
  `'cookie'` also works on the server, so the first paint matches the user's choice.
- **`translations`** — inline seeds painted before any network load; a loader response
  still wins.

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

The config is validated once at construction: `languages` must be a non-empty array with a
non-empty, **unique** `id` per entry, and `defaultLanguage` / `fallbackLanguage` (when
provided) must name one of those ids. Anything else throws a `[rivinia/i18n] …` error at
bootstrap instead of degrading into an undefined current language.

A repeated id written inline (`languages: [AR, EN, AR]`) is also a **compile error**:
`provideRiviniaI18n` and `defineRiviniaI18n` require the property `duplicateLanguageId`,
which only the type checker sees. The check reads the array literal, so it does not fire
when the union is supplied explicitly (`provideRiviniaI18n<'ar' | 'en'>(…)`) or the list is
hoisted into a variable — both forms still throw the runtime error above.

### Translation API

#### Signals

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

#### Methods

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

`RvTranslatePipe` (`rvTranslate`) delegates to `translate()`. It is impure by necessity —
the service reads signals on every call — so prefer `t()` or component code for long
lists.

### ICU messages

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

### Missing keys

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

### Missing parameters

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

### Fallback language

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

### Load failures

A dictionary that fails to load leaves **every** key unresolved, so the page renders raw
key names. Initialization never rejects: the failure lands on `loadingState` and
`loadingError`, and with the default `switchStrategy: 'instant'` the language has already
flipped — use `'preload-first'` if you want a failed load to abort the switch instead.

```ts
provideRiviniaI18n({
  defaultLanguage: 'ar',
  languages: […],
  onLoadError: (language, error) => report(error, { language }),
});
```

Without `onLoadError`, a `console.error` is logged **once per language per session** in
dev mode, so a retry loop cannot flood the console. Set `warnOnLoadError: false` to
silence it, or `true` to keep it in production. A failing fallback dictionary is reported
the same way but never flips `loadingState` (see [Fallback language](#fallback-language)).

### Reloading a dictionary

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

### `t()` signals

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

### Typed keys reference

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

### Toggle reference

The `@rivinia/i18n/ui` entry point ships a two-language toggle and the template that
replaces its default label:

```ts
import { RiviniaLanguageToggle, RiviniaLanguageTrigger } from '@rivinia/i18n/ui';
```

**Every export of this entry point is Experimental in 0.7.1** (D68):
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

#### Managed, with `RiviniaI18n`

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

#### Presentational, without a manager

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

#### The icon

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

#### With a trigger template

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

#### Inputs and output

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

#### Two languages exactly

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

#### Busy, failure and the emission contract

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

#### SSR and the language name

The component renders the same markup on the server and touches no browser global. The
name resolves as `nativeName` → Intl.DisplayNames → the raw id, cached per
(locale, id). Supply `nativeName` when the server's CLDR data might differ from the
browser's: it short-circuits the lookup, so the server HTML and the first client render
cannot disagree.

#### Styling

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

#### Recipes: inside a menu or beside a select (Experimental, untested)

Neither recipe is covered by this release's test matrix; the select in particular is the
supported shape for three or more languages, not something the toggle turns into.

- **Inside a menu.** The toggle is a plain `<button>` in normal flow, so it can sit in a
  panel that already exists — `@rivinia/menu/ui` ships the menu primitives. The menu's
  focus trap and keyboard model with this control inside it have **not** been tested.
- **Beside a native `<select>`.** For three or more languages, prefer the ready-made
  [language select](#select-reference) and leave the toggle out. If you need a native
  element instead, bind it to the service:

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

#### No flags

The library ships one neutral mark — a globe — and no flag imagery. Flag icons for
languages are politically ambiguous and the W3C i18n guidance recommends against them.
A globe does not name a language it cannot represent, and it says "switch language"
without saying which. An app that wants its own mark passes `[icon]`, or draws one
inside `rvLanguageTrigger`; either way the accessible name is unaffected.

### Select reference

The `@rivinia/i18n/select` entry point ships the multi-language picker and the pure
mapper behind it:

```ts
import { RiviniaLanguageSelect, languageSelectOptions } from '@rivinia/i18n/select';
```

**Every export of this entry point is Experimental in 0.8.0**:
`RiviniaLanguageSelect`, `languageSelectOptions`, `LanguageSelectOption`, and the
re-exported `LanguageLike` / `RiviniaLanguageManager`. The select is a composition over
`@rivinia/select/ui`; its public surface may follow that package's pre-1.0 changes.

#### Managed, with `RiviniaI18n`

```ts
import { Component, inject } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';
import { RiviniaLanguageSelect } from '@rivinia/i18n/select';

@Component({
  selector: 'app-header',
  imports: [RiviniaLanguageSelect],
  template: `<rv-language-select
    [manager]="i18n"
    [label]="label()"
    [searchable]="true"
    (languageChange)="onLanguage($event)"
  />`,
})
export class Header {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en' | 'de'>);
  readonly label = this.i18n.t('common.language');
}
```

`RiviniaI18n` satisfies `RiviniaLanguageManager` structurally, so pass the service
directly. Managed state wins: `[languages]`, `[current]` and `[busy]` are ignored while
`manager` is set. The trigger shows the current language's native name; the panel lists
every language in declaration order.

`(languageChange)` fires **after** `setLanguageAsync` confirms the id, matching the
toggle's contract. A manager that leaves the language unchanged emits nothing and the
trigger returns to the real current language. While the manager reports
`loadingState() === 'loading'`, the control is disabled, so a second pick cannot race the
first.

#### Presentational, without a manager

```html
<rv-language-select
  [languages]="languages"
  [current]="language()"
  [busy]="switching()"
  label="Language"
  (languageChange)="language.set($event)"
/>
```

With no manager, `languages` + `current` describe the state and `languageChange` is the
only side effect. Presentational mode is synchronous; the picked row stays selected until
`[current]` changes, then the trigger follows the new value.

#### Inputs and output

| Input               | Type                      | Default            | Meaning                                                                           |
| ------------------- | ------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| `manager`           | `RiviniaLanguageManager`  | —                  | Managed mode; wins over `languages` / `current` / `busy`.                         |
| `languages`         | `readonly LanguageLike[]` | `[]`               | Presentational language list.                                                     |
| `current`           | `string`                  | —                  | Presentational current id.                                                        |
| `label`             | `string \| null`          | `null`             | Visible caption; also the trigger's accessible name and the panel's default name. |
| `ariaLabel`         | `string \| null`          | `null`             | Accessible name when there is no visible caption.                                 |
| `popupLabel`        | `string \| null`          | `null`             | Explicit panel name; defaults to `label`, then `ariaLabel`.                       |
| `placeholder`       | `string`                  | `'Select…'`        | Trigger text when nothing is selected.                                            |
| `searchable`        | `boolean`                 | `false`            | Show the filter box.                                                              |
| `searchLabel`       | `string`                  | `'Search options'` | Filter box accessible name.                                                       |
| `searchPlaceholder` | `string`                  | `'Search…'`        | Filter box placeholder.                                                           |
| `emptyLabel`        | `string`                  | `'No results'`     | Shown when the filter matches nothing.                                            |
| `variant`           | `'simple' \| 'premium'`   | `'simple'`         | Passed to `rv-select`.                                                            |
| `disabled`          | `boolean`                 | `false`            | Blocks opening and picking.                                                       |
| `busy`              | `boolean`                 | `false`            | Presentational loading state.                                                     |

| Output           | Payload  | When                                                                      |
| ---------------- | -------- | ------------------------------------------------------------------------- |
| `languageChange` | `string` | After a managed switch confirms, or synchronously in presentational mode. |

#### Sizing

The host is `inline-block` with a `min-inline-size: 14rem` floor. `rv-select` cannot
supply it: its own `min-width: min(14rem, 100%)` resolves that `100%` to `0` inside a
shrink-to-fit host, so without the floor the trigger, the panel and every row collapse to
one character per line (`English` becomes `En / gli / sh`). Widen it with ordinary CSS —
`rv-language-select { inline-size: 100% }` in a form row — and the panel follows the
trigger within `rv-select`'s own limits. The `i18n-e2e` suite measures this in Chromium
and Firefox.

#### Rows and accessibility

Each row carries `lang` and `dir` on the visible name, so a screen reader pronounces
`العربية` as Arabic even when the page runs `en`, and the name lays out in its own
direction. The closed trigger is `rv-select`'s value span and has no `lang`/`dir` hook of
its own, so it inherits the page's language — the marking lives in the panel. The row's
accessible name is its visible text: the native name, plus the
language id as a hint when the two differ. The id is not repeated when the label already
is the id.

`languageSelectOptions(languages)` is the pure mapper used by the component. It preserves
order, resolves the name with the same rule as `/ui` (`nativeName` → `Intl.DisplayNames` →
id), and returns:

```ts
interface LanguageSelectOption extends RiviniaSelectOption {
  readonly lang: string;
  readonly dir?: 'ltr' | 'rtl';
}
```

Use it directly when you want `rv-select` with your own trigger or row:

```ts
import { languageSelectOptions } from '@rivinia/i18n/select';

readonly options = computed(() => languageSelectOptions(this.i18n.languages()));
```

#### Optional peer and bundle isolation

`@rivinia/select` is declared as an **optional peer** of `@rivinia/i18n`:

```json
{
  "peerDependencies": { "@rivinia/select": "^0.7.0" },
  "peerDependenciesMeta": { "@rivinia/select": { "optional": true } }
}
```

The core and `/ui` entry points never import it. Only
`fesm2022/rivinia-i18n-select.mjs` contains `@rivinia/select/ui`, so an application that
does not import `@rivinia/i18n/select` neither installs the peer nor pays for its code.
The unit surface spec checks the sources for this; the release gates then inspect the
built FESM.

### SSR reference

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

### Imports

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

### API stability

Every export is classified so the 1.0 freeze is predictable. **Internal** symbols
exist only so the package's own tests can import them; they may move to an
`@rivinia/i18n/internal` entry point (or disappear) before 1.0.

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

### Migration 0.5.0 to 0.6.0

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

### Migration 0.3.3 to 0.4.0

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

### License

MIT.

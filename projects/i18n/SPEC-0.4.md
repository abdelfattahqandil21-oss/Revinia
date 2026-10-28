# @rivinia/i18n 0.4.0 — production hardening

Status: **proposed** (2026-10-28). Nothing in this document is implemented yet.
Baseline: Angular 22.2.3 (D62), package source at `projects/i18n`, published
`0.3.3`, local `0.3.4` (unpublished, the D50 layout move).

## 1. Why this release exists

`@rivinia/i18n` already has the shape competitors do not: SSR state transfer,
zero runtime dependencies, ICU plurals with the six Arabic forms, and lazy
loader chunks. Three defects keep it from being a production default:

1. **The default loader is broken on the server.** `jsonLoader()` fetches
   `i18n/{lang}.json` — a relative URL. Node's `fetch` throws
   `TypeError: Failed to parse URL from i18n/en.json` (measured 2026-10-28;
   `docs/AUDIT-2026-10.md:314` recorded the same failure earlier). The app
   initializer therefore renders raw keys under SSR — while SSR support is the
   library's strongest differentiator.
2. **No fallback language.** A key missing in `ar` returns the key, not the
   English text; inline `Translation` maps use a different rule
   (`Object.values()[0]`).
3. **No observability.** A missing key is silent; there is no handler, no
   report, and no way to invalidate a dictionary after a deploy.

The ICU subset is also narrower than the standard (`selectordinal`, `offset`,
`number`, `date`), and there is no typed-key path.

## 2. Scope

In scope (this release, in this order):

| # | Item | Kind |
|---|------|------|
| 1 | SSR-safe URL resolution (`LoaderContext`) | fix |
| 2 | `fallbackLanguage` | feature |
| 3 | Missing-key handler + `missingKeys` signal | feature |
| 4 | `reload(language?)` + stale-response guard | feature |
| 5 | ICU: `selectordinal`, `offset:`, `{n, number}`, `{d, date}` | feature |
| 6 | `t()` returning `Signal<string>` | feature |
| 7 | Typed keys (codegen CLI) | feature |

Out of scope, explicitly:

- `@rivinia/i18n/ui` (the switcher) — separate entry point, later.
- Namespaces / scopes — planned for 0.5.0 because it changes `LoaderDescriptor`.
- Per-language `loadingState`, `AbortController`, MF2, a Hijri/alternative
  calendar, and time-only formatting.
- Firefox/WebKit SSR proof; screen-reader proof.

Version: **0.4.0** (pre-1.0: minor = feature/breaking). 0.3.4 is unpublished,
so its layout change ships inside 0.4.0 and 0.3.4 is skipped on the registry.

## 3. API changes

All changes are additive except where marked. No symbol is removed.

### 3.1 Loader context (item 1)

```ts
export interface LoaderContext {
  /** Absolute base URL for relative dictionary paths. Mirrors `document.baseURI`. */
  readonly baseUrl: string;
  /** True when the app renders on the server. */
  readonly isServer: boolean;
}

export interface TranslationLoader<L extends string = string> {
  load(language: L, context?: LoaderContext): Promise<Record<string, unknown>>;
}

export interface LoaderDescriptor<L extends string = string> {
  resolve(context?: LoaderContext): Promise<TranslationLoader<L>>;
}
```

- The service builds the context **once** (it cannot change for an app):
  - server (`REQUEST` present): `baseUrl` = the document's `<base href>`
    resolved against `REQUEST.url`; without a `<base>` element,
    `new URL(request.url).origin + '/'`.
  - browser: `baseUrl` = `document.baseURI`.
- The context is passed to `descriptor.resolve(context)` and to
  `loader.load(language, context)`.
- `customLoader(fn)` forwards the context as `fn`'s second argument.
- The three built-in loaders resolve a **relative** URL against
  `context.baseUrl` **only when `context.isServer`**. In the browser the URL is
  passed to `fetch` unchanged: the browser already resolves it against
  `document.baseURI`, and the string a consumer's `fetch` mock sees does not
  change. Absolute URLs are never rewritten.
- Exposed as `readonly loaderContext: LoaderContext` on the service.
- SSR failure policy: an unparsable `REQUEST.url` falls back to
  `document.baseURI`; a missing base never throws.

Measured baseline (2026-10-28): `fetch('i18n/en.json')` on Node 24 →
`TypeError: Failed to parse URL from i18n/en.json`. After the change the
server requests `http://<host><base>/i18n/en.json`.

### 3.2 Fallback language (item 2)

```ts
readonly fallbackLanguage?: T;
```

Lookup order for `translate(key)`:

1. current dictionary (rendered with the **current** locale);
2. fallback dictionary (rendered with the **fallback** locale);
3. `defaultValue` (current locale);
4. the key itself.

Rule 2's locale is deliberate: an English plural template borrowed by an
Arabic UI must use English plural rules (2 categories), not Arabic (6). A test
pins this with `count: 2` (`en` → `other`, `ar` → `two`).

- `fallbackLanguage` must be one of `languages`, validated at construction
  (same policy as `defaultLanguage`).
- When configured and different from the current language, the fallback
  dictionary is loaded during `initialize()` **in parallel and silently**: a
  fallback failure reaches `onLoadError` but never sets `loadingState` to
  `'error'` (the current dictionary is what the UI needs).
- `preload: false` disables automatic loading; the fallback then works from
  cache / inline dictionaries only (documented).
- `setLanguage` ensures the fallback dictionary is loaded.
- TransferState carries the fallback dictionary too, and the client consumes
  it on hydration (no second fetch).
- Inline `Translation<L>` objects follow the same chain:
  `translations[current] ?? translations[fallback] ?? Object.values()[0]`
  (the last step preserves the existing legacy behavior).
- Fallback text is **not** cached into the current dictionary; switching
  languages re-evaluates.

### 3.3 Missing keys (item 3)

```ts
export interface MissingKeyEvent<T extends string = string> {
  readonly key: string;
  readonly language: T;
  readonly fallbackLanguage?: T;
}

readonly onMissingKey?: (event: MissingKeyEvent<T>) => void;
readonly warnOnMissingKey?: boolean; // default: isDevMode() && !onMissingKey
```

- A key is **missing** only when it is absent from the current dictionary,
  absent from the fallback dictionary, and no `defaultValue` was supplied.
  An explicit `defaultValue` is a declared inline fallback, not a defect.
- Reported once per key per session (a `Set`), regardless of how many times
  the template renders.
- Only reported once the current language actually has a dictionary (loaded,
  transferred, or inline). Before that, every key would be a false positive.
- `missingKeys: Signal<readonly string[]>` — insertion order, deduplicated.
  Updated in a microtask so `t()` can stay a pure `computed` (Angular forbids
  signal writes inside `computed`: "Writing to signals is not allowed in a
  `computed`").
- `clearMissingKeys(): void` resets the report; `reload()` does **not** clear
  it (separate concerns).
- The warning goes through `console.warn` with the `[rivinia/i18n]` prefix and
  fires once per key.

### 3.4 `reload()` (item 4)

```ts
reload(language?: L): Promise<boolean>;
```

- `reload()` — invalidate every cached dictionary, then reload the current
  language and the fallback (if configured). Resolves `true` when the current
  language loaded.
- `reload(lang)` — invalidate and reload one language; if it is the current
  one it is applied, otherwise it is only re-cached.
- Never rejects. Failures land on `loadingState` / `loadingError` /
  `onLoadError`, exactly like `loadTranslations`.
- **Stale-response guard:** each language carries a generation counter,
  incremented by `reload`. A load captures the generation before awaiting and
  discards its result if the generation moved (cache, TransferState and
  signals untouched). The `finally` block only clears the in-flight entry it
  owns. Tested with gated promises, not by timing.
- `AbortController` is not used: it would change the loader contract. The
  generation guard is sufficient for correctness (the stale request still
  runs, its result is dropped).

### 3.5 ICU (item 5)

`formatIcu(template, params, locale)` keeps its signature. `TranslateParams`
gains `Date`:

```ts
export type TranslateParams = Record<string, string | number | boolean | Date>;
```

Added, per ICU MessageFormat (MF1):

- `{n, plural, offset:1 …}` — offset semantics taken from the ICU4J
  `PluralFormat` javadoc (checked 2026-10-28):
  - explicit `=N` matches the **raw** argument value;
  - the plural category is selected with `PluralRules.select(value - offset)`;
  - `#` renders `value - offset` formatted with
    `Intl.NumberFormat(locale)`.
- `{n, selectordinal, …}` — same grammar as `plural`, categories from
  `Intl.PluralRules(locale, { type: 'ordinal' })`. `offset:` and `#` apply.
- `{n, number}` → `Intl.NumberFormat(locale)`.
  - styles: `percent`, `integer` (`maximumFractionDigits: 0`),
    `::currency/XXX` (ISO code from the skeleton). Any other style is
    unsupported and returns the raw segment.
- `{d, date}` → `Intl.DateTimeFormat(locale)` (date only).
  - styles: `short` / `medium` / `long` / `full` → `dateStyle`.
  - value: a `Date` or epoch milliseconds. Anything else is unsupported.
- Unsupported/malformed constructs keep the existing no-throw rule: the raw
  `{…}` segment is returned as-is.
- Plain `{name}` interpolation keeps `String(value)` (documented deviation
  from ICU's default number format; use `{n, number}` for formatting).
- `Intl` instances (plural rules, number, date) are cached in a bounded
  module-level map keyed by `kind|locale|style` (the parser runs per render).
- `#` formatting is a behavior change for locales whose default numbering
  system is not `latn` (e.g. `ar-EG`: `#` → `٣`). For `en` and `ar` the
  existing outputs are unchanged (verified: `Intl.NumberFormat('ar')` uses
  Latin digits).

### 3.6 `t()` (item 6)

```ts
t(key: string): Signal<string>;
t(key: string, params: TranslateParams | (() => TranslateParams)): Signal<string>;
t(key: string, defaultValue: string, params?: TranslateParams | (() => TranslateParams)): Signal<string>;
```

- Returns a `computed` over the same resolution chain as `translate()`.
- A function `params` is invoked inside the computed, so signals it reads are
  tracked (`t('items', () => ({ count: this.count() }))`).
- No signal writes during computation; missing keys are recorded in a
  microtask (see 3.3).
- Intended for component fields (`readonly title = i18n.t('home.title')`), not
  for calling `t()` from a template expression on every change detection.
- `RTranslatePipe` stays impure (it must re-evaluate on a language switch) and
  keeps its existing overloads.

### 3.7 Typed keys (item 7)

Library side:

```ts
export interface RiviniaI18nKeyRegistry {} // augmented by generated code
export type RegisteredI18nKey =
  RiviniaI18nKeyRegistry extends { keys: infer K extends string } ? K : string;
```

`translate()`, `t()` and `RTranslatePipe.transform()` take
`RegisteredI18nKey`. Without augmentation it resolves to `string`, so nothing
breaks. Dynamic keys use an explicit assertion:
``i18n.translate(`status.${code}` as RegisteredI18nKey)``.

CLI (ships in the tarball, declared as `bin`):

```sh
npx rivinia-i18n-keys --source public/i18n/en.json --out src/i18n-keys.d.ts
npx rivinia-i18n-keys --check     # exit 1 when the file is stale (CI)
```

- Flattens nested objects to dot paths, keeps string leaves only, warns about
  non-string leaves, sorts keys for stable diffs, escapes quotes.
- Output:
  ```ts
  // Generated by @rivinia/i18n. Do not edit.
  import '@rivinia/i18n';

  declare module '@rivinia/i18n' {
    interface RiviniaI18nKeyRegistry {
      readonly keys: 'app.save' | 'app.title';
    }
  }
  ```
- `--check` compares the generated text with the file and exits 1 with a
  message when they differ.
- Defaults: `--source public/i18n/en.json`, `--out src/i18n-keys.d.ts`.
- No dependencies, ESM `.mjs`, shebang, `chmod +x`.
- Because module augmentation is program-wide, the type-level test compiles a
  **separate fixture program** with `tsc --noEmit` (an in-suite augmentation
  would affect every other spec).

## 4. Test matrix (strict, hand-derived)

Every expectation below is written from the specification, not from the
implementation. Existing 52 tests stay green; new cases are added per item.

### 4.1 Loader context (unit)

| Case | Input | Expected |
|---|---|---|
| server, base `/` | request `http://h:4000/ar/page`, `<base href="/">` | `baseUrl = http://h:4000/` |
| server, sub-path base | `<base href="/app/">` | `http://h:4000/app/` |
| server, relative base | `<base href="./">`, request `/ar/page` | `http://h:4000/ar/` |
| server, absolute base | `<base href="https://cdn.test/i18n/">` | unchanged |
| server, no base element | request `http://h:4000/x` | `http://h:4000/` |
| browser | no `REQUEST` | `isServer=false`, `baseUrl=document.baseURI` |
| invalid request URL | `REQUEST.url = 'not a url'` | falls back to `document.baseURI`, no throw |
| json loader, server | `{isServer:true, baseUrl:'http://h/app/'}` | `http://h/app/i18n/ar.json` |
| json loader, server, absolute path | path `https://cdn.test/i18n` | `https://cdn.test/i18n/ar.json` |
| json loader, browser | `{isServer:false}` | `i18n/ar.json` (unchanged) |
| http/remote loader, server | relative endpoint | absolute against `baseUrl` |
| custom loader | any | receives the context as arg 2 |
| service | TestBed + fake `REQUEST` | `resolve()` and `load()` receive the same context |

### 4.2 Fallback (unit)

- current → fallback → defaultValue → key, one case each.
- fallback renders with the fallback locale: `en` fallback, `ar-EG` current,
  `{count, plural, one {one} two {two} other {other}}`, `count: 2` → `other`.
- fallback loaded once, in parallel, during `initialize()`; loader sees
  `['ar','en']` exactly once each.
- `fallbackLanguage === defaultLanguage` → no duplicate load.
- unknown `fallbackLanguage` → constructor throws.
- inline dictionaries work without a loader.
- TransferState: a transferred fallback dictionary is consumed, no fetch.
- `setLanguage('ar')` loads the fallback when it was never loaded.
- after `reload('en')`, a changed fallback value is visible.

### 4.3 Missing keys (unit)

- absent everywhere, no defaultValue → recorded once, `onMissingKey` once.
- two renders of the same key → still once.
- present in fallback → not recorded.
- `defaultValue` supplied → not recorded.
- before the dictionary is available → not recorded (load failure, no cache).
- `missingKeys()` updates after a microtask; `clearMissingKeys()` empties it.
- `warnOnMissingKey: true` → `console.warn` once per key, with the key.
- `t()` on a missing key: no NG0600, recorded after flush.

### 4.4 `reload()` (unit)

- `reload()` refetches the current language and applies the new dictionary.
- `reload('en')` refetches `en`, caches it, leaves `ar` visible.
- two `reload()` calls → two fetches (the cache was invalidated).
- gated load + reload → the stale response never reaches cache or signals.
- reload while switching → only the current language is applied.
- loader failure → `false`, `loadingState='error'`, no rejection.
- reload does not clear `missingKeys`.

### 4.5 ICU (unit, table-driven)

- `selectordinal` en: 1→one, 2→two, 3→few, 4→other, 11→other, 21→one,
  22→two, 23→few.
- `selectordinal` ar: all → other.
- `offset:1`: n=0→`=0`, n=1→`=1`, n=2→`#`=1 and category `one`
  (`2-1=1`), n=3→`#`=2.
- `#` with `en`: 1234.5 → `1,234.5`; with `ar-EG`: 3 → `٣`.
- `{n, number}` en 1234.5 → `1,234.5`; ar-EG → `١٬٢٣٤٫٥`.
- `{n, number, percent}` 0.25 → `25%` (en), `٢٥٪؜` (ar-EG).
- `{n, number, integer}` 12.6 → `13`.
- `{n, number, ::currency/USD}` 12.5 → `$12.50` (en).
- `{d, date}` 2026-10-25 (en) → `10/25/2026`; `short` → `10/25/26`;
  `long` → `October 25, 2026`; ar-EG `short` → `٢٥‏/١٠‏/٢٠٢٦`.
- unknown style, non-numeric number, string date → raw segment.
- nesting: `selectordinal` inside `plural`, `#` scoped to the nearest plural.
- all existing malformed cases still return the raw segment.

### 4.6 `t()` (unit)

- returns a signal; value changes after `setLanguage`.
- params function tracks a signal (write → recompute).
- `defaultValue` overload.
- missing key via `t()` → recorded after flush, no throw.

### 4.7 Typed keys (unit + tsc)

- generator: nested JSON → sorted dot paths; quotes escaped; non-string leaf
  skipped with a warning; empty object → empty union (valid file).
- `--check`: fresh file → 0, stale → 1, missing source → 1 with a message.
- fixture program: `translate('app.title')` compiles; `translate('app.titel')`
  fails (`@ts-expect-error` in the fixture, compiled by a separate `tsc`).

### 4.8 Browser e2e (Chromium system + Playwright Firefox + bundled Chromium)

App: `projects/i18n-e2e`, built from the packed package (public entry only),
`public/i18n/{ar,en}.json`.

1. first load: `<html lang="ar" dir="rtl">`, Arabic copy, no raw keys.
2. switch to `en`: copy, `dir="ltr"`, `lang="en"`, persisted across reload.
3. ICU: Arabic 0/1/2/3/11/100, English ordinals 1st/2nd/3rd/4th, formatted
   numbers/dates.
4. fallback: a key present only in `en` renders English while `ar` is active;
   a key in neither renders the key and appears in the missing-key panel.
5. `t()` signal updates on switch.
6. zero `console.error` / `pageerror`.

### 4.9 SSR smoke (separate from the browser suite)

`ng build i18n-e2e` with `server`, then run the generated Node server and
request `/`:

- the response HTML contains the Arabic hero text;
- it contains no `home.` key and no `[object Object]`;
- the server log shows no fetch error;
- hydration in Chromium produces zero console errors and the same text.

## 5. Verification gates

1. `ng test i18n --no-watch` — all suites, exact counts reported.
2. `ng build i18n` — both entry points (one entry point today).
3. `npm pack` inspection: `exports`, `types`, `bin`, `sideEffects`, peers,
   file list, and a grep of the dist FESM for runtime imports beyond
   `@angular/core` (no `tslib`).
4. Tarball installed into a clean consumer app; production build succeeds;
   the CLI runs from `node_modules/.bin`.
5. Playwright: Chrome (system) + Firefox (Playwright) + Chromium (bundled).
   WebKit and system Firefox are **not** claimed (they do not launch here).
6. SSR smoke as in 4.9.
7. Bundle sizes recorded before/after (raw + gzip).

## 6. Open questions

None blocking. Decided by default, reversible before implementation:

- `warnOnMissingKey` defaults to `isDevMode() && !onMissingKey`.
- `#` switches to `Intl.NumberFormat` (ICU-correct; `en`/`ar` outputs
  unchanged).
- The CLI is an ESM `.mjs` with no dependencies, tested by spawning `node`.

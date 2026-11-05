## 2026-10-28 — D63: `@rivinia/i18n` 0.4.0 — the production-hardening set

- Context: 0.3.3 is live and works in a browser, but it has seven gaps that a
  production app hits: the default loader fetched a RELATIVE url that Node's
  `fetch` rejects, so SSR rendered raw keys; no fallback language; no way to
  see which keys are untranslated; no way to refresh a dictionary without a
  page reload; an ICU subset that lacked `selectordinal`/`offset:`/number and
  date formatting; `t()` returning a `string` instead of a signal; and no
  compile-time protection against a key typo. The user asked for all seven,
  with strict business-logic unit tests and a cross-browser e2e pass, and
  deferred the `ui` (switcher) entry point.

- **SSR.** Loaders receive a `LoaderContext { baseUrl, isServer }` built from
  `REQUEST` + `<base href>` on the server and `document.baseURI` in the
  browser; the built-in loaders absolutize ONLY when `isServer`, so a browser
  keeps the same relative fetch it always made. `isServer` means "there is a
  server request context", not "the platform is server" — that is what makes a
  relative url fetchable. A custom SSR host must provide `REQUEST`; without it
  the library cannot know the origin, and that is documented rather than
  guessed from a global.
- **Fallback language.** Lookup is current → fallback → `defaultValue` → key.
  The fallback text is rendered with the FALLBACK locale's plural rules: an
  English plural template borrowed by an Arabic UI must keep English's two
  categories, not Arabic's six. The fallback dictionary loads in parallel and
  SILENTLY (it never drives `loadingState`) and is transferred to the client.
- **Missing keys.** A key is missing only when it is absent from the current
  dictionary, absent from the fallback, and no `defaultValue` was given — an
  explicit `defaultValue` is a declared inline fallback, not a defect. Reported
  once per key per session, and only once the current language actually HAS a
  dictionary, so a slow load cannot produce false positives. `missingKeys` is
  written from a microtask, because Angular forbids a signal write inside a
  `computed` (NG0600) and `t()` must stay a pure `computed`.
- **`reload(language?)`.** Stale-while-revalidate with a per-language
  generation counter: the visible dictionary stays on screen until the fresh
  one arrives, and a response that was in flight when `reload()` ran is
  discarded instead of overwriting the newer one. It never rejects; failures
  land on `loadingState` / `loadingError` / `onLoadError`.
- **ICU.** Added `selectordinal`, `offset:`, `{n, number}` (`percent`,
  `integer`, `::currency/XXX`), `{d, date}` (`short|medium|long|full`) and
  `Date` in `TranslateParams`. `offset:` follows ICU4J `PluralFormat`: an
  explicit `=N` matches the RAW value, the category is selected with
  `value - offset`, and `#` renders `value - offset` in the locale's digits.
- **`t()` returns `Signal<string>`.** A function `params` is invoked inside the
  computation, so the signals it reads are tracked and a counter change
  re-renders the text without a language switch.
- **Typed keys.** `RiviniaI18nKeyRegistry` is an empty augmentable interface, so
  `RegisteredI18nKey` resolves to `string` and nothing breaks by default; the
  shipped `rivinia-i18n-keys` CLI generates the `.d.ts` that narrows it, with
  `--check` for CI. A genuinely dynamic key is asserted explicitly
  (`as RegisteredI18nKey`), which keeps the escape hatch visible in review.

- **One behaviour change:** `#` inside a plural is now formatted with
  `Intl.NumberFormat(locale)`, so `ar-EG` renders `٣` where it rendered `3`.
  `en` and `ar` are unchanged. The second: an unresolved key warns once per
  session in dev mode (`warnOnMissingKey` / `onMissingKey` control it).

### What only a real build could find (five, all measured)

1. **Domino does not implement `baseURI` — the property read THROWS**
   (`NotYetImplemented`). `createLoaderContext` read it unguarded in a field
   initializer, so constructing the service threw before the first byte and
   the entire server render failed. No browser test could see it: jsdom
   implements `baseURI`. Fixed with a guard + `/` fallback (`c7b5cf1`), proven
   by two specs that simulate the throwing property; both fail without the
   guard (negative control run).
2. **`renderApplication` requires an explicit `allowedHosts`** (NG05706).
   There is no implicit default, and an open list would turn the host into a
   request-forgery relay, so the proof host names its own hosts.
3. **The platform injector is not the app injector.** `renderApplication`
   serializes the PLATFORM `TransferState`, but `bootstrapApplication` gives the
   app its own root injector, so the dictionaries the service loaded landed in a
   different instance and were silently dropped — the client refetched both.
   The app injector now registers `BEFORE_APP_SERIALIZED` itself.
   `provideServerRendering()` also works, but registering it TWICE (platform +
   app) emits two scripts with the same id and `getElementById` finds the empty
   one first — measured, not reasoned.
4. **`outputMode: 'server'` forces prerendering**, so `browser/index.html`
   already contains a rendered app AND its own `ng-state` script. Serving that
   file as the SSR template produced two `ng-state` scripts and the client read
   the prerendered one, which has no dictionaries. The host serves
   `browser/index.csr.html`, the clean shell.
5. **The clean CSR shell carries no `ng-event-dispatch-contract` script**, so a
   click that lands before hydration is dropped instead of replayed. The smoke
   test waits for a real hydration marker (`afterNextRender` sets
   `html[data-hydrated]`) and polls for the rendered text; a fixed sleep made a
   working app look broken (measured both ways).

### Verified

- **153/153 unit tests in 11 files**; `ng build i18n`.
- **39/39 Playwright** (12 scenarios × chromium + system Chrome 156 +
  Playwright Firefox 157) against the **CSR production build**, each test
  asserting zero console errors so a failed dictionary fetch cannot pass.
  Negative control: removing `fallbackLanguage` fails both fallback scenarios.
- **16/16 SSR checks** against a real `node:http` + `renderApplication` host:
  Arabic HTML, `lang`/`dir`, all six plural forms, no raw key, no
  `[object Object]`, transfer payload present, no server fetch failure, no
  render error, hydration keeps the text, no client dictionary refetch, and the
  hydrated app switches language and flips `dir`.
- **Tarball** `pack/rivinia-i18n-0.4.0.tgz`: 17 files, 51,911 bytes; `exports`
  `.` + `./package.json` only; peers `@angular/core` + `@angular-devkit/schematics`
  `^22.0.0`; `sideEffects: false`; `bin` mode 755; FESM imports only
  `@angular/core` plus one internal relative chunk; **zero `tslib` imports**.
  shasum `a6b6bd1447e70d140ac89742872f423e6f0156a8`, SHA-256
  `3314ab9dce86c52123172e4cd701310bfaeab0bd4018ac91a936bfc3d6332671`.
- **Clean consumer** (`tmp/i18n-consumer`, the tarball extracted into
  `node_modules`, public entry points only): every public symbol used in
  `public-api-check.ts`; production build **232.25 kB raw / 63.29 kB
  transfer**; browser smoke in Chromium shows the Arabic default, `t()`, the
  pipe, the pipe with params (`عنصران`, the Arabic dual), an inline translation
  map, `formatIcu`, the English switch, and zero console errors.
- **Typed keys in the consumer:** the shipped CLI wrote 12 keys; with the
  generated registry the typo `'app.titel'` is a compile error (TS2769) and
  without it the same file compiles (negative control); `--check` exits 1 on a
  stale source and 0 when current.
- **Size, measured as a delta** (empty Angular app → same app +
  `provideRiviniaI18n` + one `t()`): **93.01 → 116.63 kB raw**,
  **27.97 → 34.26 kB transfer** = **+23.62 kB raw / +6.29 kB transfer**, with
  the three loaders in separate lazy chunks (392 / 377 / 344 bytes).

- Version **0.4.0** (pre-1.0 minor). 0.3.4 was never published, so its source
  layout move ships inside 0.4.0 and 0.3.4 is skipped on the registry.
- **NOT published** — the tarball awaits explicit confirmation (name, version,
  access, file list) per gate 7.
- Not run, therefore not claimed: WebKit (cannot launch in this environment),
  system Firefox 158 (Playwright does not drive it), screen-reader behaviour,
  and SSR in any engine other than Chromium.

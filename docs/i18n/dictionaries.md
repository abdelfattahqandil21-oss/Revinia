# @rivinia/i18n — dictionaries, loaders and SSR

Back to [the README](../../projects/i18n/README.md) ·
[translating text](translating.md) · [switching the language](switching.md) ·
[the API](api.md)

## Where translations live

The default loader fetches `i18n/{language}.json`. For a standard Angular app
that means `public/i18n/en.json` served as `/i18n/en.json`. An existing
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
script requests between the main bundle and the dictionary fetch.

A loader can also be in-memory, which is how an app ships its dictionaries in
the bundle and never hits the network:

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

For dictionaries you already have as objects, the `translations` config option
seeds them before any network load; a loader response still wins. An app that
wants zero network traffic at all passes
`loader: customLoader(async () => ({}))`.

## A loader of your own

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

`LoaderDescriptor.resolve()` is where the dynamic `import()` lives: the service
calls it once, caches the result, and passes the `LoaderContext` so a descriptor
can pick a platform-specific implementation.

`LoaderContext.baseUrl` is an absolute, directory-like base (`document.baseURI`
in the browser; `<base href>` resolved against the request on the server). It
always describes a directory the way the browser sees it — a `<base href="/app/">`
keeps its trailing slash, a `<base href="/app">` does not. `isServer` means "there
is a server request context", which is what makes relative URLs fetchable.

## Server-side rendering

The default loader works on the server: `REQUEST` plus `<base href>` produce an
absolute URL, so Node's `fetch` never sees a relative path. The rendered
dictionaries go into the `TransferState`, and the browser reads them instead of
fetching again — measured in the e2e app, where the client issues no dictionary
request.

Three things a custom host has to get right:

- **A custom SSR host must provide `REQUEST`.** `renderApplication` does not add
  it; `@angular/ssr` does. Without it the service cannot build an absolute URL on
  the server and the default loader fails there — the same as any other library
  that needs the request origin.
- **Provide the serializer in the app injector.** `renderApplication` serializes
  the _platform_ `TransferState`, while `bootstrapApplication` gives the app its
  own root injector, so dictionaries loaded by the service land in a different
  instance. Register a `BEFORE_APP_SERIALIZED` callback (or
  `provideServerRendering()`) in the app providers.
- **Serve the CSR shell as the template.** With `outputMode: 'server'` the
  builder prerenders `browser/index.html`, so that file already contains a
  rendered app and its own `ng-state` script. Use `browser/index.csr.html` as the
  render template; otherwise the response carries two scripts with the same id
  and the client reads the empty one.

And two that follow from the storage and hydration choices:

- `storageStrategy: 'cookie'` reads the request cookie on the server and writes
  it in the browser, so the first paint matches the user's choice. Local/session
  storage fall back to the default language or browser detection on the server.
- `provideClientHydration(withEventReplay())` is the standard client side; the
  clean CSR shell carries no event-dispatch contract script, so an event fired
  before hydration completes is not replayed.

The `ready()` signal is what to gate on: `provideRiviniaI18n()` registers an app
initializer that loads the initial language before first paint, and SSR waits for
it through `PendingTasks`.

A complete, runnable host lives in
[`projects/i18n-e2e`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/projects/i18n-e2e)
(`node:http` + `renderApplication`, no Express), with
[`e2e/ssr-smoke.mjs`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/projects/i18n-e2e/e2e/ssr-smoke.mjs)
asserting the raw HTML, the server log, the transfer payload, the absence of a
client refetch, and hydration.

# @rivinia/i18n

[![npm version](https://img.shields.io/npm/v/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)
[![license](https://img.shields.io/npm/l/@rivinia/i18n.svg)](https://www.npmjs.com/package/@rivinia/i18n)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/i18n/v1.0.1/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="340" />
</p>

A headless Angular language manager built on signals: key-based JSON
dictionaries, inline translations, RTL/LTR document attributes, lazy loaders, ICU
plural/select messages, browser-language detection, and `Intl` number/date
formatting — with SSR that actually works and no runtime dependency beyond
Angular. Package version: **1.0.1**.

The `1.0.0` stable release follows the 1.0 release candidates; 0.x was experimental.

Concretely: the text lives in JSON files, components ask for a key, and the whole
app — text, direction, dates, numbers — follows the language the user picked.
Arabic is a first-class target, not an afterthought of an English layout.

```ts
// src/app/header.ts
import { Component, signal } from '@angular/core';
import { RvTranslatePipe } from '@rivinia/i18n';
import { injectI18n } from './i18n/languages';

@Component({
  selector: 'app-header',
  imports: [RvTranslatePipe],
  template: `
    <h1>{{ title() }}</h1>
    <p>{{ 'booking.seats' | rvTranslate: { count: seats() } }}</p>
    <button type="button" (click)="i18n.setLanguage('en')">English</button>
  `,
})
export class Header {
  readonly i18n = injectI18n();
  readonly title = this.i18n.t('app.title');
  readonly seats = signal(3);
}
```

`title()` and the pipe update on the click and the page's direction flips with the
language — nothing else is wired by hand. The same app under
[`projects/i18n/testing/app/src`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/i18n/v1.0.1/projects/i18n/testing/app/src)
is what the Playwright suites drive: `npx ng build i18n-e2e` runs it locally.

## Why `@rivinia/i18n`

- **Signal-first state.** `currentLanguage`, `dir`, `locale`, `loadingState` and
  `missingKeys` are readonly signals; writes go through methods only.
- **Plurals that survive translation.** The ICU subset covers `plural`, `select`,
  `selectordinal`, `offset:`, `#` and the number/date styles — with all six Arabic
  categories from `Intl.PluralRules`, so one message yields six Arabic forms and
  two English ones with no code change.
- **Typed keys are opt-in.** Every key is a plain `string` until you generate the
  declaration; then a typo fails the build instead of reaching the screen.
- **SSR-correct URLs and hydration.** The default loader builds an absolute URL
  from `REQUEST` + `<base href>`, and dictionaries rendered on the server travel in
  `TransferState` so the client never refetches them.
- **Failure reporting you can see.** `fallbackLanguage`, `onMissingKey`,
  `onMissingParam` and `onLoadError`, each deduplicated once per key (or language)
  per session — and a load failure never rejects, it lands on `loadingState`.
- **Persistence and detection without wiring.** local/session/cookie storage, a
  `navigator.languages` match on first visit, `<html lang>` and `<html dir>` kept
  in sync.
- **Two ready-made controls, when you want them.** `@rivinia/i18n/ui` ships a
  two-language toggle; `@rivinia/i18n/select` composes `@rivinia/select` into a
  picker for three or more. Both entry points are optional, and the picker's peer
  is optional too.

## Install

```bash
npm install @rivinia/i18n       # or pnpm add / yarn add / bun add
```

Optional, for `ng add`: `@angular-devkit/schematics` (declared as an optional peer,
so an app that never runs `ng add` does not install it). Optional, for the picker:
`npm install @rivinia/select`.

- Requires **Angular `^22.0.0`** (`@angular/core` is a peer, not a dependency).
- Node: **same as Angular 22** (`^22.22.3 || ^24.15.0 || >=26.0.0`).
- `sideEffects: false`; no runtime import beyond `@angular/core`; the network
  loaders are lazy chunks. No `HttpClient` peer — the built-in loaders use `fetch`.

## Quick start

1. **Generate the language list.** `npx rivinia-i18n-keys init` asks for each
   language (id, native name, direction) and the default one, then writes
   `src/app/i18n/languages.ts` plus one empty dictionary per language under
   `public/i18n/`. `--languages ar:العربية:rtl,en:English:ltr --default en` skips
   the questions for CI.
2. **Register it once, at bootstrap.**

   ```ts
   // src/app/app.config.ts
   import type { ApplicationConfig } from '@angular/core';
   import { i18n } from './i18n/languages';

   export const appConfig: ApplicationConfig = {
     providers: [i18n.provide()],
   };
   ```

   The provider loads the initial language before first paint (SSR waits through
   `PendingTasks`); `ready()` is the signal to gate skeletons on.

3. **Translate.** `{{ 'booking.seats' | rvTranslate }}` in a template,
   `i18n.t('app.title')` for a component field, `i18n.translate(…)` in plain code —
   the component at the top of this file is all three, and the JSON files hold the
   text. Each language entry answers four questions: `id`, `nativeName`, `dir`,
   `locale`. `locale` is the one that surprises people — a bare `ar` formats Latin
   digits (`3`), `ar-EG` formats Arabic-Indic ones (`٣`).

4. **Add the switch.** Two languages: `<rv-language-toggle [manager]="i18n" />` from
   `@rivinia/i18n/ui`. Three or more: install `@rivinia/select` and use
   `<rv-language-select [manager]="i18n" label="Language" />` from
   `@rivinia/i18n/select`. Preferring no terminal at all, `defineRiviniaI18n({…})` is
   the object the generated module wraps.

## Two ways to use it

| Way           | Entry                              | You get                                                                                |
| ------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Headless core | `@rivinia/i18n`                    | the service, the loaders, ICU formatting, the `rvTranslate` pipe, typed keys           |
| Ready-made UI | `@rivinia/i18n/ui`, `/i18n/select` | `rv-language-toggle` and `rv-language-select`, with their ARIA and their styling hooks |

The two are independent: the UI entry points import core **types** only, and the core
never imports them. Every UI export is Experimental; the tiers are in the
[API reference](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/api.md#api-stability).

## Compatibility

|                            | Chrome / Edge | Firefox | Safari macOS | Safari iOS |
| -------------------------- | ------------- | ------- | ------------ | ---------- |
| **Supported** (test floor) | 114           | 125     | 17           | 18.3       |
| **Enhanced** (popup)       | 131           | never   | 26.2         | 26.2       |

`@rivinia/i18n` itself needs no browser feature that Angular 22 does not already
need: `Intl.PluralRules`, `Intl.DisplayNames` and `fetch` all sit below the floors
above. The **Enhanced** row belongs to the picker's popup, which is
`@rivinia/select`'s; the toggle is a plain button and is unaffected.
`document.startViewTransition` is used only if you opt into `viewTransition` — the
service feature-detects it and applies the change without a transition where it is
absent. Peers: `@angular/core` `^22.0.0`, plus `@rivinia/select` `^1.0.0` for
the `/select` entry only — optional, so an app that never imports
`@rivinia/i18n/select` does not install it. The caret admits every select 1.x
release, the rc and the final alike, and excludes a 2.0. The floor dates, the
`@supports` gate and what has never been run (including real Safari) are in
[browser support](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/browser-support.md).

## Go further

Three levels, kept as they were: everyday patterns first, then the complete
surface ordered by API.

| Tier                    | Read                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Everyday use            | [translating text](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/translating.md) · [switching the language](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/switching.md) · [dictionaries and SSR](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/dictionaries.md) |
| Reference — behaviour   | [ICU messages](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/icu.md) · [missing keys, fallback and failures](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/resilience.md) · [the CLI](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/cli.md)                     |
| Reference — the surface | [the API](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/api.md) · [the language toggle](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/toggle.md) · [the language picker](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/i18n/select.md)                               |
| Theming                 | [Rivinia theming](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/docs/theme/README.md)                                                                                                                                                                                                                                                     |

Release history: [CHANGELOG.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/i18n/v1.0.1/projects/i18n/CHANGELOG.md).
MIT licensed.

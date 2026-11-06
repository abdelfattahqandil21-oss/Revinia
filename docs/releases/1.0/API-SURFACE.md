# The 1.0 API surface

S8 of [`docs/specifications/1.0-readiness.md`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/specifications/1.0-readiness.md),
under D88. This is the list of names and defaults the four 1.0 packages ship with.
Every symbol below was read off the entry point that publishes it, and
[`scripts/api-surface.mjs`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/scripts/api-surface.mjs)
plus its snapshot
[`scripts/api-surface.snapshot.json`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/scripts/api-surface.snapshot.json)
pin the eight lists, so changing one is a deliberate diff rather than an accident
in a refactor. **79 published names across 8 entry points.**

What this document freezes is what gets published, and publishing is a human step:
the commands are in
[`docs/releases/1.0/PUBLISH-RUNBOOK.md`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/releases/1.0/PUBLISH-RUNBOOK.md)
and the soak that promotes an rc to `1.0.0` is **S8 — the soak** in
[`docs/releases/1.0/HUMAN-CHECKS.md`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/releases/1.0/HUMAN-CHECKS.md).
Neither has been run — except that the runbook's step 2 ran for
**all four packages** on 2026-11-03: `1.0.0-rc.1` of each is on `next`, cut from the
tags `theme/v1.0.0-rc.1` at `3cb8b51`, `select/v1.0.0-rc.1` at `1e78c6c`, and
`menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` both at `d5d7f91`. Of the 79 names, **all 79
are now what a consumer installs** — select's 7 on `.` and 10 on `./ui`, menu's 6 on
`.` and 11 on `./ui`, i18n's 35 on `.` and 5 on `./ui` and 5 on `./select`. Three of
them are verified against the registry the same way: `dist.integrity` equals base64 of
the local `sha512sum`, the registry tarball `cmp`-identical to the published-from and
pre-flight tarballs, a scratch consumer resolving every `exports` target, and `diff -r`
of the installed tree against the inspected tarball printing nothing. i18n's counts are
read off the **installed** `types/*.d.ts`, not the source barrels. theme contributes
none, because its contract is CSS custom properties, not TypeScript exports. The soak
has not started; the running record is the status table at the top of the runbook.

## How to read a verdict

| Verdict               | Meaning                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Keep**              | Ships at `1.0.0` under this exact name, with a support contract.                                                                                 |
| **Keep, no contract** | Ships, because deleting a published name is the more expensive error, but its source comment says `@internal`: it is not a promise.              |
| **Decide**            | The freeze found a real cost and cannot pay it alone. The owner picks before the `1.0.0` tag; nothing was removed while preparing this document. |

**Nothing in the four packages is deprecated.** `grep -rn "@deprecated" projects/{theme,select,menu,i18n}`
over the non-spec TypeScript returns **0 hits** (measured 2026-11-02), so S8's
"remove deprecations" step has nothing to remove — the removals already happened
in `0.6.0` (i18n) and `0.6.0` (select), and the migration notes for them live in
each package's `CHANGELOG.md`.

## Method

Eight entry points, published from eight `public-api.ts` files. Every one of them
uses explicit `export { … }` / `export type { … }` lists; `grep -c "export \*"`
returns 0 for all eight, so this document's lists are complete rather than an
estimate — a star export would have hidden names behind a module boundary.

| Entry point            | Symbols                                        |
| ---------------------- | ---------------------------------------------- |
| `@rivinia/theme`       | 0 TypeScript exports, 12 CSS custom properties |
| `@rivinia/select`      | 7                                              |
| `@rivinia/select/ui`   | 10                                             |
| `@rivinia/menu`        | 6                                              |
| `@rivinia/menu/ui`     | 11                                             |
| `@rivinia/i18n`        | 35                                             |
| `@rivinia/i18n/ui`     | 5                                              |
| `@rivinia/i18n/select` | 5 (2 are re-exports from `/ui`)                |

## `@rivinia/theme`

`projects/theme/src/public-api.ts` exports nothing on purpose: the package is a
stylesheet, and ng-packagr needs a TypeScript root. Its public API is the token
layer in `projects/theme/styles/theme.css`, inside `@layer rivinia-theme`:

`--rv-bg` `--rv-fg` `--rv-muted` `--rv-accent` `--rv-border` `--rv-shadow`
`--rv-radius` `--rv-font` `--rv-ok` `--rv-danger` `--rv-warning` `--rv-info`

Twelve names, **Keep** for all twelve. Post-1.0 they are semver-covered: a rename
is a major, a new token is a minor, and the adapters
(`tailwind.css`, `bootstrap.css`, `scss`, `theme.css`) are part of the same
contract. The light and dark values in that file are defaults, not a palette the
consumer has to accept; `@layer` is what makes an unlayered `:root` win.

## `@rivinia/select` — 7

| Symbol                        | Kind                                                    | Verdict |
| ----------------------------- | ------------------------------------------------------- | ------- |
| `RiviniaSelect`               | class (the controller, `services/rivinia-select.ts:15`) | Keep    |
| `RIVINIA_SELECT`              | `InjectionToken<RiviniaSelectController>`               | Keep    |
| `provideRiviniaSelect(mode?)` | provider function, default `'single'`                   | Keep    |
| `injectRiviniaSelect()`       | injection shorthand                                     | Keep    |
| `RiviniaSelectController`     | type                                                    | Keep    |
| `RiviniaSelectMode`           | type (`'single' \| 'multi'`)                            | Keep    |
| `RiviniaSelectOption`         | type                                                    | Keep    |

## `@rivinia/select/ui` — 10

| Symbol                                                      | Kind                                         | Verdict                        |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------ |
| `RiviniaSelectComponent` (`rv-select`)                      | component, `FormValueControl<SelectChange>`  | Keep                           |
| `SelectChange`                                              | type (`string \| readonly string[] \| null`) | Keep                           |
| `computeSelectPosition`                                     | function                                     | **Decide** — see aliases below |
| `SELECT_GAP`                                                | const                                        | **Decide**                     |
| `PanelCoordinates` `PanelSize` `TriggerRect` `ViewportSize` | types                                        | **Decide**                     |
| `SelectPlacement`                                           | type                                         | Keep                           |
| `RiviniaSelectVariant`                                      | type (`'simple' \| 'premium'`)               | Keep                           |

**The aliases.** `projects/select/ui/src/public-api.ts:7-16` publishes six names
that are not what the internals call themselves: `computeSelectPopupPosition as
computeSelectPosition`, `SELECT_POPUP_GAP as SELECT_GAP`, and four types aliased
the same way. (`SelectPlacement` on the next line is a seventh alias,
`SelectPopupUiPlacement` inside; its verdict is **Keep** because the 0.5.0 spelling
it preserves is also the spelling the docs use.) The comment in that file says it
plainly — they are "the names
0.5.0 used". Keeping them costs nothing at runtime and one line of indirection in
the source; dropping them is a breaking change for a consumer who imported the
0.5.0 spelling, which is a decision the owner makes, not a freeze.
**Recommendation: keep them, and mark them deprecated only when 1.1 starts the
deprecation clock (a removal can then only land in 2.0.0).**

## `@rivinia/menu` — 6

| Symbol                  | Kind                                                  | Verdict                              |
| ----------------------- | ----------------------------------------------------- | ------------------------------------ |
| `RiviniaMenu`           | class (the controller, `services/rivinia-menu.ts:13`) | Keep                                 |
| `RiviniaMenuController` | type                                                  | Keep                                 |
| `RiviniaMenuItemData`   | type                                                  | Keep                                 |
| `RiviniaMenuFocus`      | type                                                  | Keep                                 |
| `RiviniaMenuPlacement`  | type                                                  | Keep                                 |
| `RiviniaMenuItem`       | type                                                  | **Decide** — see the collision below |

## `@rivinia/menu/ui` — 11

| Symbol                                                             | Kind                                                  | Verdict    |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ---------- |
| `RiviniaMenuComponent` (`rv-menu`)                                 | component                                             | Keep       |
| `RiviniaMenuItem` (`[rvmenuItem]`)                                 | class (directive, `components/menu/menu-panel.ts:49`) | **Decide** |
| `MenuPick`                                                         | type                                                  | Keep       |
| `RiviniaMenuUiPlacement`                                           | type                                                  | Keep       |
| `RiviniaMenuItemData`                                              | re-export from `@rivinia/menu`                        | Keep       |
| `computeMenuPosition`                                              | function                                              | Keep       |
| `MENU_GAP`                                                         | const                                                 | Keep       |
| `MenuCoordinates` `MenuPanelSize` `MenuTriggerRect` `MenuViewport` | types                                                 | Keep       |

**The collision.** `RiviniaMenuItem` is a _type_ in `@rivinia/menu`
(`models/menu-types.ts`) and a _directive_ in `@rivinia/menu/ui`
(`menu-panel.ts:49`). Both are legal — different entry points, different modules —
and a consumer who writes `import { RiviniaMenuItem } from '@rivinia/menu/ui'`
gets the directive. The `menu-panel.ts:49` one is the name the docs table and the
README use for the item markup. Options: rename the core type
(`RiviniaMenuItemData` already exists next to it), rename the directive, or keep
both and document it here. All three are breaking for somebody except the third,
which is why this is a **Decide** and not a change made at 2am by the agent
writing the freeze.

## `@rivinia/i18n` — 35

The consumer-facing tier table (Stable / Experimental / Internal) is in
[`docs/i18n/api.md`](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/i18n/api.md).
The freeze adds one thing it does not say: which of those names carry no contract.

| Group                 | Symbols                                                                                                                                                          | Verdict                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Service and providers | `RiviniaI18n`, `provideRiviniaI18n`, `injectRiviniaI18n`, `defineRiviniaI18n`                                                                                    | Keep                                                                                                                             |
| Pipe                  | `RvTranslatePipe` (`rvTranslate`)                                                                                                                                | Keep                                                                                                                             |
| Config and events     | `RiviniaI18nConfig`, `MissingKeyEvent`, `MissingParamEvent`, `RiviniaLoadError`                                                                                  | Keep                                                                                                                             |
| Core types            | `Language`, `Direction`, `Translation`, `TranslateParams`, `StorageStrategy`, `SwitchStrategy`                                                                   | Keep                                                                                                                             |
| Loaders               | `TranslationLoader`, `LoaderDescriptor`, `LoaderContext`, `jsonLoader`, `httpLoader`, `remoteLoader`, `customLoader`, `HttpLoaderOptions`, `RemoteLoaderOptions` | Keep                                                                                                                             |
| ICU                   | `formatIcu`, `IcuFormatOptions`                                                                                                                                  | Keep                                                                                                                             |
| Typed keys            | `RegisteredI18nKey`, `RiviniaI18nKeyRegistry`                                                                                                                    | Keep                                                                                                                             |
| View transitions      | `ViewTransitionConfig`, `ViewTransitionInfo`, `ViewTransitionService`                                                                                            | Keep — the service is `@internal` in its own comment; the two types are the config surface                                       |
| Cookie helpers        | `parseCookie`, `serializeCookie`                                                                                                                                 | **Keep, no contract** — `utils/cookies.ts:9,30` say `@internal Exported for the package's own SSR tests`                         |
| Browser detection     | `browserLanguages`, `detectBrowserLanguage`                                                                                                                      | **Keep, no contract** — `utils/i18n-utils.ts:43,67` say `@internal May move to an @rivinia/i18n/internal entry point before 1.0` |

Those four helper exports are the only real `@internal` tension in the freeze.
Moving them to a new `@rivinia/i18n/internal` entry point would be a **new**
secondary entry point — a new npm export boundary, which AGENTS.md requires
proving rather than assuming, and which removes four names from the path a
consumer can import today. The freeze leaves them where they are and says out
loud that a patch release may change them. That is a documented, non-breaking
position; the alternative is a breaking one.

## `@rivinia/i18n/ui` — 5 and `@rivinia/i18n/select` — 5

| Symbol                                                                          | Entry point                     | Verdict |
| ------------------------------------------------------------------------------- | ------------------------------- | ------- |
| `RiviniaLanguageToggle` (`rv-language-toggle`)                                  | `/ui`                           | Keep    |
| `RiviniaLanguageTrigger` (`rvLanguageTrigger`), `RiviniaLanguageTriggerContext` | `/ui`                           | Keep    |
| `RiviniaLanguageManager`, `LanguageLike`                                        | `/ui`, re-exported by `/select` | Keep    |
| `RiviniaLanguageSelect` (`rv-language-select`)                                  | `/select`                       | Keep    |
| `LanguageSelectOption`, `languageSelectOptions`                                 | `/select`                       | Keep    |

The two packages' own docs mark the `/ui` and `/select` components
Experimental. S8 does not promote them: the tier column is a statement about how
much the repository has measured, and `docs/testing/browser-support.md` measures popups,
not `Intl`. Both are **Keep**, both stay Experimental in their docs, and the
owner's 1.0 review can promote them with one line each.

## Defaults that become final

The names above are half the contract; these values are the other half. Each was
read from the source that ships it, 2026-11-02.

| Default                | Value                                                        | Source                                                                |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| i18n storage key       | `rivinia.i18n.language`                                      | `models/i18n-config.ts:104`                                           |
| i18n storage strategy  | `local`                                                      | `models/i18n-config.ts:105`                                           |
| i18n auto direction    | `true`                                                       | `models/i18n-config.ts:106`                                           |
| i18n browser detection | `false` — explicit opt-in                                    | `models/i18n-config.ts:95`                                            |
| i18n loader path       | `i18n/{language}.json`                                       | the default `jsonLoader`, documented in `docs/i18n/api.md`            |
| select controller mode | `'single'`                                                   | `providers/select-di.ts:52`                                           |
| select variant         | `simple`                                                     | `models/select-popup.ui-types.ts`, `docs/select/variants.md`          |
| select gap / menu gap  | `SELECT_GAP`, `MENU_GAP` consts                              | `utils/select-popup-position.ts`, `utils/menu-position.ts`            |
| select panel floor     | `14rem`, design minimum `10rem`                              | `docs/select/recipes.md`, measured in the Playwright responsive cases |
| menu panel             | `border-box`, `22rem` cap, `--rv-menu-width` default `10rem` | `docs/menu/ready-made.md`, `projects/menu/CHANGELOG.md` 0.4.0         |
| theme layer            | `@layer rivinia-theme` around every default                  | `styles/theme.css:63`                                                 |

## What the snapshot test does and does not do

`scripts/tests/api-surface.spec.ts` (run by `pnpm test:scripts`) reads each entry
point's `public-api.ts`, resolves `export { a as b }` to the published name, and
compares the sorted list against the committed snapshot. It answers one question:
_did the set of published names change?_ It cannot tell you whether a name is a
good name, whether a type's shape moved, or whether a default changed — those are
this document, the tier tables, and the unit suites.

The guard was proved by breaking it, four times, on the real files: renaming
`MENU_GAP` reddens it with both `new published name MENU_GAP_RENAMED` and
`removed published name MENU_GAP`; adding an export reddens it with one line;
giving `@rivinia/theme` a name reddens it too, because that entry point's list is
deliberately empty; and a fake name written only inside a `//` comment leaves it
green, which is what stops the parser counting the prose in
`select/ui/src/public-api.ts:3-6`. Every file was restored afterwards
(`git diff` on the three was empty).

**What a snapshot cannot see:** a symbol exported from a _file_ rather than listed
in the entry point — which is why `loaderContext` belongs to this document rather
than to the JSON. `RiviniaI18n` publishes `readonly loaderContext: LoaderContext`
(`projects/i18n/src/lib/services/rivinia-i18n.ts:74`), and the dictionary store
passes it to `deps.loader(deps.loaderContext)`
(`services/dictionary-store.ts:239`). A custom loader reads it, so it is part of
the contract a `LoaderDescriptor` author depends on, and it freezes with the
`LoaderContext` type: **Keep**, at all three layers — the property, the type, and
the argument the loaders receive.

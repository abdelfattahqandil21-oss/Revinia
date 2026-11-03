# SPEC — `@rivinia/i18n/select` secondary entry point

Status: approved for implementation by the owner on 2026-10-31
("هنركب اخر اصدر من مكتبة select في i18n ... secondary entry point
`@rivinia/i18n/select`").

## 1. Goal

`@rivinia/i18n` already ships a two-language toggle (`@rivinia/i18n/ui`). An
application with `ar`, `en`, `de`, … needs a list, not a two-way flip.

This entry point ships one ready-made control and one pure mapper:

```ts
import {
  RiviniaLanguageSelect,
  languageSelectOptions,
} from '@rivinia/i18n/select';
```

```html
<rv-language-select [manager]="i18n" label="Language" />
```

The control is a thin composition over `@rivinia/select/ui`; the i18n core and
the `/ui` entry point do not change.

## 2. Hard constraints

1. **The entry point is exactly `@rivinia/i18n/select`.**
2. **`@rivinia/select` is an optional peer.** A consumer that never imports
   `@rivinia/i18n/select` must be able to install and build `@rivinia/i18n`
   without `@rivinia/select` present.
3. **The core bundle must not grow.** `fesm2022/rivinia-i18n.mjs` and
   `fesm2022/rivinia-i18n-ui.mjs` must contain no `@rivinia/select` import. The
   only chunk allowed to import it is `fesm2022/rivinia-i18n-select.mjs`.
4. **Arbitrary language counts.** Nothing in the control assumes two
   languages; three or thirty behave the same.
5. **No new runtime dependency in the core.** The select entry point imports
   `@rivinia/select/ui`; the core keeps `@angular/core` only.

## 3. Public API

### `languageSelectOptions(languages)`

Pure mapper from `readonly LanguageLike[]` to select options. It preserves
order, resolves the visible name with the same rule as the `/ui` entry point
(`nativeName` → `Intl.DisplayNames` → id), and adds the metadata a custom row
needs:

```ts
export interface LanguageSelectOption extends RiviniaSelectOption {
  /** The language id, repeated as the row's `lang`. */
  readonly lang: string;
  /** The language direction, when the source entry declares one. */
  readonly dir?: 'ltr' | 'rtl';
}
```

- `id` is the language id, `label` is the visible name.
- `hint` is the id **only when the label differs from it** (so `العربية`
  carries `ar`, while a fallback label that already is `ar` does not repeat
  itself).
- `dir` is omitted when the source has no direction, so the row can fall back
  to `dir="auto"`.

### `<rv-language-select>`

Inputs (all optional):

| Input | Type | Default | Meaning |
| --- | --- | --- | --- |
| `manager` | `RiviniaLanguageManager` | — | Managed mode. Wins over `languages` / `current` / `busy`. |
| `languages` | `readonly LanguageLike[]` | `[]` | Presentational language list. |
| `current` | `string` | — | Presentational current id. |
| `label` | `string \| null` | `null` | Visible caption; also the trigger's accessible name and the panel's default name. |
| `ariaLabel` | `string \| null` | `null` | Accessible name when there is no visible caption. |
| `popupLabel` | `string \| null` | `null` | Explicit panel name; defaults to `label`, then `ariaLabel`. |
| `placeholder` | `string` | `'Select…'` | Trigger text when nothing is selected. |
| `searchable` | `boolean` | `false` | Show the filter box. |
| `searchLabel` | `string` | `'Search options'` | Filter box accessible name. |
| `searchPlaceholder` | `string` | `'Search…'` | Filter box placeholder. |
| `emptyLabel` | `string` | `'No results'` | Shown when the filter matches nothing. |
| `variant` | `'simple' \| 'premium'` | `'simple'` | Passed to `rv-select`. |
| `disabled` | `boolean` | `false` | Blocks opening and picking. |
| `busy` | `boolean` | `false` | Presentational loading state. |

Output:

| Output | Payload | When |
| --- | --- | --- |
| `languageChange` | `string` | After a managed switch confirms, or synchronously in presentational mode. |

Behavior:

- The trigger shows the current language's native name (or the placeholder when
  there is no current id).
- Rows carry `lang` and `dir` on the visible label, so a screen reader
  pronounces `العربية` as Arabic even when the page runs `en`.
- Managed mode calls `manager.setLanguageAsync(id)` once per pick and emits
  only when `manager.currentLanguage()` confirms the id. A manager that leaves
  the language unchanged produces no event and the trigger returns to the
  real current language.
- Presentational mode emits synchronously and keeps the picked row selected
  until `[current]` changes.
- While the manager loads, the control is disabled, so a second pick cannot
  race the first. The `onSelectionChange` guard is a second line of defence.
- The component re-exports `LanguageLike` and `RiviniaLanguageManager` from
  `@rivinia/i18n/ui` (type-only), so a consumer importing only
  `@rivinia/i18n/select` has the input types.

## 4. Packaging

```
projects/i18n/
  ng-package.json                 # primary, unchanged dest
  select/
    ng-package.json               # secondary, no dest
    src/public-api.ts
    src/lib/...
```

`projects/i18n/package.json`:

```json
{
  "version": "0.8.0",
  "peerDependencies": {
    "@angular-devkit/schematics": "^22.0.0",
    "@angular/core": "^22.0.0",
    "@rivinia/select": "^0.7.0"
  },
  "peerDependenciesMeta": {
    "@angular-devkit/schematics": { "optional": true },
    "@rivinia/select": { "optional": true }
  }
}
```

The build order is `build:select` → `build:i18n`; the i18n source resolves
`@rivinia/select` through the workspace `tsconfig.json` paths to `dist/select`.

## 5. Verification gates

1. `pnpm build:select` and `pnpm build:i18n` exit 0.
2. `npx ng test i18n --watch=false` — the whole i18n suite, including the new
   behavior and surface specs.
3. Inspect `dist/i18n`:
   - `fesm2022/rivinia-i18n.mjs` has no `@rivinia/select`.
   - `fesm2022/rivinia-i18n-ui.mjs` has no `@rivinia/select`.
   - `fesm2022/rivinia-i18n-select.mjs` imports `@rivinia/select/ui`.
   - `package.json` exports `./select`, and `select/package.json` points at the
     new FESM and types.
   - `peerDependenciesMeta["@rivinia/select"].optional === true`.
4. Pack the tarball and compare its file list and sizes with 0.7.2. The core
   FESM byte size must be unchanged; the select chunk is the only addition.
5. Clean consumer A (no `@rivinia/select`): install the tarball, build an app
   that imports `@rivinia/i18n` and `@rivinia/i18n/ui`, and prove the build
   succeeds. Clean consumer B (with `@rivinia/select`): import
   `@rivinia/i18n/select`, build, and render the control.
6. The demo (`rv-tailwind`) adds `de`, switches `ar`/`en`/`de` through the
   selector, and the initial bundle stays free of the select chunk until the
   entry point is imported.

## 6. Out of scope

- Changing `@rivinia/select` itself.
- Changing the two-language toggle's behavior.
- A global provider default for the select variant.
- Publishing, tagging, or merging without the owner's explicit confirmation.

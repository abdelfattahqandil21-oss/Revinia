# @rivinia/i18n/select — the language picker

Back to [the README](../../projects/i18n/README.md) ·
[the language toggle](toggle.md) · [switching the language](switching.md) ·
[the API](api.md)

The toggle flips between exactly two languages. For `ar`, `en`, `de`, … this entry
point composes [`@rivinia/select`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/projects/select)
into a list rather than re-implementing one:

```bash
npm install @rivinia/select
```

```ts
import { RiviniaLanguageSelect, languageSelectOptions } from '@rivinia/i18n/select';
```

Every language becomes one row, in the order declared, with its native name. Managed
mode (`[manager]`) calls `setLanguageAsync` and emits `(languageChange)` only after
the switch is confirmed; presentational mode (`[languages]` + `[current]`) emits
synchronously. `searchable` adds the filter box for long lists, and `variant="premium"`
applies the select's premium skin.

**Every export of this entry point is Experimental** — it was first published in
0.8.0: `RiviniaLanguageSelect`, `languageSelectOptions`, `LanguageSelectOption`, and
the re-exported `LanguageLike` / `RiviniaLanguageManager` (so a consumer importing
only `/select` needs no `@rivinia/i18n/ui` on the side). The select is a composition
over `@rivinia/select/ui`, and that surface is now frozen for 1.0 — see
[`docs/releases/1.0/API-SURFACE.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/releases/1.0/API-SURFACE.md).
The exports here stay Experimental until the 1.0 review promotes them; what they are
composed over no longer moves under them.

## Managed, with `RiviniaI18n`

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
directly. Managed state wins: `[languages]`, `[current]` and `[busy]` are ignored
while `manager` is set. The trigger shows the current language's native name; the
panel lists every language in declaration order.

`(languageChange)` fires **after** `setLanguageAsync` confirms the id, matching the
toggle's contract. A manager that leaves the language unchanged emits nothing and the
trigger returns to the real current language. While the manager reports
`loadingState() === 'loading'`, the control is disabled, so a second pick cannot race
the first.

Picks are last-wins: a switch that is still in flight is superseded by a later
intent — including a re-pick of the language that is _already_ current, which makes
no manager call but still cancels the pending confirmation, so a change the user
never asked for cannot surface. After a failed load the trigger falls back to the
manager's current language (`setLanguageAsync` never rejects).

## Presentational, without a manager

```html
<rv-language-select
  [languages]="languages"
  [current]="language()"
  [busy]="switching()"
  label="Language"
  (languageChange)="language.set($event)"
/>
```

With no manager, `languages` + `current` describe the state and `languageChange` is
the only side effect. Presentational mode is synchronous; the picked row stays
selected until `[current]` changes, then the trigger follows the new value.

## Inputs and output

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

## Sizing

The host is `inline-block` with a `min-inline-size: 14rem` floor. `rv-select` cannot
supply it: its own `min-width: min(14rem, 100%)` resolves that `100%` to `0` inside a
shrink-to-fit host, so without the floor the trigger, the panel and every row collapse
to one character per line (`English` becomes `En / gli / sh`). That is what this floor
exists for — it was caught in the packed build in a browser, not by a build or a test
double. Widen it with ordinary CSS — `rv-language-select { inline-size: 100% }` in a
form row — and the panel follows the trigger within `rv-select`'s own limits. The
[`i18n-e2e` suite](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/projects/i18n-e2e/e2e/language-select.spec.ts)
measures the host, the panel and the row line count in Chromium and Firefox, and both
geometry tests fail when the floor is removed.

## Rows and accessibility

Each row carries `lang` and `dir` on the visible name, so a screen reader pronounces
`العربية` as Arabic even when the page runs `en`, and the name lays out in its own
direction. The closed trigger is `rv-select`'s value span and has no `lang`/`dir` hook
of its own, so it inherits the page's language — the marking lives in the panel. The
row's accessible name is its visible text: the native name, plus the language id as a
hint when the two differ. The id is not repeated when the label already is the id.

Everything else about the popup — the keyboard model, the `role="menu"` with
`menuitemradio` rows, the filter box, placement and the two browser floors — belongs to
[`@rivinia/select`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/select/accessibility.md)
and is measured by that package's suite, not this one.

## Styling hooks

The row layout comes from `rv-select`'s own classes (`rv-select-label`,
`rv-select-hint`, `rv-select-check`), which the composed row reuses — style those
through `@rivinia/select`'s tokens. `rv-language-select` adds two host attributes,
`[data-busy]` and `[data-disabled]` (the latter true while a manager is loading or
the control is disabled), and one row hook, `.rv-language-select__name`, which exists
as the language-specific styling hook: `flex: 1 1 auto` with
`overflow-wrap: anywhere` so a long native name wraps instead of overflowing.

## `languageSelectOptions`

`languageSelectOptions(languages)` is the pure mapper used by the component. It
preserves order, resolves the name with the same rule as `/ui` (`nativeName` →
`Intl.DisplayNames` → id), and returns:

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

## Optional peer and bundle isolation

`@rivinia/select` is declared as an **optional peer** of `@rivinia/i18n`:

```json
{
  "peerDependencies": { "@rivinia/select": "^1.0.0-rc.1" },
  "peerDependenciesMeta": { "@rivinia/select": { "optional": true } }
}
```

The core and `/ui` entry points never import it. Only
`fesm2022/rivinia-i18n-select.mjs` contains `@rivinia/select/ui`, so an application
that does not import `@rivinia/i18n/select` neither installs the peer nor pays for its
code. The unit surface spec checks the sources for this; the release gates then
inspect the built FESM. Measured in 0.8.0: a consumer without the peer has no select
code in its JS at all, and a consumer with the peer plus a lazy route gets the picker
in a 45.71 kB (10.72 kB brotli) chunk with zero occurrences of `rv-language-select` in
the initial bundle.

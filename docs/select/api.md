# @rivinia/select — the API

Back to [the README](../../projects/select/README.md) ·
[forms](forms.md) · [headless usage](headless.md) ·
[recipes](recipes.md)

> **Naming note:** the headless controller input is named `select` on
> `rv-select`. It is a **controller input**, not a DOM name — the rendered
> markup is `rv-select`, `.rv-select-trigger`, `.rv-select-popup-panel`, the
> inner `.rv-select-popup-menu` (the `role="menu"`), and
> `[rvselectpopupitem]` rows. The package's popup shares no vocabulary with
> `@rivinia/menu` and has no dependency on it — the two used to collide
> (same `rv-menu` selector), which is why the popup is now `rv-select-popup`.

## What each entry point exports

`RiviniaSelectComponent` and the `SelectChange` type live only in the UI entry
point; the controller and its types live in the headless one.

| Symbol                                                          | `@rivinia/select` | `@rivinia/select/ui` |
| --------------------------------------------------------------- | :---------------: | :------------------: |
| `RiviniaSelectComponent` (`<rv-select>`)                        |         —         |          ✓           |
| `SelectChange`                                                  |         —         |          ✓           |
| `RiviniaSelect` (headless controller)                           |         ✓         |          —           |
| `RiviniaSelectController`                                       |         ✓         |          —           |
| `RiviniaSelectOption`, `RiviniaSelectMode`                      |         ✓         |          —           |
| `RIVINIA_SELECT`, `provideRiviniaSelect`, `injectRiviniaSelect` |         ✓         |          —           |
| `computeSelectPosition`, `SELECT_GAP`                           |         —         |          ✓           |
| `SelectPlacement`, `RiviniaSelectVariant`                       |         —         |          ✓           |
| `PanelCoordinates`, `PanelSize`, `TriggerRect`, `ViewportSize`  |         —         |          ✓           |

```ts
// Ready-made UI
import { RiviniaSelectComponent, type SelectChange } from '@rivinia/select/ui';

// Headless controller + types
import {
  RiviniaSelect,
  type RiviniaSelectController,
  type RiviniaSelectMode,
  type RiviniaSelectOption,
} from '@rivinia/select';
```

Importing `RiviniaSelectComponent` from `@rivinia/select` is a compile error.

`computeSelectPosition` and `SELECT_GAP` are the names 0.5.0 used; the helper
they point at is `computeSelectPopupPosition` / `SELECT_POPUP_GAP` internally.
The 0.5.0 spellings stay exported — they are part of the published contract.
Both are pure top-layer placement math, RTL-aware, used by the built-in panel.

## `rv-select` inputs

| Input               | Type                              | Default            | Notes                                                                                              |
| ------------------- | --------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `options`           | `readonly RiviniaSelectOption[]`  | `[]`               | Re-synced into the controller on change. Each option may carry an optional `hint` string.          |
| `optionTemplate`    | `TemplateRef<unknown> \| null`    | `null`             | Custom markup for each option row — icons, avatars, badges. See [recipes](recipes.md).             |
| `listTemplate`      | `TemplateRef<unknown> \| null`    | `null`             | Replaces the whole list — for a virtualised one. See [recipes](recipes.md).                        |
| `loading`           | `boolean`                         | `false`            | Shows a loader row under the list.                                                                 |
| `loadingLabel`      | `string`                          | `'Loading…'`       | Text of the loader row.                                                                            |
| `select`            | `RiviniaSelectController \| null` | `null`             | External controller. Omitted: the component owns one matching `mode()`.                            |
| `mode`              | `'single' \| 'multi'`             | `'single'`         | Fixed at construction when the component owns the controller.                                      |
| `searchable`        | `boolean`                         | `false`            | Shows the filter box.                                                                              |
| `placeholder`       | `string`                          | `'Select…'`        | Trigger text with no selection.                                                                    |
| `searchPlaceholder` | `string`                          | `'Search…'`        | Filter box hint.                                                                                   |
| `emptyLabel`        | `string`                          | `'No results'`     | Shown when the filter matches nothing.                                                             |
| `placement`         | `SelectPlacement`                 | `'bottom-start'`   | Panel placement relative to the trigger. Logical, so RTL-aware.                                    |
| `label`             | `string \| null`                  | `null`             | Visible caption; becomes the trigger's accessible name (`aria-labelledby`).                        |
| `ariaLabel`         | `string \| null`                  | `null`             | Explicit accessible name for the trigger; used when there is no caption.                           |
| `popupLabel`        | `string \| null`                  | `null`             | Accessible name for the opened panel (`aria-label`); falls back to `label`.                        |
| `searchLabel`       | `string`                          | `'Search options'` | Accessible name for the filter box.                                                                |
| `variant`           | `'simple' \| 'premium'`           | `'simple'`         | Skin. Reflected as `data-variant`; styling only, no behaviour change. See [variants](variants.md). |

### The form-binding surface

These are the `FormValueControl` members: a form system writes them, a hand-written
template usually ignores them. `value` is a **model**, so `[(value)]` works
without any form library.

| Member     | Kind                                                   | Meaning                                                           |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `value`    | `model<SelectChange>`                                  | Form-bound value. Single: id or null. Multi: ids in pick order.   |
| `disabled` | `input<boolean>`                                       | From the form system. Prevents opening and interaction.           |
| `touched`  | `input<boolean>`                                       | From the form system (read-only; Angular sets it).                |
| `touch`    | `output<void>`                                         | Focus left the whole interaction — trigger and panel.             |
| `errors`   | `input<readonly { kind: string; message?: string }[]>` | Validation errors from the form system.                           |
| `invalid`  | `input<boolean>`                                       | Invalid state; reflected as `aria-invalid="true"` on the trigger. |

## `rv-select` outputs

| Output            | Payload                                                 | When                                             |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `selectionChange` | `string \| null` (single) / `readonly string[]` (multi) | A pick, or `clear()`.                            |
| `opened`          | `void`                                                  | Panel opened.                                    |
| `reachEnd`        | `void`                                                  | The panel scrolled near its end.                 |
| `panelReady`      | `HTMLElement`                                           | The panel element — emitted again on every open. |
| `closed`          | `void`                                                  | Panel closed.                                    |

## The controller

```ts
import {
  RiviniaSelect,
  type RiviniaSelectController,
  type RiviniaSelectOption,
} from '@rivinia/select';

const select = new RiviniaSelect('single'); // or 'multi'
```

| Member                   | Kind                                     | Purpose                                                                                                              |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `mode`                   | readonly                                 | `'single' \| 'multi'`, fixed at construction.                                                                        |
| `options`                | `Signal<readonly RiviniaSelectOption[]>` | The registry, in registration order.                                                                                 |
| `query`                  | `WritableSignal<string>`                 | The raw filter text.                                                                                                 |
| `filtered`               | `Signal<readonly RiviniaSelectOption[]>` | Options matching `query`; disabled ones stay visible but unpickable.                                                 |
| `value`                  | `WritableSignal<string \| null>`         | Single-mode selection.                                                                                               |
| `values`                 | `WritableSignal<readonly string[]>`      | Multi-mode selections, in pick order.                                                                                |
| `selectedLabels`         | `Signal<readonly string[]>`              | Labels of the current selection, in pick order (falls back to the raw id).                                           |
| `registerOption(option)` | method                                   | Idempotent by id; re-registering updates the entry.                                                                  |
| `unregisterOption(id)`   | method                                   | Removes the entry; a selected id is dropped with it.                                                                 |
| `syncOptions(list)`      | method                                   | Replaces the registry with exactly `list`.                                                                           |
| `setQuery(text)`         | method                                   | Sets the filter.                                                                                                     |
| `clearQuery()`           | method                                   | Empties the filter — what the component calls when the panel closes.                                                 |
| `select(id)`             | method                                   | Single-mode pick. Returns `false` for an unknown or disabled id.                                                     |
| `toggle(id)`             | method                                   | Multi-mode toggle. Returns `false` for an unknown/disabled id **and in single mode**.                                |
| `clear()`                | method                                   | Clears the value (single) or the values (multi).                                                                     |
| `setValue(id)`           | method                                   | Force a value, bypassing the unknown/disabled guards of `select` — for a form restore whose options have not loaded. |
| `setValues(ids)`         | method                                   | Force the values — the array counterpart of `setValue`.                                                              |
| `isSelected(id)`         | method                                   | Whether the id is currently selected.                                                                                |

`RiviniaSelectController` is the **structural** subset of that surface, so a UI
layer may depend on the interface instead of the class, which keeps a controller
usable across module realms (the same dual-realm rule `@rivinia/modal`'s host
manager follows). The subset leaves out `registerOption` and
`unregisterOption` — a UI layer mirrors whole lists through `syncOptions` — and
types `query` read-only, because it writes through `setQuery`. `setValue` and
`setValues` are **optional** on the interface: an implementation predating them
keeps working and falls back to `select`.

## The shapes

| Name                  | Fields                                     | Notes                                                                                                         |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `RiviniaSelectOption` | `id`, `label`, optional `disabled`, `hint` | `hint` renders right-aligned in muted monospace (e.g. a keyboard shortcut); typeahead matches on `label` only |
| `RiviniaSelectMode`   | `'single' \| 'multi'`                      | `'single'` picks one value and closes; `'multi'` toggles and stays open                                       |
| `SelectChange`        | `string \| null` or `readonly string[]`    | The UI entry's change payload, shaped by the mode                                                             |

**Registered options are frozen.** `readonly` on `RiviniaSelectOption` is a
compile-time promise only; an option that could be mutated after registration
would let the filtered list and the selection disagree. The registry holds
`Object.freeze`d copies.

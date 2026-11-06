# @rivinia/select

[![npm version](https://img.shields.io/npm/v/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)
[![license](https://img.shields.io/npm/l/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/select/v1.0.1/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="340" />
</p>

Angular select fields: an optional ready-made UI and the headless controller
behind it — an option registry, an accent-insensitive filter, and a single or
multi value. Package version: **1.0.1**.

The `1.0.0` stable release follows the 1.0 release candidates; 0.x was experimental.

```ts
import { Component } from '@angular/core';
import { RiviniaSelectComponent, type SelectChange } from '@rivinia/select/ui';

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      [options]="invoices"
      [searchable]="true"
      label="Status"
      placeholder="Status…"
      (selectionChange)="apply($event)"
    />
  `,
})
export class InvoiceFilterComponent {
  readonly invoices = [
    { id: 'paid', label: 'Paid' },
    { id: 'void', label: 'Void', disabled: true },
  ];
  apply(value: SelectChange): void {
    console.log(value); // string | null in single mode
  }
}
```

That is the whole field: type to filter, Tab into the list, Enter to pick,
Escape back to the trigger, and a panel that stays attached to its trigger in a
right-to-left form inside a left-to-right app. No service providers, no global
styles to configure. The same page under
[`projects/menu-e2e/src/app/pages/select.ts`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/projects/menu-e2e/src/app/pages/select.ts)
is what the popup conformance suite drives — `npx ng build menu-e2e` runs it
locally.

## Why `@rivinia/select`

- **Headless first.** The controller is the product; pixels are yours.
  `rv-select` is one implementation of it, not the only one.
- **Filtering that survives real input.** Accent- and case-insensitive, with
  Arabic tashkeel, tatweel and alef forms folded.
- **One model for single and multi.** Single picks and closes; multi toggles
  with a check mark and stays open, so the filter you typed survives the pick.
  The multi trigger is a one-line summary — first pick plus `+N` — and the whole
  selection is its accessible description.
- **Form-ready without an accessor.** `rv-select` implements
  `FormValueControl`, so Signal Forms, Reactive Forms and `ngModel` all work.
- **Custom rows, not a fixed row.** `optionTemplate` replaces a row's content
  for icons, avatars or badges and keeps the ARIA and the keyboard;
  `listTemplate` replaces the whole list for a virtualised one.
- **Placed with CSS anchor positioning** where the engine supports the whole
  gate, so the panel keeps up with its trigger in both writing directions — and
  the component's own coordinates where it does not.

## Install

```bash
npm install @rivinia/select       # or pnpm add / yarn add / bun add
```

Optional, for the shared token layer: `npm install @rivinia/theme`.

- Requires **Angular `^22.0.0`** (`@angular/core`, `@angular/common` and
  `@angular/forms` are peers, not dependencies). No dependency on
  `@rivinia/menu`.
- Node: **same as Angular 22** (`^22.22.3 || ^24.15.0 || >=26.0.0`).
- `@rivinia/select` exports the headless controller and its types;
  `@rivinia/select/ui` exports `RiviniaSelectComponent` and `SelectChange`.
- Side effects: **none** (`sideEffects: false`).

## Quick start

1. **Import the declarations** into the standalone component that uses the
   field: `RiviniaSelectComponent` from `@rivinia/select/ui`. Nothing to provide
   at the application root; `provideRiviniaSelect()` is there for when you want
   a controller to come from the injector instead of `new`.
2. **Hand it options and a mode.** `[options]` takes
   `RiviniaSelectOption[]` (`{ id, label, hint?, disabled? }`); `mode="multi"`
   turns it into a checkbox list. Bind `[select]` to your own `RiviniaSelect`
   when you want the controller to outlive the component. Give the field a
   visible `label` — it becomes the accessible name.
3. **Handle `(selectionChange)` and look at it.** Single mode emits
   `string | null`, multi emits the ids in pick order. Open the page and try
   typing, Tab, the arrows and Escape — then scroll or resize with the panel
   open, which closes it rather than letting it drift away from its trigger.

```ts
// Own the controller, so multi mode outlives the component that renders it.
import { Component } from '@angular/core';
import { RiviniaSelect } from '@rivinia/select';
import { RiviniaSelectComponent, type SelectChange } from '@rivinia/select/ui';

@Component({
  selector: 'app-tag-picker',
  imports: [RiviniaSelectComponent],
  template: ` <rv-select [select]="tags" [options]="tagOptions" (selectionChange)="on($event)" /> `,
})
export class TagPickerComponent {
  readonly tags = new RiviniaSelect('multi');
  readonly tagOptions = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];
  on(value: SelectChange): void {
    console.log(value); // readonly string[], in pick order
  }
}
```

## Two ways to use it

| Way                 | Entry                | You get                                                                                |
| ------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| Ready-made UI       | `@rivinia/select/ui` | the component, its panel, its CSS and its placement                                    |
| Headless controller | `@rivinia/select`    | the registry, the filter, the value — your markup, your ARIA, your focus and placement |

The two entries are independent: `/ui` uses the headless package through its
public API, and the headless package knows nothing about the component. Only a
change to the whole list — group headers, your own scroll container, a row set
the controller does not filter — needs the headless controller. Per-row content
stays inside `rv-select` through `optionTemplate`, which replaces the row's
markup and keeps the `<button>` wrapper, so the ARIA, the keyboard and the check
state keep working.

## Compatibility

|               | Chrome / Edge | Firefox | Safari macOS | Safari iOS |
| ------------- | ------------- | ------- | ------------ | ---------- |
| **Supported** | 114           | 125     | 17           | 18.3       |
| **Enhanced**  | 131           | never   | 26.2         | 26.2       |

**Supported** is the floor the test suite runs against: the field opens,
filters, picks and is keyboard-operable; below it the panel loses the browser
top layer and can be clipped by an ancestor. **Enhanced** adds placement by CSS
anchor positioning. Firefox is excluded from that block on purpose — a measured
right-to-left bug — so it permanently uses the component's own coordinates,
which is the path this suite measures three times a day.

`@rivinia/select` needs no feature to work that Angular itself does not need.
The floor dates, the `@supports` gate, and what has never been run (including
real Safari) are in
[browser support](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/browser-support.md).

## Go further

| Topic                                                                                        | Read                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Every input, output, controller member and type, per entry point                             | [docs/select/api.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/api.md)                     |
| Signal Forms, Reactive Forms, `ngModel`, value types, ownership rules                        | [docs/select/forms.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/forms.md)                 |
| Keys, focus, the shipped ARIA, and the verification gaps                                     | [docs/select/accessibility.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/accessibility.md) |
| Headless: the controller surface and a complete custom dropdown                              | [docs/select/headless.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/headless.md)           |
| `optionTemplate` rows, paged data, a virtualised list, your own entrance animation           | [docs/select/recipes.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/recipes.md)             |
| `simple` vs `premium`, what premium actually paints, and its measured byte cost              | [docs/select/variants.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/variants.md)           |
| The select's tokens, classes, `data-*` hooks and forced-colors behaviour                     | [docs/select/theming.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/select/theming.md)             |
| Theming every Rivinia component — the cascade, light and dark, where an override has to live | [docs/theme/README.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/docs/theme/README.md)                 |

Release history: [CHANGELOG.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/select/v1.0.1/projects/select/CHANGELOG.md).
MIT licensed.

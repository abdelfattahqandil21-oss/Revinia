# @rivinia/select

[![npm version](https://img.shields.io/npm/v/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)
[![license](https://img.shields.io/npm/l/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

Headless select behaviour for Angular 22+: an option registry, an
accent-insensitive search filter, and a single/multi value — no DOM, no
styling. Rendering lives in `@rivinia/select/ui` or in your own UI.

- Package version: **0.6.0**
- Requires: **Angular `^22.0.0`** (`@angular/core` and `@angular/forms`).
  Select has **no dependency** on `@rivinia/menu`.
- Side effects: **none** (`sideEffects: false`).

## Quick features

- **Headless first.** The controller is the product; pixels are yours.
  `rv-select` is one implementation of it, not the only one.
- **Two entry points.** `@rivinia/select` (no DOM) and `@rivinia/select/ui`
  (the components).
- **Accent- and case-insensitive filtering**, with Arabic tashkeel, tatweel and
  alef forms folded.
- **Single and multi mode**, sharing one model. The multi trigger is a
  one-line summary — first pick plus `+N` — and the full list is its
  accessible description.
- **Form-ready.** `FormValueControl`, so Signal Forms, Reactive Forms and
  `ngModel` all work without a custom accessor.
- **RTL-correct, even in a mixed-direction page.** The panel is placed with CSS
  anchor positioning; when the select's direction differs from the document's
  (an RTL form inside an LTR app), the inline anchor keyword is mirrored so
  `*-start` still means the select's own start edge.
- **Your own rows.** `optionTemplate` replaces a row's content for icons,
  avatars or badges; the ARIA and the keyboard stay.
- **Paged data.** A loader row, a `reachEnd` signal for infinite scroll, a
  footer slot for a "Load more" button, and `listTemplate` for a virtualised
  list.
- **Your own animation.** The entrance is one token, so it never fights the
  cascade.
- **Themable end to end.** One global token layer (`@rivinia/theme`) or
  per-component tokens — see Theming.

## Install

```bash
npm install @rivinia/select
```

or

```bash
pnpm add @rivinia/select
```

or

```bash
yarn add @rivinia/select
```

or

```bash
bun add @rivinia/select
```

The optional theme layer, if you want the shared token set:

```bash
npm install @rivinia/theme
```

## Imports

Two entry points. `RiviniaSelectComponent` and the `SelectChange` type live only
in the UI entry point; the controller and its types live in the headless one.

| Symbol                                     | `@rivinia/select` | `@rivinia/select/ui` |
| ------------------------------------------ | :---------------: | :------------------: |
| `RiviniaSelectComponent` (`<rv-select>`)   |         —         |          ✅          |
| `SelectChange`                             |         —         |          ✅          |
| `RiviniaSelect` (headless controller)      |        ✅         |          —           |
| `RiviniaSelectController`                  |        ✅         |          —           |
| `RiviniaSelectOption`, `RiviniaSelectMode` |        ✅         |          —           |

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

## Quick start

```ts
// src/app/invoice-filter.component.ts
import { Component } from '@angular/core';
import { RiviniaSelectComponent } from '@rivinia/select/ui';
import type { SelectChange } from '@rivinia/select/ui';

@Component({
  selector: 'app-invoice-filter',
  imports: [RiviniaSelectComponent],
  templateUrl: './invoice-filter.component.html',
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

```html
<!-- src/app/invoice-filter.component.html -->
<rv-select
  [options]="invoices"
  [searchable]="true"
  label="Status"
  placeholder="Status…"
  (selectionChange)="apply($event)"
/>
```

```ts
// src/app/tag-picker.component.ts
import { Component } from '@angular/core';
import { RiviniaSelect } from '@rivinia/select';
import { RiviniaSelectComponent } from '@rivinia/select/ui';
import type { SelectChange } from '@rivinia/select/ui';

@Component({
  selector: 'app-tag-picker',
  imports: [RiviniaSelectComponent],
  templateUrl: './tag-picker.component.html',
})
export class TagPickerComponent {
  readonly tags = new RiviniaSelect('multi');
  readonly tagOptions = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];

  on(value: SelectChange): void {
    console.log(value);
  }
}
```

```html
<!-- src/app/tag-picker.component.html -->
<rv-select [select]="tags" [options]="tagOptions" (selectionChange)="on($event)" />
```

Single mode picks one value and closes; multi mode toggles with a check mark and
stays open — without closing, so the filter you typed survives the pick.
The multi trigger is a **summary, not a list**: it shows the first picked label
and a `+N` pill for the rest, so neither its width nor its height moves as picks
accumulate. Removing the first pick promotes the next one. The full selection
stays available to assistive technology as the trigger's accessible
description, in the page language (see [Accessibility](#accessibility)).
Typing filters, Tab moves focus into the list, Enter picks the top match.
Disabled options render but refuse picks. Rich per-option custom content
(icons, badges, headers) is not supported by `rv-select`; drive it yourself from
the headless `RiviniaSelect` controller.

## API

> **Naming note:** the headless controller input is named `select` on
> `rv-select`. It is a **controller input**, not a DOM name — the rendered
> markup is `rv-select`, `.rv-select-trigger`, `.rv-select-popup-panel` and
> `.rv-select-popup-item`. The package's popup shares no vocabulary with
> `@rivinia/menu` and has no dependency on it — the two used to collide
> (same `rv-menu` selector), which is why the popup is now `rv-select-popup`.

| Export                       | Kind      | Purpose                                                                                                                                                                               |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RiviniaSelect`              | class     | `options/query/filtered/value/values/selectedLabels` signals + `registerOption/unregisterOption/syncOptions/setQuery/select/toggle/setValue/setValues/clear/isSelected`               |
| `RiviniaSelectOption`        | interface | `{ id, label, disabled?, hint? }`. `hint` renders right-aligned in muted monospace (e.g. a keyboard shortcut). Typeahead matches on `label` only.                                     |
| types                        | types     | `RiviniaSelectController` (structural UI contract), `RiviniaSelectOption`, `RiviniaSelectMode`                                                                                        |
| `RiviniaSelectComponent`     | ui        | `rv-select`: `select/mode/options/searchable/placeholder/searchPlaceholder/emptyLabel/placement/label/ariaLabel/popupLabel/searchLabel` + `selectionChange/opened/closed` + `clear()` |
| `computeSelectPopupPosition` | ui        | Pure top-layer placement math, used by the built-in panel. RTL-aware.                                                                                                                 |

### Inputs

| Input               | Type                              | Default            | Notes                                                                                     |
| ------------------- | --------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `options`           | `readonly RiviniaSelectOption[]`  | `[]`               | Re-synced into the controller on change. Each option may carry an optional `hint` string. |
| `optionTemplate`    | `TemplateRef<unknown> \| null`    | `null`             | Custom markup for each option row — icons, avatars, badges. See Icons.                    |
| `listTemplate`      | `TemplateRef<unknown> \| null`    | `null`             | Replaces the whole list — for a virtualised one. See Paged data.                          |
| `loading`           | `boolean`                         | `false`            | Shows a loader row under the list.                                                        |
| `loadingLabel`      | `string`                          | `'Loading…'`       | Text of the loader row.                                                                   |
| `select`            | `RiviniaSelectController \| null` | `null`             | External controller. Omitted: the component owns one matching `mode()`.                   |
| `mode`              | `'single' \| 'multi'`             | `'single'`         | Fixed at construction when the component owns the controller.                             |
| `searchable`        | `boolean`                         | `false`            | Shows the filter box.                                                                     |
| `placeholder`       | `string`                          | `'Select…'`        | Trigger text with no selection.                                                           |
| `searchPlaceholder` | `string`                          | `'Search…'`        | Filter box hint.                                                                          |
| `emptyLabel`        | `string`                          | `'No results'`     | Shown when the filter matches nothing.                                                    |
| `placement`         | `SelectPlacement`                 | `'bottom-start'`   | Panel placement relative to the trigger. Logical, so RTL-aware.                           |
| `label`             | `string \| null`                  | `null`             | Visible caption; becomes the trigger's accessible name (`aria-labelledby`).               |
| `ariaLabel`         | `string \| null`                  | `null`             | Explicit accessible name for the trigger; used when there is no caption.                  |
| `popupLabel`        | `string \| null`                  | `null`             | Accessible name for the opened panel (`aria-label`); falls back to `label`.               |
| `searchLabel`       | `string`                          | `'Search options'` | Accessible name for the filter box.                                                       |
| `variant`           | `'simple' \| 'premium'`           | `'simple'`         | Skin. Reflected as `data-variant`; styling only, no behaviour change. See Variants.        |

### Outputs

| Output            | Payload                                                 | When                               |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `selectionChange` | `string \| null` (single) / `readonly string[]` (multi) | A pick, or `clear()`.              |
| `opened`          | `void`                                                  | Panel opened.                      |
| `reachEnd`        | `void`                                                  | The panel scrolled near its end.   |
| `panelReady`      | `HTMLElement`                                           | The panel element — emitted again on every open. |
| `closed`          | `void`                                                  | Panel closed.                      |

### The controller

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
| `select(id)`             | method                                   | Single-mode pick. Returns `false` for an unknown or disabled id.                                                     |
| `toggle(id)`             | method                                   | Multi-mode toggle. Returns `false` for an unknown/disabled id **and in single mode**.                                |
| `clear()`                | method                                   | Clears the value (single) or the values (multi).                                                                     |
| `setValue(id)`           | method                                   | Force a value, bypassing the unknown/disabled guards of `select` — for a form restore whose options have not loaded. |
| `setValues(ids)`         | method                                   | Force the values — the array counterpart of `setValue`.                                                              |
| `isSelected(id)`         | method                                   | Whether the id is currently selected.                                                                                |

`RiviniaSelectController` is the **structural** subset of that surface. A UI
layer may depend on the interface instead of the class, which keeps a
controller usable across module realms (the same dual-realm rule
`@rivinia/modal`'s host manager follows).

## Forms

`rv-select` supports Signal Forms, Reactive Forms, and template-driven forms
with Angular 22. The examples are standalone components; import
`RiviniaSelectComponent` and the forms API used by your chosen approach into
that component.

### Signal Forms (`[formField]`)

```ts
// src/app/signal-invoice-filter.component.ts
import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { RiviniaSelectComponent } from '@rivinia/select/ui';

@Component({
  selector: 'app-signal-invoice-filter',
  imports: [FormField, RiviniaSelectComponent],
  templateUrl: './signal-invoice-filter.component.html',
})
export class SignalInvoiceFilterComponent {
  readonly invoices = [
    { id: 'paid', label: 'Paid' },
    { id: 'void', label: 'Void', disabled: true },
  ];

  readonly model = signal<{ status: string | null }>({ status: null });
  readonly myForm = form(this.model);
}
```

```html
<!-- src/app/signal-invoice-filter.component.html -->
<rv-select [formField]="myForm.status" [options]="invoices" label="Status" />
```

### Reactive Forms (`formControlName`)

```ts
// src/app/edit-invoice-status.component.ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RiviniaSelectComponent } from '@rivinia/select/ui';

@Component({
  selector: 'app-edit-invoice-status',
  imports: [ReactiveFormsModule, RiviniaSelectComponent],
  templateUrl: './edit-invoice-status.component.html',
})
export class EditInvoiceStatusComponent {
  readonly invoices = [
    { id: 'draft', label: 'Draft' },
    { id: 'sent', label: 'Sent' },
    { id: 'paid', label: 'Paid' },
    { id: 'void', label: 'Voided' },
  ];

  private readonly _fb = inject(FormBuilder);

  readonly form = this._fb.group({
    status: this._fb.control<string | null>('sent'),
  });
}
```

```html
<!-- src/app/edit-invoice-status.component.html -->
<form [formGroup]="form">
  <rv-select formControlName="status" [options]="invoices" label="Status" />
</form>
```

Here the existing invoice starts as `sent`; use `null` instead when the form is
for creating a new invoice with no status selected yet.

### Template-driven (`ngModel`)

```ts
// src/app/template-invoice-filter.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RiviniaSelectComponent } from '@rivinia/select/ui';

@Component({
  selector: 'app-template-invoice-filter',
  imports: [FormsModule, RiviniaSelectComponent],
  templateUrl: './template-invoice-filter.component.html',
})
export class TemplateInvoiceFilterComponent {
  readonly invoices = [
    { id: 'paid', label: 'Paid' },
    { id: 'void', label: 'Void', disabled: true },
  ];

  status: string | null = null;
}
```

```html
<!-- src/app/template-invoice-filter.component.html -->
<rv-select [(ngModel)]="status" name="status" [options]="invoices" label="Status" />
```

Each example uses single mode, whose value is `string | null`. For multi
selection, set `mode="multi"` and use a `readonly string[]` model/control value.

### Value types

| Mode     | Value type          |
| -------- | ------------------- |
| `single` | `string \| null`    |
| `multi`  | `readonly string[]` |

### Manual wiring (still works)

```html
<rv-select [options]="invoices" (selectionChange)="onStatusChange($event)" />
```

### Form state

- **Disabled:** the form system sets the `disabled` input; the trigger becomes
  non-interactive and the panel cannot open.
- **Touched:** emitted when focus leaves the whole interaction (trigger + panel),
  matching the `FormValueControl` contract.
- **Validation errors / invalid:** reflected as `aria-invalid="true"` on the
  trigger.

## The controller in the injector

`new RiviniaSelect('multi')` is opaque to Angular: it cannot be overridden in
a test and it is invisible to the injector graph. A root singleton would be
wrong — the controller is per-select state — so the provider form is used
instead. The provider **creates** the controller in its injector; `rv-select`
never looks it up, so you bind it explicitly with `[select]`:

```ts
import { Component, inject, signal } from '@angular/core';
import {
  injectRiviniaSelect,
  provideRiviniaSelect,
  type RiviniaSelectOption,
} from '@rivinia/select';

@Component({
  providers: [provideRiviniaSelect('multi')],
  template: `<rv-select [select]="controller" [options]="options()" />`,
})
export class TagPicker {
  readonly controller = injectRiviniaSelect();
  readonly options = signal<readonly RiviniaSelectOption[]>([]);
}
```

One provider is one controller per injector. Two independent selects need two
injectors (component-level `providers`) or the constructor — that is also why
`rv-select` does not inject the token itself: an implicit lookup would hand the
same instance to every select below the provider.

A test replaces it without touching the component:

```ts
TestBed.configureTestingModule({
  providers: [{ provide: RIVINIA_SELECT, useValue: fakeController }],
});
```

`injectRiviniaSelect()` throws when nothing is provided, rather than handing
back `undefined` and failing much later somewhere unrelated.

### Ownership rules

- **No `[select]`** — the component owns a controller and `mode` selects it.
  Independent selects have independent state.
- **`[select]`** — the external controller is authoritative, including its
  `mode`; the `mode` input is ignored. Bind the injected controller with
  `[select]="controller"`.
- **Sharing one controller** across components is supported when they represent
  one logical value (usually both binding the same `[(value)]`). They then share
  selection and query, keep their own panels, and share one option registry —
  the last component to mirror `options` wins. Unrelated selects with different
  lists need separate controllers.

**Registered options are frozen.** `readonly` on `RiviniaSelectOption` is a
compile-time promise only; an option that could be mutated after registration
would let the filtered list and the selection disagree. The registry holds
`Object.freeze`d copies.

## Headless usage

`@rivinia/select` (the headless entry point) is the whole selection behaviour
with **no DOM**: an option registry, an accent-insensitive filter, and a
single/multi value. The UI entry point is one implementation on top of it —
you are not obliged to use it.

Per D21, the headless controller is the product; pixels are yours.

### A complete headless example

A searchable filter with no UI of our own — a plain `<input>` plus a `<ul>`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RiviniaSelect, type RiviniaSelectOption } from '@rivinia/select';

@Component({
  selector: 'app-invoice-filter',
  template: `
    <input
      type="search"
      [value]="controller.query()"
      (input)="controller.setQuery($any($event.target).value)"
      placeholder="Filter invoices…"
    />

    @if (controller.filtered().length === 0) {
      <p>No invoice matches "{{ controller.query() }}"</p>
    } @else {
      <ul>
        @for (invoice of controller.filtered(); track invoice.id) {
          <li>
            <button type="button" (click)="pick(invoice)">
              {{ invoice.label }}
              @if (invoice.hint) {
                <kbd>{{ invoice.hint }}</kbd>
              }
            </button>
          </li>
        }
      </ul>
    }

    @if (controller.selectedLabels().length > 0) {
      <p>Chosen: {{ controller.selectedLabels().join(', ') }}</p>
    }
  `,
})
export class InvoiceFilter {
  readonly controller = new RiviniaSelect('single');
  readonly options: readonly RiviniaSelectOption[] = [
    { id: 'inv-001', label: 'Invoice 001', hint: 'Ctrl+B' },
    { id: 'inv-002', label: 'Invoice 002', hint: 'Ctrl+I' },
    { id: 'inv-003', label: 'Invoice 003', disabled: true },
  ];

  constructor() {
    // One-shot registration. `syncOptions` is the reactive alternative.
    for (const option of this.options) this.controller.registerOption(option);
  }

  pick(invoice: RiviniaSelectOption): void {
    this.controller.select(invoice.id);
  }
}
```

Notes on that example:

- **The filter is accent- and case-insensitive.** `normalize()` lowercases and
  strips diacritics, so `releve` finds `Relevé`, and Arabic tashkeel, tatweel
  and alef forms are folded (verified in the unit suite).
- **`disabled` options stay in the list** but refuse a pick — `select()`
  returns `false`. That keeps the list stable while typing.
- **`hint` is display-only.** It never participates in the filter.
- **`selectedLabels` falls back to the raw id** when the option is not
  registered, so a value restored from storage before its options loaded still
  displays something meaningful instead of an empty trigger.

### Keeping the registry in sync with a signal

When the options come from an API, mirror them with `syncOptions` inside an
`effect`:

```ts
@Component({
  selector: 'app-status-filter',
  imports: [ReactiveFormsModule],
  template: `
    <rv-select
      label="Status"
      mode="multi"
      [options]="statuses()"
      (selectionChange)="chosen.set($event)"
    />
  `,
})
export class StatusFilter {
  readonly statuses = signal<readonly RiviniaSelectOption[]>([]);
  readonly chosen = signal<readonly string[]>([]);
  private readonly controller = new RiviniaSelect('multi');

  constructor() {
    effect(() => this.controller.syncOptions(this.statuses()));
  }
}
```

**Why this converges.** `syncOptions` _replaces_ the registry and never reads
the signal it writes, so the mirroring effect has exactly one tracked
dependency — your `options` signal. Measured: the effect runs **once** for a
static list, not once per render. (An effect that read the registry it
wrote would re-arm itself forever — an infinite change-detection loop, not a
slow one. `syncOptions` deliberately avoids that shape.)

**What gets dropped.** `syncOptions` is a replacement, not a merge: an id that
is not in the incoming list is removed, and the selection is pruned with it.
If you need to restore a value before its options have loaded, keep it in your
own state and apply it once the list arrives.

## Building a custom dropdown UI

`rv-select` is one implementation. If your design needs rows with avatars,
badges, group headers, or a different visual treatment, drive the headless
controller yourself and render your own markup.

The contract the controller gives you:

| Signal / method    | What your UI does with it                                                  |
| ------------------ | -------------------------------------------------------------------------- |
| `query`            | The filter box's value. Bind both ways with `setQuery`.                    |
| `filtered`         | The rows to render, already filtered.                                      |
| `value` / `values` | The current selection; render the check mark or radio from it.             |
| `selectedLabels`   | The selected labels in pick order; the built-in trigger shows the first and a `+N` pill. |
| `isSelected(id)`   | Per-row selected state.                                                    |
| `select(id)`       | Single-mode pick. Returns `false` when the row is disabled — respect that. |
| `toggle(id)`       | Multi-mode pick.                                                           |
| `clear()`          | The clear button.                                                          |

A minimal custom dropdown, single mode, with a grouped list:

```ts
import { Component, computed, signal } from '@angular/core';
import { RiviniaSelect, type RiviniaSelectOption } from '@rivinia/select';

interface Group {
  readonly label: string;
  readonly items: readonly RiviniaSelectOption[];
}

@Component({
  selector: 'app-grouped-select',
  template: `
    <button type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()">
      {{ controller.selectedLabels()[0] ?? 'Pick one' }}
    </button>

    @if (open()) {
      <div class="menu" role="listbox">
        @for (group of groups; track group.label) {
          <p class="group">{{ group.label }}</p>
          @for (item of group.items; track item.id) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="controller.isSelected(item.id)"
              [disabled]="item.disabled ?? false"
              (click)="choose(item)"
            >
              {{ item.label }}
            </button>
          }
        }
      </div>
    }
  `,
})
export class GroupedSelect {
  readonly controller = new RiviniaSelect('single');
  readonly open = signal(false);

  readonly groups: readonly Group[] = [
    {
      label: 'Open',
      items: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta', disabled: true },
      ],
    },
    { label: 'Closed', items: [{ id: 'c', label: 'Gamma' }] },
  ];

  constructor() {
    for (const group of this.groups) {
      for (const item of group.items) this.controller.registerOption(item);
    }
  }

  choose(item: RiviniaSelectOption): void {
    if (this.controller.select(item.id)) this.open.set(false);
  }
}
```

**What the controller does NOT do for you**, so you can budget for it:

- **No positioning.** The built-in panel uses CSS anchor positioning (see
  Theming). Your own markup must place itself — either with the same
  `anchor-name` / `position-area` pair, or by not being a top-layer element.
- **No keyboard model.** Arrows, Home/End, Enter, Escape and Tab are yours.
  `@rivinia/menu` gives you a complete, audited menu-button implementation if
  you want to compose rather than write it.
- **No ARIA.** `role="listbox"` / `role="option"` / `aria-selected` above are
  yours to keep consistent; the built-in panel uses `role="menu"` with
  `menuitem` rows.
- **No scroll or focus management.** The built-in panel moves focus into the
  option list and returns it to the trigger on close.

If you want the keyboard and ARIA for free but your own pixels, compose the
headless controller with `@rivinia/menu`'s UI, which is a separate package
with no dependency on this one.

## Icons, avatars and custom rows

The default option row is a label, an optional hint and a check mark. When you
need an icon, an avatar or a badge, supply a template — it replaces the row's
content and nothing else:

```html
<ng-template #row let-option>
  <img class="size-4 shrink-0" [src]="option.icon" alt="" />
  <span>{{ option.label }}</span>
  @if (option.badge) {
  <span class="badge">{{ option.badge }}</span>
  }
</ng-template>

<rv-select label="Icon picker" [options]="options" [optionTemplate]="row" />
```

The `<button>` wrapper stays, so the ARIA, the keyboard handling, the
disabled state and the multi-mode check keep working. What changes is the
content inside it — which means the hint and the check mark become yours to
render too.

The template context is the option, and it is typed **loosely on purpose**:
your option shape (with an `icon`, say) is not the library's type, and the
template is yours to narrow:

```ts
interface IconOption {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly disabled?: boolean;
}

readonly options: readonly IconOption[] = [
  { id: 'a', label: 'Alpha', icon: '/a.svg' },
];
```

**Why a template and not an `icon` field.** An icon field would put raw markup
(or a URL the library has to fetch) into the component's hands, and every
consumer's icons are different — a URL, an inline SVG, an icon font, an
`<img>`. A template keeps that decision with you.

If you want more than a row — group headers, a two-line description, a
nested menu — drive the headless controller and render the list yourself
(see Building a custom dropdown UI).

## Paged data: loading, virtual lists, "load more"

A select whose options come from a paged API needs three things, and the
component provides all three.

**A loader row**, while a request is in flight:

```html
<rv-select [options]="options()" [loading]="loading()" (reachEnd)="loadMore()" />
```

**`reachEnd`**, emitted when the panel scrolls close to its end — so the
consumer fetches the next page:

```ts
loadMore() {
  this.api.nextPage().then((page) => this.options.update((all) => [...all, ...page]));
}
```

The threshold is a **length**, not a percentage: the panel's scrollable height
changes as rows arrive, so a percentage would fire at a different row every
time.

```css
rv-select {
  --rv-select-popup-reach-end-offset: 3rem;
}
```

**A footer slot**, for a "Load more" button or anything else under the list:

```html
<rv-select [options]="options()">
  <button rv-select-popup-footer type="button" (click)="loadMore()">Load more</button>
</rv-select>
```

### A virtualised list

For a long list, render only the visible rows. `listTemplate` replaces the
whole list, and `panelReady` hands you the panel element — which is the scroll
container the virtualizer needs:

```html
<ng-template #list let-options>
  <div [style.height.px]="virtualizer.getTotalSize()" style="position: relative">
    @for (row of virtualizer.getVirtualItems(); track row.index) {
    <div
      [style.transform]="'translateY(' + row.start + 'px)'"
      style="position: absolute; top: 0; left: 0; width: 100%"
    >
      {{ options[row.index].label }}
    </div>
    }
  </div>
</ng-template>

<rv-select [options]="options()" [listTemplate]="list" (panelReady)="panel.set($event)" />
```

```ts
readonly panel = signal<HTMLElement | null>(null);

readonly virtualizer = injectVirtualizer(() => ({
  scrollElement: this.panel(),
  count: this.options().length,
  estimateSize: () => 36,
  overscan: 5,
}));
```

With a virtual list you own the scroll, so `reachEnd` is yours to detect —
the usual way is the virtualizer's own last-row check:

```ts
const items = this.virtualizer.getVirtualItems();
const last = items[items.length - 1];
if (last && last.index >= this.options().length - 1) this.loadMore();
```

`@tanstack/angular-virtual` is the usual choice, but any virtualizer works —
it only needs the scroll element and the row count.

Keyboard navigation reveals the active row with
`scrollIntoView({ block: 'nearest' })`. A virtualiser owns the other half: when
the active row is not mounted (it is outside the rendered window), there is no
element to reveal, so scroll to it yourself — `virtualizer.scrollToIndex()` in
an effect keyed on your selected value — and let the component reveal rows
within the rendered window.

The panel is destroyed on close and built again on the next open, so
`panelReady` fires **once per open with a new element**. Keep it in a signal
and rebind your scroll listener when it changes; caching the first element
leaves the list scrolling a detached node after the first reopen.

### A custom entrance animation

The whole animation is **one token**, so you never fight the cascade:

```css
my-scope {
  --rv-select-popup-animation: my-slide-in 200ms cubic-bezier(0.2, 0, 0, 1);
}
```

A token rather than an `animation` override on purpose: Angular injects a
component's styles into `<head>` at runtime, which is _after_ your stylesheet,
so at equal specificity the library's declaration would win.

The two halves are still separate if you only want one of them:

```css
my-scope {
  --rv-select-popup-duration: 240ms;
  --rv-select-popup-easing: cubic-bezier(0.2, 0, 0, 1);
}
```

## The override surface

**Tokens** for colour and shape:

```css
rv-select {
  --rv-select-bg: #101014;
  --rv-select-fg: #f2f2f7;
  --rv-select-border: #2a2a33;
  --rv-select-radius: 6px;
}
```

**Tokens** for the metrics:

```css
rv-select {
  --rv-select-trigger-padding: 0.625rem 0.875rem;
  --rv-select-trigger-size: 0.9375rem;
  --rv-select-item-padding: 0.75rem 0.875rem;
  --rv-select-item-radius: 0.25rem;
  --rv-select-item-min-height: 2.75rem;
  --rv-select-focus-ring: 2px solid var(--rv-accent);
}
```

**Classes** for anything the tokens do not cover. The component styles are
unencapsulated, so these selectors are global and stable:

```css
/* Roomier rows, square corners, no hover tint. */
.rv-select-popup-panel [rvselectpopupitem] {
  padding: 16px 20px;
  border-radius: 0;
}
.rv-select-popup-panel [rvselectpopupitem]:hover {
  background: transparent;
}
```

The selectors, and the `data-*` state hooks:

| Selector                                     | What it styles              |
| -------------------------------------------- | --------------------------- |
| `.rv-select-caption`                         | the label above the trigger |
| `.rv-select-trigger`                         | the button                  |
| `.rv-select-value`                           | the trigger's text          |
| `.rv-select-count`                           | the multi `+N` pill         |
| `.rv-select-sr-only`                         | the hidden multi description |
| `.rv-select-chevron`                         | the chevron                 |
| `.rv-select-search`                          | the filter box              |
| `.rv-select-empty`                           | the "no results" state      |
| `.rv-select-hint`                            | an option's trailing hint   |
| `.rv-select-check`                           | the multi-mode check mark   |
| `.rv-select-popup-panel`                     | the opened panel            |
| `.rv-select-popup-panel [rvselectpopupitem]` | an option row               |

| Hook              | On      | Means                          |
| ----------------- | ------- | ------------------------------ |
| `data-open`       | trigger | the panel is open              |
| `data-active`     | option  | the keyboard-active row        |
| `data-placement`  | panel   | `bottom-start`, `top-end`, …   |
| `data-flipped`    | panel   | it flipped to the other side   |
| `data-positioned` | panel   | it has been measured           |
| `data-top-layer`  | panel   | it is in the browser top layer |

## Variants

One input picks the skin. Nothing else about the component changes — same
controller, same keyboard contract, same ARIA.

```html
<rv-select [options]="options" variant="premium" />
```

| Value       | What you get                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `'simple'`  | The default. The pre-variant skin, unchanged — including its 160ms entrance. The flag changes nothing.     |
| `'premium'` | A slower, softer entrance, layered shadow, thin styled scrollbar, hover/active wash, loading skeleton.    |

`<rv-select>` forwards its own value to the panel it builds, so a custom
`listTemplate` inside it still gets the premium chrome. (`<rv-select-popup>` is
the panel primitive and takes the same input, but it is internal — the select
is its only caller; drive the headless controller instead if you need your own
markup.)

The value lands on both hosts as `data-variant`, and every premium rule is
scoped under `[data-variant='premium']`. There is no branch in the component
logic and no extra work when the flag is off — the browser matches a selector
or it does not.

### What premium actually does

- **Entrance, 250ms.** Both skins animate in; premium retunes the shot — 250ms
  on `cubic-bezier(0.22, 1, 0.36, 1)`, rising 4px from `scale(0.97)`, where
  simple keeps the original 160ms / 6px / `0.96`. On a `top-*` placement the
  travel flips. Tune with `--rv-select-popup-duration`,
  `--rv-select-popup-easing`, `--rv-select-popup-from-scale`,
  `--rv-select-popup-from-y`.
- **No exit animation, by design.** The panel is a real top-layer element; a
  closing animation would keep it over the page swallowing clicks, hand
  `panelReady` a node that the virtualiser is about to lose, and let the next
  open latch onto the leaving element. Close is instant.
- **Rows.** Hover washes in at 150ms, out at 250ms; the keyboard-active row
  sits one step stronger.
- **Scrollbar.** `scrollbar-width: thin` and `scrollbar-color` on the panel.
  These are the standard properties — the `::-webkit-scrollbar` pseudo-elements
  are ignored by Chromium as soon as `scrollbar-color` is set, so the library
  ships only the standard pair. The actual width is the OS's call: 8–12px on
  Chromium, overlay on macOS, always visible on Windows.
- **Loading row.** While `[loading]="true"` the row shows three shimmering bars
  next to `loadingLabel`. They are static under
  `prefers-reduced-motion: reduce`.
- **Search and trigger.** A 1px resting shadow, a 14% foreground border, and a
  search field that is a quiet inset wash rather than a bordered box.

Every value above resolves through the same token chain as the rest of the
library, so a `--rv-select-*` or `--rv-*` you already set still wins:

```css
:root {
  --rv-select-trigger-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  --rv-select-popup-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  --rv-select-popup-duration: 180ms;
}
```

Selected rows carry `data-selected="true"` in both skins — a hook for your own
styling, with no paint of its own (the check mark already reads as selected).

Cost of shipping both skins, measured on the packed tarball: **+801 B brotli
/ +1,292 B gzip** on the `@rivinia/select/ui` chunk, **0 B** on the headless
`@rivinia/select` entry point.

## Theming

Every component reads **its own token → the shared semantic layer → its
built-in default**:

```css
--rv-select-bg  →  --rv-bg  →  #ffffff
```

Three levels, each beating the next:

| Level          | Token            | Scope                               |
| -------------- | ---------------- | ----------------------------------- |
| 1. per package | `--rv-select-bg` | that component only                 |
| 2. global      | `--rv-bg`        | every Rivinia component, everywhere |
| 3. default     | —                | what you get if you set nothing     |

### The semantic layer

```css
:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
  --rv-muted: #555555;
  --rv-border: #e0e0e0;
  --rv-radius: 10px;
  --rv-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  --rv-font: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --rv-accent: #5b5bd6;
  --rv-danger: #dc2626;
  --rv-ok: #16a34a;
  --rv-info: #2563eb;
  --rv-warning: #d97706;
}
```

Import it once, or define the names yourself:

```css
@import '@rivinia/theme';
```

Its defaults sit in `@layer rivinia-theme`, so your unlayered `:root` rules win
wherever they appear.

**Map it on `:root`, never on a component element** — an element-level
declaration shadows the root value and the override silently stops working.

### Which styling stack?

| Stack           | Import                                       |
| --------------- | -------------------------------------------- |
| **Plain CSS**   | `@import '@rivinia/theme';`                  |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';`     |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';`    |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';`                |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` |

**Plain CSS** — set the layer, done:

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
}
```

**Tailwind v4** — your palette in `@theme`, the components point at it:

```css
@import 'tailwindcss';
@import '@rivinia/theme/tailwind.css';

@theme {
  --color-surface: #ffffff;
  --color-fg: #111111;
}

:root {
  --rv-bg: var(--color-surface);
  --rv-fg: var(--color-fg);
}
```

Optional, to expose the component surface as utilities too:

```css
@theme inline {
  --color-rv-select-bg: var(--rv-select-bg);
  --color-rv-select-fg: var(--rv-select-fg);
}
```

`@theme` is for a literal value; `@theme inline` is for one that references
another variable, so the utility resolves at use-site.

Dark mode in one place:

```css
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

@theme {
  --color-surface: #ffffff;
  --color-fg: #111111;
}

[data-theme='dark'] {
  --color-surface: #161616;
  --color-fg: #f2f2f2;
}

:root {
  --rv-bg: var(--color-surface);
  --rv-fg: var(--color-fg);
}
```

**Bootstrap 5.3** — the components read Bootstrap's own variables:

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

which is this, under both colour schemes:

```css
:root,
[data-bs-theme='light'],
[data-bs-theme='dark'] {
  --rv-bg: var(--bs-body-bg);
  --rv-fg: var(--bs-body-color);
  --rv-border: var(--bs-border-color);
  --rv-muted: var(--bs-secondary-color);
}
```

A `data-bs-theme` switch then re-themes the components with no extra wiring.

**Sass** — Dart Sass loads a plain `.css` file, but the extension must be
omitted for `@use` to treat it as a module:

```scss
@use '@rivinia/theme/scss';
```

**Less** — custom properties pass through untouched:

```less
@import (less) '@rivinia/theme/theme.css';
```

Less **variables** (`@color: …`) are a different mechanism and do not
interoperate with CSS custom properties — use `var(--rv-*)` inside Less files.

**Every size is in `rem`, not `px`.** The components scale with the reader's
root font size, so they follow the browser's text-size preference, a
user-set accessibility default, and whatever `html { font-size }` the app
sets. Measured: at a 17px root the trigger is 14.875px with `0.5rem 0.75rem`
padding; at a 24px root it is 21px with `0.75rem 1.125rem` padding. In `px`
none of it would have moved.

### The library's own tokens

| Token                | Default                       | Applies to        |
| -------------------- | ----------------------------- | ----------------- |
| `--rv-select-bg`     | `#ffffff`                     | trigger + panel   |
| `--rv-select-fg`     | `#111111`                     | trigger + panel   |
| `--rv-select-border` | `#e0e0e0`                     | trigger + search  |
| `--rv-select-muted`  | `#555555`                     | chevron, empty    |
| `--rv-select-error`  | `#dc2626`                     | invalid trigger   |
| `--rv-select-radius` | `0.625rem`                    | trigger + panel   |
| `--rv-select-shadow` | `0 16px 48px rgba(0,0,0,.22)` | panel             |
| `--rv-select-width`  | `14rem`                       | select reference width; panel follows it |

**The panel is the trigger's width.** `--rv-select-width` is the control's
**reference width**, not a floor: `rv-select` is
`width: min(var(--rv-select-width, 14rem), 100%)` with `max-width: 100%` and
`min-width: 0`. The trigger fills it and the panel follows the trigger exactly,
so the two read as one control. Content never decides the width — picking eight
options leaves the trigger exactly where it was; the multi summary above keeps
a long selection on one line. Widen the token and all three grow together; set
it to `100%` for a full-width field. In flex and grid, `min-width: 0` overrides
the automatic minimum size of a `nowrap` item, so a narrow cell shrinks the
control instead of pushing it out.

**Narrow containers.** Below the reference width the container wins: the
control shrinks with it, the trigger value truncates with an ellipsis and
nothing overflows. Option labels wrap (a 60-character unbroken string wraps
instead of widening the panel), and the panel never scrolls sideways: long
lists scroll **vertically** only. The smallest width that keeps a row on one
line is 10rem (160px); below that, labels wrap to two or three lines (measured
55–114px rows between 128px and 96px) while the trigger keeps its shape. The
trigger itself stops shrinking at the sum of its padding, gaps and chevron —
plus the pill in multi mode — so a cell narrower than that is carried by the
page, not by an overflowing control.

**No forced dark mode** — there is no `prefers-color-scheme` block anywhere in
the package, so a component can never override your explicit choice.

## Keyboard and focus

Single/multi share the same model:

- **Open:** Enter / Space on the trigger, or click.
- **Filter box (when `searchable`):** typing filters; the box owns its
  keystrokes (spaces never leak to the typeahead). Tab moves focus **into
  the list**; Enter picks the active option; Escape closes.
- **List:** ArrowDown / ArrowUp move the active option (disabled options are
  skipped); Home / End jump to the first / last enabled option; Enter / Space
  picks; Escape closes.
- **Typeahead:** typing in the list moves the active option to the next row
  whose **label** starts with what you typed. The `hint` is deliberately not
  part of the index, so a keyboard-shortcut hint never causes a match.
- **Single mode** closes on pick; **multi mode** toggles with a check mark and
  stays open.
- Opening focuses the filter box (when searchable) or the first enabled
  option. Closing resets the filter and returns focus to the trigger.

## Accessibility

Select is a **button + menu**, not an ARIA combobox and not a native
`<select>`. The shipped DOM (measured in Chromium, Firefox and WebKit):
the trigger is a `<button>` carrying `aria-haspopup="menu"`, `aria-expanded`
and `aria-controls` pointing at the panel; the panel is `role="menu"`; single
rows are `role="menuitem"`; multi rows are `role="menuitemcheckbox"` with
`aria-checked`. There is no `aria-multiselectable` — the checkbox rows carry
the state. Focus physically moves into the list, so there is no
`aria-activedescendant`.

Consequences to be aware of:

- Screen readers announce a menu, not a listbox and not a native `<select>`.
  If you need native-select or listbox semantics, use a native `<select>` or
  build the markup yourself on the headless controller; Select does not
  pretend to be one.
- Give the field an accessible name: a visible `label` (preferred) or
  `ariaLabel`. The opened panel should be named too, via `popupLabel` or by
  letting it fall back to the caption.
- `role="searchbox"` is used on the filter input; its name defaults to
  `'Search options'` and is configurable through `searchLabel`.

### What the multi trigger announces

The visible trigger shows only the first pick plus `+N`, so the rest of the
selection is carried by `aria-describedby` on the trigger:

| Name source             | Picks | Accessible description          |
| ----------------------- | ----- | ------------------------------- |
| `label`                 | ≥ 1   | every selected label            |
| `ariaLabel`, no caption | ≥ 1   | every selected label            |
| neither                 | 1     | none — the label is the value   |
| neither                 | ≥ 2   | every label after the first     |
| any                     | 0     | none — no attribute, no element |

The text lives in a visually hidden sibling of the trigger
(`.rv-select-sr-only`, clipped — not `display: none`, so the IDREF target stays
in the accessibility tree), is formatted with `Intl.ListFormat`
(`"TypeScript, Angular, and Signals"` in `en`, `"TypeScript وAngular
وSignals"` in `ar`) and carries no English prefix. The locale is
`document.documentElement.lang`: changing it re-renders the description live,
with no reload and no extra input. An invalid locale falls back to `en`; a
runtime without `Intl.ListFormat` joins with `', '`. The `+N` pill is
`aria-hidden`, so it appears in neither the name nor the description, and
clearing every pick removes the attribute and the hidden element together.

### Known verification gaps

- **No real screen reader testing** — automated axe checks only. Manual
  testing with NVDA/JAWS/VoiceOver is still required.
- **WebKit** is verified on this machine (27.2) after installing three system
  libraries Playwright's bundle expects — `libavif16`, `libgav1-1`, `libyuv0`.
  Without root, `apt-get download` plus `dpkg -x` and an `LD_LIBRARY_PATH` (or
  a symlink into `minibrowser-gtk/sys/lib`) is enough. `npx playwright
  install-deps webkit` does the same with root.
- **Safari proper is not tested** — WebKit is the engine, not the browser
  chrome (Safari's own top-layer and anchor support can lag the engine).
- **No Tailwind project** in the test suite.
- **No forced-colors / high-contrast** handling — supply your own
  `--rv-select-*` values under `@media (forced-colors: active)`.
- **No explicit `ControlValueAccessor` implementation.** In Angular 22,
  `rv-select` implements `FormValueControl`; Signal Forms use `[formField]`,
  and Reactive Forms and template-driven forms are covered by the package's
  integration tests (see Forms).

## Migration notes

### 0.7.0 → 0.7.1

**No API change** — same exports, inputs, outputs and class names. Two visible
changes in multi mode, both fixes:

- **The trigger is a summary.** It used to join every selected label
  (`Outstanding invoices, Paid, Overdue`), so the control grew with every pick —
  measured 272px → 637.3px inside a 544px cell — while the open panel stayed at
  the old width. It now shows the first picked label and a `+N` pill, and the
  full list moved to the accessible description. A custom trigger built on the
  controller can still join: `selectedLabels().join(', ')` is unchanged.
- **`--rv-select-width` is a reference width, not a floor.** The control is
  `min(var(--rv-select-width, 14rem), 100%)` instead of growing with content.
  If a select relied on its content to widen it, set the token (or a wrapper
  width); a select already inside a sized cell looks the same.

### 0.5.x → 0.6.0

**Two things to do, both mechanical.**

**1. If you styled a select by targeting its markup**, the panel's class names
changed. The select's private panel was called `rv-select-menu`; it is now
`rv-select-popup`, so it can no longer collide with `@rivinia/menu`.

| Was                       | Now                        |
| ------------------------- | -------------------------- |
| `.rv-select-menu-panel`   | `.rv-select-popup-panel`   |
| `.rv-select-menu-trigger` | `.rv-select-popup-trigger` |
| `[rvselectmenuitem]`      | `[rvselectpopupitem]`      |
| `rvSelectMenuItem`        | `rvSelectPopupItem`        |
| `rvSelectMenuTrigger`     | `rvSelectPopupTrigger`     |
| `rvSelectMenuPanel`       | `rvSelectPopupPanel`       |
| `--rv-select-menu-*`      | `--rv-select-popup-*`      |

If you only set `--rv-select-*` on `rv-select`, there is nothing to change —
those names are unchanged.

**2. If you bound `[menuLabel]`**, rename it to `[popupLabel]`.

```html
<rv-select [options]="options" [popupLabel]="Status options" />
```

**Everything else is additive**: the DI helpers, the loader, `reachEnd`, the
footer slot, `listTemplate`, the frozen options — and the RTL fix, which is
why 0.5.0 was unusable in a right-to-left layout.

### 0.4.x → 0.5.0 (popup rename, RTL panel fix, layout)

**No breaking change to the type-level API.** `rv-select` still exports
exactly `RiviniaSelectComponent` and `SelectChange`; no input, output or type you
bind has been renamed. What changed: the name of the vendored popup, and the CSS
that positions it.

### 0.1.1 → 0.2.0

- **Theming tokens renamed.** `--rv-menu-*` → `--rv-select-*`
  (see Theming). Update any CSS overrides.
- **Forced dark mode removed.** If you relied on the shipped dark palette,
  add your own `@media (prefers-color-scheme: dark)` block.
- **New inputs `label`, `ariaLabel`, `popupLabel`, `searchLabel`** are
  additive; existing templates keep working.
- **`toggle()` on a single-mode controller now returns `false`** instead of
  mutating `values`. It never had a defined meaning in single mode.
- **`clear()` on the component now emits `selectionChange`** (`null` single,
  `[]` multi). If you drove `clear()` at the controller level and reacted to
  `value()`/`values()` directly, nothing changes; if you listen to
  `selectionChange`, you will now also receive clears.

### Migration from 0.1.x theming

`0.1.x` consumed `--rv-menu-*` for Select styling and forced a dark palette.
If you themed Select through `--rv-menu-*`, move those rules to `--rv-select-*`:

```diff
-.app { --rv-menu-bg: #161616; --rv-menu-fg: #f2f2f2; }
+.app { --rv-select-bg: #161616; --rv-select-fg: #f2f2f2; }
```

## License

MIT.

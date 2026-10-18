# @rivinia/select

[![npm version](https://img.shields.io/npm/v/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)
[![license](https://img.shields.io/npm/l/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)

Headless select behavior for Angular 22+: option registry, accent-insensitive
search filter, and single/multi value — no DOM, no styling. Rendering lives in `@rivinia/select/ui` or your own UI. Select is **independently
installable** — it does not require `@rivinia/menu`.

- Package version: **0.4.2**
- Requires: **Angular `^22.0.0`** (`@angular/core` and `@angular/forms`). No dependency on `@rivinia/menu`.
- Side effects: **none** (`sideEffects: false`).

## Install

```bash
npm install @rivinia/select
```

The `0.4.2` package requires Angular 22.

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
  standalone: true,
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
  standalone: true,
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
stays open. Typing filters, Tab moves focus into the list, Enter picks the top
match. Disabled options render but refuse picks. Rich per-option custom content
(icons, badges, headers) stays the job of raw `rv-menu`.

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
  standalone: true,
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
  standalone: true,
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
  standalone: true,
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

## API

> **Naming note:** the headless controller input is named `select` on
> `rv-select` (mirroring `menu` on `rv-menu`). Both are controller inputs —
> the names differ only because each component's noun differs. This is
> intentional; renaming would be a breaking change for no functional gain.

| Export                   | Kind      | Purpose                                                                                                                                                                              |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RiviniaSelect`          | class     | `options/query/filtered/value/values/selectedLabels` signals + `registerOption/unregisterOption/syncOptions/setQuery/select/toggle/clear/isSelected`                                 |
| `RiviniaSelectOption`    | interface | `{ id, label, disabled?, hint? }`. `hint` renders right-aligned in muted monospace (e.g. a keyboard shortcut). Typeahead matches on `label` only.                                    |
| types                    | types     | `RiviniaSelectController` (structural UI contract), `RiviniaSelectOption`, `RiviniaSelectMode`                                                                                       |
| `RiviniaSelectComponent` | ui        | `rv-select`: `select/mode/options/searchable/placeholder/searchPlaceholder/emptyLabel/placement/label/ariaLabel/menuLabel/searchLabel` + `selectionChange/opened/closed` + `clear()` |

### Inputs

| Input               | Type                              | Default            | Notes                                                                                     |
| ------------------- | --------------------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `options`           | `readonly RiviniaSelectOption[]`  | `[]`               | Re-synced into the controller on change. Each option may carry an optional `hint` string. |
| `select`            | `RiviniaSelectController \| null` | `null`             | External controller. Omitted: the component owns one matching `mode()`.                   |
| `mode`              | `'single' \| 'multi'`             | `'single'`         | Fixed at construction when the component owns the controller.                             |
| `searchable`        | `boolean`                         | `false`            | Shows the filter box.                                                                     |
| `placeholder`       | `string`                          | `'Select…'`        | Trigger text with no selection.                                                           |
| `searchPlaceholder` | `string`                          | `'Search…'`        | Filter box hint.                                                                          |
| `emptyLabel`        | `string`                          | `'No results'`     | Shown when the filter matches nothing.                                                    |
| `placement`         | `RiviniaMenuUiPlacement`          | `'bottom-start'`   | Panel placement relative to the trigger.                                                  |
| `label`             | `string \| null`                  | `null`             | Visible caption; becomes the trigger's accessible name (`aria-labelledby`).               |
| `ariaLabel`         | `string \| null`                  | `null`             | Explicit accessible name for the trigger; used when there is no caption.                  |
| `menuLabel`         | `string \| null`                  | `null`             | Accessible name for the opened panel (`aria-label`); falls back to `label`.               |
| `searchLabel`       | `string`                          | `'Search options'` | Accessible name for the filter box.                                                       |

### Outputs

| Output            | Payload                                                 | When                  |
| ----------------- | ------------------------------------------------------- | --------------------- |
| `selectionChange` | `string \| null` (single) / `readonly string[]` (multi) | A pick, or `clear()`. |
| `opened`          | `void`                                                  | Panel opened.         |
| `closed`          | `void`                                                  | Panel closed.         |

## Theming and CSS tokens

`rv-select` owns its own `--rv-select-*` namespace. The opened panel reuses Select's own vendored menu primitives, so Select
bridges its tokens onto the panel element
**only** — a consumer's `--rv-menu-*` theme for a real `rv-menu` can no longer
bleed into a `rv-select`, and vice versa.

| Token                | Default                             | Applies to                          |
| -------------------- | ----------------------------------- | ----------------------------------- |
| `--rv-select-bg`     | `#ffffff`                           | trigger + panel                     |
| `--rv-select-fg`     | `#111111`                           | trigger + panel                     |
| `--rv-select-border` | `#e0e0e0`                           | trigger + search input              |
| `--rv-select-muted`  | `#555555`                           | chevron, placeholder, empty state   |
| `--rv-select-radius` | `10px` (trigger) / `12px` (panel)   | trigger + panel                     |
| `--rv-select-shadow` | `0 16px 48px rgba(0,0,0,0.22)`      | panel                               |
| `--rv-select-width`  | `14rem` (trigger) / `16rem` (panel) | trigger min-width + panel min-width |

All values are `var(--rv-select-*, fallback)` — an ancestor theme always wins.
**No forced dark mode:** there is no `@media (prefers-color-scheme: dark)`
block. Opt in yourself:

```css
@media (prefers-color-scheme: dark) {
  .my-scope {
    --rv-select-bg: #161616;
    --rv-select-fg: #f2f2f2;
  }
}
```

```html
<div class="my-scope">
  <rv-select [options]="invoices" />
</div>
```

### Migration from 0.1.x theming

`0.1.x` consumed `--rv-menu-*` for Select styling and forced a dark palette.
If you themed Select through `--rv-menu-*`, move those rules to `--rv-select-*`:

```diff
-.app { --rv-menu-bg: #161616; --rv-menu-fg: #f2f2f2; }
+.app { --rv-select-bg: #161616; --rv-select-fg: #f2f2f2; }
```

## Keyboard and focus

Single/multi share the same model:

- **Open:** Enter / Space on the trigger, or click.
- **Filter box (when `searchable`):** typing filters; the box owns its
  keystrokes (spaces never leak to the menu typeahead). Tab moves focus **into
  the list**; Enter picks the top match; Escape closes.
- **List:** ArrowDown / ArrowUp move the active option (disabled options are
  skipped); Enter / Space picks; Escape closes.
- **Single mode** closes on pick; **multi mode** toggles with a check mark and
  stays open.
- Opening focuses the filter box (when searchable) or the first enabled
  option. Closing resets the filter and returns focus to the trigger.

## Accessibility

Select is a **filterable menu**, not an ARIA combobox and not a native
`<select>`. The opened panel is exposed as `role="menu"` with `menuitem` /
`menuitemcheckbox` options; the trigger carries `aria-haspopup="menu"`,
`aria-expanded`, and `aria-controls`. Focus physically moves into the option
list, so there is no `aria-activedescendant`.

Consequences to be aware of:

- Screen readers announce it as a menu, not a form control. If you need
  native-select semantics, use a native `<select>` or a dedicated combobox
  library; Select does not pretend to be one.
- Give the field an accessible name: a visible `label` (preferred) or
  `ariaLabel`. The opened panel should be named too, via `menuLabel` or by
  letting it fall back to the caption.
- `role="searchbox"` is used on the filter input; its name defaults to
  `'Search options'` and is configurable through `searchLabel`.

### Known verification gaps

- **No real screen reader testing** — automated axe checks only. Manual
  testing with NVDA/JAWS/VoiceOver is still required.
- **WebKit cannot be launched** in this environment (missing system
  libraries); only Chromium and Firefox are verified. See
  `npx playwright install-deps webkit`.
- **No Tailwind project** in the test suite.
- **No forced-colors / high-contrast** handling — supply your own
  `--rv-select-*` values under `@media (forced-colors: active)`.
- **No explicit `ControlValueAccessor` implementation.** In Angular 22,
  `rv-select` implements `FormValueControl`; Signal Forms use `[formField]`,
  and Reactive Forms and template-driven forms are covered by the package's
  integration tests (see Forms).

## Migration notes

### 0.1.1 → 0.2.0

- **Theming tokens renamed.** `--rv-menu-*` → `--rv-select-*`
  (see Theming). Update any CSS overrides.
- **Forced dark mode removed.** If you relied on the shipped dark palette,
  add your own `@media (prefers-color-scheme: dark)` block.
- **New inputs `label`, `ariaLabel`, `menuLabel`, `searchLabel`** are
  additive; existing templates keep working.
- **`toggle()` on a single-mode controller now returns `false`** instead of
  mutating `values`. It never had a defined meaning in single mode.
- **`clear()` on the component now emits `selectionChange`** (`null` single,
  `[]` multi). If you drove `clear()` at the controller level and reacted to
  `value()`/`values()` directly, nothing changes; if you listen to
  `selectionChange`, you will now also receive clears.

## License

MIT.

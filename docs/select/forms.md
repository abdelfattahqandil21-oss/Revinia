# @rivinia/select — forms and the controller's owner

Back to [the README](../../projects/select/README.md) ·
[the API](api.md) · [headless usage](headless.md)

`rv-select` supports Signal Forms, Reactive Forms, and template-driven forms
with Angular 22. The examples are standalone components; import
`RiviniaSelectComponent` and the forms API used by your chosen approach into
that component.

## Signal Forms (`[formField]`)

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

## Reactive Forms (`formControlName`)

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

## Template-driven (`ngModel`)

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

## Value types

| Mode     | Value type          |
| -------- | ------------------- |
| `single` | `string \| null`    |
| `multi`  | `readonly string[]` |

## Manual wiring (still works)

```html
<rv-select [options]="invoices" (selectionChange)="onStatusChange($event)" />
```

`value` is a model input, so a plain two-way binding works too:
`<rv-select [(value)]="status" [options]="invoices" />`.

## Form state

- **Disabled:** the form system sets the `disabled` input; the trigger becomes
  non-interactive and the panel cannot open.
- **Touched:** emitted through `(touch)` when focus leaves the whole interaction
  (trigger + panel), matching the `FormValueControl` contract.
- **Validation errors / invalid:** reflected as `aria-invalid="true"` on the
  trigger.

There is **no explicit `ControlValueAccessor`**: in Angular 22 `rv-select`
implements `FormValueControl`, and Reactive Forms and template-driven forms are
covered by the package's integration tests.

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
back `undefined` and failing much later somewhere unrelated. `provideRiviniaSelect()`
takes the mode and defaults to `'single'`; the token
`RIVINIA_SELECT` is typed as the structural `RiviniaSelectController`, so a
test may provide a partial implementation.

## Ownership rules

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

## Further reading

- [The API](api.md) — every input, output and controller member.
- [Headless usage](headless.md) — driving the controller without `rv-select`.
- [Recipes](recipes.md) — keeping a registry in sync with a signal of rows from
  an API.

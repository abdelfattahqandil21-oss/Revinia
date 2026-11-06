# Forms

Bind the picker to Angular form APIs.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Forms

`value` is a `model()`, which is exactly the required member of Angular 22's
`FormValueControl`. So all three forms APIs work with no accessor:

```html
<!-- Reactive Forms -->
<rv-datepicker [formControl]="departure" />

<!-- Template-driven -->
<rv-datepicker [(ngModel)]="departure" />

<!-- Signal Forms -->
<rv-datepicker [formField]="form.departure" />
```

The datetime picker is the same contract, with a `RiviniaDateTime` value:

```html
<rv-datetimepicker [formControl]="appointment" />
<rv-datetimepicker [(ngModel)]="appointment" />
<rv-datetimepicker [formField]="form.appointment" />
```

A form writes the whole `{ date, time }` value at once. A form writing while
the panel is open updates the calendar and the time row; a day click or a time
edit is still a draft until `OK`, so the form never sees half a value. The
`resolved` output is the place to turn a valid `timeZone` into an instant for
your API — it is not a form value.

- `valueChange` is the model's output. It fires when the value really changed;
  a form writing the value in does **not** echo back.
- `touch` marks the control touched. It fires when the panel closes and when
  focus leaves the whole control, so a pick (which returns focus to the trigger)
  still counts as touched.
- `disabled` is bound by the form layer when the control is disabled.

> **Template-driven validation.** Angular 22 applies `NG_VALIDATORS` to a
> classic `ControlValueAccessor`, not to a value-model custom control. With
> `[(ngModel)]`, a `required` attribute on the picker therefore does **not**
> mark the `NgModel` invalid — verified in Angular 22.2.2: the picker's
> `NgModel.errors` stays `null` while a plain `<input required>` in the same
> form reports `{ required: true }`. Reactive Forms (`[formControl]`) and
> Signal Forms (`[formField]`) validate normally. For template-driven forms,
> check the value in the submit handler, or use a reactive control whose
> `FormControl` carries the validators.

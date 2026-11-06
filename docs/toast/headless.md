# Headless usage

Use the calendar controller without the ready-made UI.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/toast/v1.0.1/projects/toast/README.md)

## Use the headless service

Core can be used without the UI. `active()` and `queue()` are readonly signals;
the active list is oldest-first. Timers begin only when a toast becomes active.

```ts
// src/app/save-status.component.ts
import { Component, inject } from '@angular/core';
import { resolveToastText, RiviniaToast } from '@rivinia/toast';

@Component({
  selector: 'app-save-status',
  templateUrl: './save-status.component.html',
})
export class SaveStatusComponent {
  readonly toast = inject(RiviniaToast);
  readonly resolveText = resolveToastText;

  save(): void {
    const id: number | null = this.toast.show({ message: 'Saving…' });
    if (id === null) return; // possible with overflow: 'reject'

    // A matching key updates the existing active or queued item.
    this.toast.show({
      message: 'Saved',
      kind: 'success',
      dedupeKey: 'save',
    });
  }
}
```

```html
<!-- src/app/save-status.component.html -->
<button type="button" (click)="save()">Save</button>
@for (item of toast.active(); track item.id) {
<p [attr.data-kind]="item.kind">{{ resolveText(item.message) }}</p>
}
```

`message` and action `label` accept either a string or a reactive string
signal, so they can reflect language changes. For a custom outlet, use the exported
`resolveToastText(message)` utility to read either shape.

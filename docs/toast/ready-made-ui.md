# Ready-made UI

Render a modal with the optional UI entry point.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/toast/v1.0.1/projects/toast/README.md)

## Install and configure

```bash
npm install @rivinia/toast
ng add @rivinia/toast
```

`ng add` adds `provideRiviniaToast()` to a standalone app's `app.config.ts`; it
does not add the optional UI component. You can also configure the service
manually:

```ts
// src/app/app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { provideRiviniaToast } from '@rivinia/toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiviniaToast({
      duration: 5000,
      durations: { error: 8000 },
      maxVisible: 5,
      overflow: 'dismiss-oldest',
    }),
  ],
};
```

All provider fields are optional. Defaults are 5000 ms, five active toasts,
an unbounded queue, and `dismiss-oldest` overflow. `ng add` also accepts
`--duration` and `--max-visible`.


## Use with the optional UI

The UI is a separate secondary entry point; import its component explicitly.
This standalone example keeps the injected manager in a class field (injection
must not be called from the template):

```ts
// src/app/notifications.component.ts
import { Component } from '@angular/core';
import { injectRiviniaToast } from '@rivinia/toast';
import { RiviniaToastList } from '@rivinia/toast/ui';

@Component({
  selector: 'app-notifications',
  imports: [RiviniaToastList],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent {
  readonly toast = injectRiviniaToast();

  save(): void {
    this.toast.show({
      message: 'Changes saved',
      kind: 'success',
      dedupeKey: 'save',
    });
  }

  saveWithRetry(retry: () => void): void {
    this.toast.show({
      message: 'Could not save',
      kind: 'error',
      duration: 0,
      action: { label: 'Retry', onPress: retry },
    });
  }
}
```

```html
<!-- src/app/notifications.component.html -->
<button type="button" (click)="save()">Save</button>
<rv-toast-list [manager]="toast" position="bottom-end" />
```

The standalone list renders the manager's `active()` signal, pauses timed
notifications on hover and keyboard focus, runs actions, and provides a
dismiss button by default. Its defaults are `position="bottom-end"`,
`animation="slide"`, `richColors=false`, and `showCloseButton=true`.
`position` supports `top`/`bottom` × `start`/`center`/`end` (logical start/end
work in RTL); `animation` supports `slide`, `fade`, and `none`. Errors use an
assertive live region; other kinds use polite announcements.

For snapshot-driven UIs, provide the snapshots and handle the emitted IDs
yourself:

```ts
// src/app/toast-snapshots.component.ts
import { Component } from '@angular/core';
import type { Toast } from '@rivinia/toast';
import { RiviniaToastList } from '@rivinia/toast/ui';

@Component({
  selector: 'app-toast-snapshots',
  imports: [RiviniaToastList],
  templateUrl: './toast-snapshots.component.html',
})
export class ToastSnapshotsComponent {
  items: readonly Toast[] = [
    {
      id: 1,
      kind: 'info',
      message: 'A background task is ready',
      duration: 0,
      remaining: 0,
      paused: false,
      action: { label: 'Open', onPress: () => console.log('Open task') },
    },
  ];

  remove(id: number): void {
    this.items = this.items.filter((item) => item.id !== id);
  }

  run(id: number): void {
    const item = this.items.find((candidate) => candidate.id === id);
    if (!item?.action) return;
    item.action.onPress();
    if (item.action.dismissAfterPress ?? true) this.remove(id);
  }
}
```

```html
<!-- src/app/toast-snapshots.component.html -->
<rv-toast-list [toasts]="items" (dismissed)="remove($event)" (actionPressed)="run($event)" />
```

In this presentational mode your app owns timers, pause behavior, and action
handling. If both `manager` and `toasts` are supplied, the manager takes
precedence.

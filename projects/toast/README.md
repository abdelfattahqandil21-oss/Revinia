# @rivinia/toast

[![npm version](https://img.shields.io/npm/v/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)
[![license](https://img.shields.io/npm/l/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)

An Angular signal-based toast queue with timers, actions, deduplication, and
overflow handling. Core is headless; an optional standalone UI is available at
`@rivinia/toast/ui`.

- Package version: **0.4.2**
- Peer dependency: **`@angular/core` `^22.0.0`**
- No `tslib`, router, or HTTP peer dependency.

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
  standalone: true,
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
  standalone: true,
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

## Use the headless service

Core can be used without the UI. `active()` and `queue()` are readonly signals;
the active list is oldest-first. Timers begin only when a toast becomes active.

```ts
// src/app/save-status.component.ts
import { Component, inject } from '@angular/core';
import { resolveToastText, RiviniaToast } from '@rivinia/toast';

@Component({
  selector: 'app-save-status',
  standalone: true,
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

## API and behavior

| Export                                                                                                                           | Kind                | Purpose                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `provideRiviniaToast(config?)`                                                                                                   | Provider            | Configure defaults; see `RiviniaToastConfig`.                                                            |
| `RiviniaToast`                                                                                                                   | Service             | `show`, `dismiss`, `dismissAll`, `update`, `pause`, `resume`, `runAction`; `active` and `queue` signals. |
| `injectRiviniaToast()`                                                                                                           | Function            | Shorthand for `inject(RiviniaToast)`.                                                                    |
| UI secondary entry point                                                                                                         | `@rivinia/toast/ui` | Optional managed or presentational standalone list and its UI types.                                     |
| `Toast`, `ToastKind`, `ToastMessage`, `ToastAction`, `ToastOptions`, `ToastChanges`, `ToastOverflowPolicy`, `RiviniaToastConfig` | Types               | Public service, configuration, and UI input types.                                                       |
| `resolveToastText`, `clampDuration`                                                                                              | Utilities           | Resolve signal/string text; normalize a duration.                                                        |

Important details:

- `show()` returns a stable `number` ID, or `null` when rejected by the
  `reject` policy or when a finite queue is full. `dismiss()` and `update()`
  return `false` for unknown or dismissed IDs; `pause()`/`resume()` also return
  `false` when the timer cannot be changed.
- A repeated `dedupeKey` reuses the active or queued toast ID and updates it
  rather than stacking another toast. A matching `show()` without an `action`
  clears the previous action; include it again if it should remain.
- A toast-specific `duration` overrides per-kind and global defaults.
  `duration: 0`, negative values, not-a-number, and infinities mean persistent (no
  timer). Per-kind defaults are set with `durations`, for example
  `{ error: 8000 }`.
- `pause()` preserves the remaining time on an active timed toast. Persistent
  or queued toasts cannot be paused. `resume()` restarts the saved time; if it
  has already elapsed, the toast is dismissed.
- With `overflow: 'queue'`, new toasts wait without timers and are promoted
  when a visible slot opens. Set `maxQueue` to bound that queue. With
  `overflow: 'reject'`, `show()` returns `null`. `dismiss-oldest` replaces an
  active toast, preferring timed, actionless toasts for eviction.
- `update(id, changes)` restarts an active timer; a queued item's timer starts
  only on promotion. Changing `kind` re-applies that kind's default duration
  unless the toast was given an explicit duration. `action: null` removes an
  action.
- `runAction(id)` runs the callback, then dismisses by default.
  `dismissAfterPress: false` keeps the toast visible. Callback errors propagate
  to the caller (and, in managed UI use, Angular's `ErrorHandler`).
- No routing policy is built in. To clear timed notifications on navigation,
  subscribe to your router in app code and call `dismiss(id)` as appropriate.

## Testing app code

Use fake timers to make timer-dependent tests deterministic:

```ts
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { provideRiviniaToast, RiviniaToast } from '@rivinia/toast';

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideRiviniaToast()] });
  vi.useFakeTimers();
});

afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});

it('auto-dismisses after the configured duration', () => {
  const toast = TestBed.inject(RiviniaToast);
  const id = toast.show({ message: 'Saved', duration: 1000 });

  vi.advanceTimersByTime(1000);
  expect(toast.active().some((item) => item.id === id)).toBe(false);
});
```

## License

MIT.

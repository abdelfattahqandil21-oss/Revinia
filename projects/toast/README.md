# @rivinia/toast

[![npm version](https://img.shields.io/npm/v/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)
[![license](https://img.shields.io/npm/l/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)

An Angular signal-based toast queue with timers, actions, deduplication, and
overflow handling. Core is headless; an optional standalone UI is available at
`@rivinia/toast/ui`.

- Package version: **0.5.0**
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

## Theming

Every component reads **its own token → the shared semantic layer → its
built-in default**:

```css
--rv-toast-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token           | Scope                               |
| -------------- | --------------- | ----------------------------------- |
| 1. per package | `--rv-toast-bg` | that toast only                     |
| 2. global      | `--rv-bg`       | every Rivinia component, everywhere |
| 3. default     | —               | what you get if you set nothing     |

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
  --rv-border: #e0e0e0;
}
```

Its defaults sit in `@layer rivinia-theme`, so your unlayered `:root` rules win
wherever they appear. **Map it on `:root`, never on a component element** — an
element-level declaration shadows the root value and the override silently
stops working.

### The library's own tokens

| Token               | Default                       | Applies to     |
| ------------------- | ----------------------------- | -------------- |
| `--rv-toast-bg`     | `#ffffff`                     | the toast      |
| `--rv-toast-fg`     | `#111111`                     | the toast      |
| `--rv-toast-muted`  | `#555555`                     | the kind rail  |
| `--rv-toast-border` | `#e0e0e0`                     | the toast      |
| `--rv-toast-radius` | `12px`                        | the toast      |
| `--rv-toast-shadow` | `0 12px 32px rgba(0,0,0,.32)` | the toast      |
| `--rv-toast-gap`    | `8px`                         | between toasts |
| `--rv-toast-width`  | `22rem`                       | the list       |
| `--rv-toast-z`      | `1000`                        | the list       |

The kind colours chain to the semantic layer too:

| Token                | Semantic token |
| -------------------- | -------------- |
| `--rv-toast-success` | `--rv-ok`      |
| `--rv-toast-error`   | `--rv-danger`  |
| `--rv-toast-info`    | `--rv-info`    |
| `--rv-toast-warning` | `--rv-warning` |

**No forced light mode** — there is no `prefers-color-scheme` block in this
package, so a toast never overrides your explicit choice.

### Which styling stack?

| Stack           | Import                                       |
| --------------- | -------------------------------------------- |
| **Plain CSS**   | `@import '@rivinia/theme';`                  |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';`     |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';`    |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';`                |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` |

## The list is in the top layer

A `position: fixed` list with a `z-index` is still in the DOCUMENT, so it is
clipped by an `overflow: hidden` ancestor and loses to any stacking context
above it — including the one a modal `<dialog>` creates.

The list is therefore a **manual popover**, which puts it in the browser's top
layer: the same layer a modal `<dialog>` uses. The top layer stacks in the
order elements are shown, and the list is re-shown whenever its contents
change, so a toast raised while a dialog is open lands above it. Measured: the
element at the toast's position is the toast, not the dialog.

A manual popover is not modal: it does not trap focus, does not make the page
inert, and does not close on an outside click — so it behaves exactly like
the list it replaces.

**The popover's user-agent styles are reset.** A popover gets a background, a
border, padding and `overflow: auto` from the UA, which puts a shared canvas
and a scrollbar around the stack — so the toasts read as one block instead of
separate cards. The list is a transparent, borderless column.

Where the browser has no `showPopover` the list stays in the document and a
`z-index` decides its order. The feature is detected, not assumed.

## The list must be MANAGED

`rv-toast-list` renders what it is given. Without a manager it has an empty
list and **no toast ever appears**:

```html
<!-- nothing shows: the list is presentational and empty -->
<rv-toast-list position="bottom-end" />

<!-- the manager drives it -->
<rv-toast-list [manager]="toast" position="bottom-end" />
```

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

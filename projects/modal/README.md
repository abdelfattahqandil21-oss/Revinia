# @rivinia/modal

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

An Angular modal manager with typed results, stack/queue admission, dismissal
policies, async guards, and optional ready-made UI. The core package owns
modal state and lifecycle but does not render or style dialogs.

- Install: `npm install @rivinia/modal`
- Package version: **0.6.0**
- Peer dependencies: `@angular/core ^22.0.0` and `@angular/common ^22.0.0`
- `@rivinia/modal` is the headless manager.
- `@rivinia/modal/ui` contains standalone dialog and host components.

## Configure the manager

Register the provider once in the application's root environment providers.
The defaults use a stack with up to five visible modals and queue overflow:

```ts
// app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { provideRiviniaModal } from '@rivinia/modal';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRiviniaModal({
      strategy: 'stack',
      maxVisible: 3,
      closingTimeout: 300,
    }),
  ],
};
```

`ng add @rivinia/modal` can insert `provideRiviniaModal()` into a detected
standalone app configuration. It does not add a rendering host; add one as
described below. You can also configure the provider manually as above.

## Open a typed modal

The examples use standalone components and separate `.ts`/`.html` files. Mount
one shared `RiviniaModalHost` for the manager. This first version uses the
classic `@ViewChild` query, which is still supported in Angular 22:

```ts
import { Component, TemplateRef, ViewChild, signal } from '@angular/core';
import type { ModalHandle, ModalTemplateContext } from '@rivinia/modal';
import { injectRiviniaModal } from '@rivinia/modal';
import { RiviniaModalHost } from '@rivinia/modal/ui';

interface User {
  readonly id: string;
  readonly name: string;
}

interface DeleteData {
  readonly id: string;
  readonly name: string;
}

@Component({
  imports: [RiviniaModalHost],
  templateUrl: './users-page.component.html',
})
export class UsersPage {
  private readonly manager = injectRiviniaModal();
  protected readonly modals = this.manager;
  readonly users = signal<User[]>([{ id: '42', name: 'Ada Lovelace' }]);

  @ViewChild('deleteConfirmation', { static: true })
  private deleteTemplate!: TemplateRef<ModalTemplateContext<DeleteData>>;

  private pendingDelete: ModalHandle<boolean> | null = null;

  async askToDelete(user: User): Promise<void> {
    if (this.pendingDelete) return;

    const handle = this.manager.openModal<DeleteData, boolean>(this.deleteTemplate, {
      data: { id: user.id, name: user.name },
      ref: 'confirm-delete',
      metadata: { title: 'Delete user' },
      dismiss: { backdrop: 'static' },
    });
    this.pendingDelete = handle;

    try {
      const result = await handle.result;
      if (result.status === 'confirmed' && result.value) {
        this.users.update((users) => users.filter((entry) => entry.id !== user.id));
      }
    } finally {
      if (this.pendingDelete === handle) this.pendingDelete = null;
    }
  }

  confirmDelete(): void {
    // ModalHandle<boolean> checks that the confirmed value is a boolean.
    this.pendingDelete?.close(true);
  }

  cancelDelete(): void {
    this.pendingDelete?.cancel('user-cancelled');
  }
}
```

```html
<!-- src/app/users-page.component.html -->
@for (user of users(); track user.id) {
<button type="button" (click)="askToDelete(user)">Delete {{ user.name }}</button>
}

<ng-template #deleteConfirmation let-data>
  <p>Delete {{ data.name }}?</p>
  <button type="button" (click)="confirmDelete()">Delete user</button>
  <button type="button" (click)="cancelDelete()">Cancel</button>
</ng-template>

<rv-modal-host [modal]="modals" size="sm" />
```

### Signal-based view query

For new code, Angular 22 also supports the `viewChild` signal query. Keep the
same HTML; call the query signal to get its `TemplateRef`:

```ts
// src/app/users-page.component.ts
import { Component, TemplateRef, signal, viewChild } from '@angular/core';
import type { ModalHandle, ModalTemplateContext } from '@rivinia/modal';
import { injectRiviniaModal } from '@rivinia/modal';
import { RiviniaModalHost } from '@rivinia/modal/ui';

interface User {
  readonly id: string;
  readonly name: string;
}

interface DeleteData {
  readonly id: string;
  readonly name: string;
}

@Component({
  imports: [RiviniaModalHost],
  templateUrl: './users-page.component.html',
})
export class UsersPage {
  private readonly manager = injectRiviniaModal();
  protected readonly modals = this.manager;
  readonly users = signal<User[]>([{ id: '42', name: 'Ada Lovelace' }]);
  private readonly deleteTemplate =
    viewChild.required<TemplateRef<ModalTemplateContext<DeleteData>>>('deleteConfirmation');
  private pendingDelete: ModalHandle<boolean> | null = null;

  async askToDelete(user: User): Promise<void> {
    if (this.pendingDelete) return;

    const handle = this.manager.openModal<DeleteData, boolean>(this.deleteTemplate(), {
      data: { id: user.id, name: user.name },
      ref: 'confirm-delete',
      metadata: { title: 'Delete user' },
      dismiss: { backdrop: 'static' },
    });
    this.pendingDelete = handle;
    try {
      const result = await handle.result;
      if (result.status === 'confirmed' && result.value) {
        this.users.update((users) => users.filter((entry) => entry.id !== user.id));
      }
    } finally {
      if (this.pendingDelete === handle) this.pendingDelete = null;
    }
  }

  confirmDelete(): void {
    this.pendingDelete?.close(true);
  }

  cancelDelete(): void {
    this.pendingDelete?.cancel('user-cancelled');
  }
}
```

The UI host uses `metadata.title` by default, so the example renders
“Delete user” without custom title logic. Import `RiviniaModalHost` into the
standalone component that renders it. All examples in this guide target
standalone Angular 22 applications.

`openModal<TData, TResult>()` accepts a `TemplateRef`, a component type, or a
`ModalContent<TData>` descriptor. Template content receives `data` as
`let-data` and the per-modal operations as `let-modal="modal"`. For component
content, pass `inputs` in the options; those keys are `Record<string, unknown>`
and are not checked against the component's inputs at compile time. The
optional `RIVINIA_MODAL_CONTEXT` injection token supplies the same per-modal
context to a dynamically created component.

### Component content, modal context, and `NgComponentOutlet`

When the content is a component type, the host renders it with Angular's
`NgComponentOutlet` and creates an injector scoped to that modal instance.
Inject `RIVINIA_MODAL_CONTEXT` for that instance's `id`, `data`, `close()`, and
`dismiss()`; ordinary app services still resolve from the surrounding
injectors. The host supplies this context, so do not build a separate
`Injector` just to pass modal data or lifecycle operations.

```ts
// src/app/delete-confirmation.component.ts
import { Component, inject } from '@angular/core';
import { RIVINIA_MODAL_CONTEXT } from '@rivinia/modal';

@Component({
  templateUrl: './delete-confirmation.component.html',
})
export class DeleteConfirmationComponent {
  readonly modal = inject(RIVINIA_MODAL_CONTEXT);

  confirm(): void {
    this.modal.close(true);
  }

  cancel(): void {
    this.modal.dismiss('user-cancelled');
  }
}
```

```html
<!-- src/app/delete-confirmation.component.html -->
<h2>Delete this user?</h2>
<button type="button" (click)="confirm()">Delete</button>
<button type="button" (click)="cancel()">Cancel</button>
```

Open the component type through the same manager and host used for template
content:

```ts
const handle = this.manager.openModal<DeleteConfirmationComponent, DeleteData, boolean>(
  DeleteConfirmationComponent,
  {
    data: { id: user.id, name: user.name },
    metadata: { title: 'Delete user' },
  },
);
const result = await handle.result;
if (result.status === 'confirmed' && result.value) {
  this.removeUser(user.id);
}
```

The injection token is typed as `ModalContext<unknown>` because content may
come from different callers. Narrow or validate `modal.data` before reading
application-specific fields. The opener's `ModalHandle<boolean>` remains
typed, so `handle.close()` checks the result type. Component `inputs` can also
be supplied in `openModal` options, but their keys are not type-checked.

### Showing a toast inside an open modal

The toast list is fixed-position UI, not a popover. A native `<dialog>` is in
the browser's top layer, so a toast list rendered outside it can appear behind
the dialog regardless of its `z-index`. When a notification belongs to the
open modal, put its `RiviniaToastList` inside the modal template so it is
rendered inside the dialog:

```ts
// src/app/payment-page.component.ts
import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import type { ModalTemplateContext } from '@rivinia/modal';
import { RiviniaModal } from '@rivinia/modal';
import { RiviniaModalHost } from '@rivinia/modal/ui';
import { RiviniaToast } from '@rivinia/toast';
import { RiviniaToastList } from '@rivinia/toast/ui';

@Component({
  imports: [RiviniaModalHost, RiviniaToastList],
  templateUrl: './payment-page.component.html',
})
export class PaymentPageComponent {
  readonly modal = inject(RiviniaModal);
  readonly toast = inject(RiviniaToast);
  private readonly paymentTemplate =
    viewChild.required<TemplateRef<ModalTemplateContext<void>>>('paymentConfirmation');

  openPayment(): void {
    this.modal.openModal<void, void>(this.paymentTemplate(), {
      data: undefined,
      metadata: { title: 'Confirm payment' },
    });
  }

  showPaymentSaved(): void {
    this.toast.show({ message: 'Payment saved', kind: 'success' });
  }
}
```

```html
<!-- src/app/payment-page.component.html -->
<button type="button" (click)="openPayment()">Pay invoice</button>

<ng-template #paymentConfirmation let-modal="modal">
  <p>Submit payment for invoice INV-2048?</p>
  <button type="button" (click)="showPaymentSaved()">Show saved notice</button>
  <button type="button" (click)="modal.close()">Done</button>
  <rv-toast-list [manager]="toast" position="top-end" />
</ng-template>

<rv-modal-host [modal]="modal" size="sm" />
```

Register `provideRiviniaToast()` as well as `provideRiviniaModal()` in the
application's root providers. Use one `RiviniaToastList` per toast manager at a
time: if the app already renders that same manager globally, move or gate that
list while this modal is open rather than mounting a second list and showing
every notification twice.

The result is a discriminated `ModalResult<TResult>`:

- `confirmed` carries the typed `value`.
- `cancelled` and `dismissed` may carry a `reason`.
- `owner-destroyed` and `queued-cancelled` identify lifecycle cleanup.
- `rejected` identifies a request refused by the configured admission or
  overflow policy.

Narrow on `result.status` before reading `result.value`. Results settle once
when closing starts; callers do not wait for the exit animation. A component
that owns a handle may use `close(value)`, `cancel(reason)`, or
`dismiss(reason)`. `ModalHandle.close()` enforces `TResult`; the `close()`
method on template/component context accepts `unknown`, so prefer the handle
when the result type matters.

## Dismissal, guards, and lifecycle

The default dismissal policy allows Escape and backdrop click. Configure
global defaults, named presets, or per-modal overrides:

```ts
provideRiviniaModal({
  dismiss: { closeOnEscape: true, backdrop: 'static' },
  presets: {
    critical: { dismiss: { closeOnEscape: false, backdrop: 'static' } },
  },
});
```

Dismissal policy fields merge independently in this order: built-in defaults,
global config, named preset, and per-open options. A missing key at a later
layer does not erase an earlier setting. `backdrop` may be `close`, `static`,
or `disabled`.

`RiviniaModalHost` routes Escape, backdrop, and close-button intents through
`requestDismiss()`, which runs any async `guards` supplied when opening. A
guard that returns `false` or throws keeps the modal open. The direct
`close()`, `dismiss()`, and `cancel()` methods on a handle are guard-free;
use `requestDismiss(id, origin)` when programmatic code should also be checked.
Forced cleanup such as owner destruction and `dismissAll()` bypasses guards.

The manager supports `strategy: 'stack' | 'queue'` (or a custom
`ModalStrategy`). Stack allows up to `maxVisible` active modals, with the
latest on top; queue activates one at a time in FIFO order. A modal in its
exit animation normally occupies a visible slot until the host confirms
teardown or the timeout finalizes it; `dismiss-oldest` preempts an active
instance to make room while its exit runs. When capacity is full, `overflow`
may queue (default), dismiss the oldest active modal, or reject the new request.
`maxQueue` bounds queued requests when queue overflow is enabled.

An optional `owner: DestroyRef` ties a modal to a component/service lifetime.
Destroying the owner settles an active request as `owner-destroyed`; a queued
request settles as `queued-cancelled`. Without an owner, the modal is
independent of the caller's lifetime. Set `parentId` to associate a child
modal with a parent; by default, closing a parent closes its descendants.
`descendants: 'prevent-parent-close'` instead blocks parent closure while a
descendant remains open.

When a modal enters `closing`, its result has already settled but it remains
visible while the UI exits. The UI host calls `confirmClosed()` after its exit
animation. The default `closingTimeout` is 300 ms; set it to cover the
renderer’s exit duration, or set it to `0` when a custom renderer will always
acknowledge closure manually. Changing strategy with active, queued, or
closing modals throws; close them first.

## Ready-made UI

`@rivinia/modal/ui` is optional. It provides a native `<dialog>` component
(`RiviniaModalDialog`) for UI-only use and `RiviniaModalHost` to render
manager-owned modals. The host passes dismissal intents to the manager before
closing, so guards and promise results remain coordinated.

For a UI-only dialog, import the standalone component and bind its `open`
model. This mode has no manager, guards, or `ModalHandle` promise:

```ts
import { Component } from '@angular/core';
import { RiviniaModalDialog } from '@rivinia/modal/ui';

@Component({
  imports: [RiviniaModalDialog],
  templateUrl: './preview-dialog.component.html',
})
export class PreviewDialog {
  open = false;
}
```

```html
<!-- src/app/preview-dialog.component.html -->
<button type="button" (click)="open = true">Preview</button>
<rv-modal-dialog #dialog [(open)]="open" title="Preview">
  <p>Dialog content.</p>
  <button type="button" (click)="dialog.confirm(true)">Continue</button>
  <button type="button" (click)="dialog.cancel('cancelled')">Cancel</button>
</rv-modal-dialog>
```

`RiviniaModalDialog` accepts `open`, `title`, `description`, `ariaLabel`,
`size`, `position`, `animation`, `closeOnEscape`, `backdrop`, and
`showCloseButton`; its `open` model supports `[(open)]`. In UI-only mode it
emits `confirmed`, `dismissed`, and `cancelled`. In managed use, the host
accepts the required `modal` manager input plus `size`, `showCloseButton`,
and `titleOf` overrides; observe the manager's `ModalHandle.result` instead
of the dialog outputs.
`RvModalHeader` and `RvModalFooter` are marker directives for custom header
and footer projection; import the marker used by the template and apply it
alongside `rv-modal-header` or `rv-modal-footer`. A custom header replaces the
default title and close button. Without a footer slot, no footer region is
rendered.

The native dialog provides focus containment and restores focus to its
invoker. The UI includes scroll locking, reduced-motion support, RTL-aware
logical positions, and responsive bottom-sheet styling below 640px for
center/top/bottom placements. The UI exposes size, position, animation,
backdrop, Escape, and close-button inputs. During server rendering it remains
closed and opens on the client after hydration. Theme it with CSS custom
properties such as `--rv-modal-bg`, `--rv-modal-fg`, `--rv-modal-border`,
`--rv-modal-radius`, and `--rv-modal-width-md`.

## Theming

Every component reads **its own token → the shared semantic layer → its
built-in default**:

```css
--rv-modal-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token           | Scope                               |
| -------------- | --------------- | ----------------------------------- |
| 1. per package | `--rv-modal-bg` | that dialog only                    |
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

| Token                 | Default                       | Applies to     |
| --------------------- | ----------------------------- | -------------- |
| `--rv-modal-bg`       | `#ffffff`                     | the dialog     |
| `--rv-modal-fg`       | `#111111`                     | the dialog     |
| `--rv-modal-muted`    | `#555555`                     | secondary text |
| `--rv-modal-border`   | `#e0e0e0`                     | the dialog     |
| `--rv-modal-radius`   | `12px`                        | the dialog     |
| `--rv-modal-shadow`   | `0 24px 64px rgba(0,0,0,.28)` | the dialog     |
| `--rv-modal-backdrop` | `rgba(0,0,0,.5)`              | the scrim      |
| `--rv-modal-pad`      | `20px`                        | the dialog     |
| `--rv-modal-width-md` | `32rem`                       | the dialog     |

**No forced dark mode** — there is no `prefers-color-scheme` block in this
package, so a dialog never overrides your explicit choice.

### Which styling stack?

| Stack           | Import                                       |
| --------------- | -------------------------------------------- |
| **Plain CSS**   | `@import '@rivinia/theme';`                  |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';`     |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';`    |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';`                |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` |

## Sizing, stacking and who opened it

**A size per dialog.** The host's `size` is the default for every instance; a
dialog may override it when it is opened:

```ts
this.modal.openModal(this.confirmTpl, { ref: 'confirm', size: 'sm' });
```

```html
<rv-modal-host [modal]="modal" size="lg" />
```

The presets are **responsive** — each is a `clamp()`, so it scales with the
viewport between a floor and a ceiling instead of being a fixed width that
either overflows or gets capped:

| Preset | Width                       |
| ------ | --------------------------- |
| `sm`   | `clamp(16rem, 40vw, 24rem)` |
| `md`   | `clamp(20rem, 55vw, 32rem)` |
| `lg`   | `clamp(24rem, 70vw, 48rem)` |
| `xl`   | `clamp(28rem, 85vw, 64rem)` |
| `full` | `calc(100dvw - 2rem)`       |
| `auto` | sized to its content        |

Every one is a plain custom property, so the consumer overrides the preset in
CSS without touching the library:

```css
my-scope {
  --rv-modal-width-lg: clamp(30rem, 80vw, 60rem);
}
```

**One dialog can cover the ones below it.** A stack shows every dialog, so the
ones below stay visible behind the top one — right for a wizard, wrong for a
flow where the detail view REPLACES the list view:

```ts
this.modal.openModal(this.detailTpl, { ref: 'detail', coversOthers: true });
```

The dialogs below are not rendered while the cover is up, and they come back
when it closes. They stay in the manager the whole time.

**The opener is attributable.** `openModal` is normally called from an event
handler, which is not an injection context, so the manager cannot discover the
caller. Naming it puts `data-caller` on the dialog, which the DevTools
inspector shows — so a dialog that appears unexpectedly points at its source:

```ts
export class UsersScreen {
  open() {
    this.modal.openModal(this.detailTpl, { caller: UsersScreen });
  }
}
```

```html
<dialog class="rv-modal" data-caller="UsersScreen">…</dialog>
```

**Smoothness.** The dialog transitions its own box — width, height and the
offsets — so a size change or a dialog opening on top of another is a
movement rather than a jump. The stack change is additionally wrapped in a
**view transition** where the browser supports it, so the lower dialog is
painted continuously instead of flickering. During a viewport resize the
transition is switched off (`data-resizing="true"`): the dialog's size is
derived from the viewport, so animating towards a moving target lags behind
the pointer.

## Public core exports

The core entry point exports:

- `provideRiviniaModal()` and `injectRiviniaModal()` for configuration and
  injection, plus `RiviniaModal` for direct manager APIs.
- `StackStrategy`, `QueueStrategy`, and the `ModalStrategy` contract.
- `RiviniaModalConfig`, `ModalPreset`, `ModalHandle`, `ModalResult`,
  `ModalContent`, `ModalOpenOptions`, `ModalUpdate`, `ModalInstance`,
  `ModalTemplateContext`, `ModalContext`, `ModalGuard`,
  `ModalDismissPolicy`, `ModalDismissOrigin`, `ModalOverflowPolicy`,
  `ModalStatus`, `ModalDiagnostic`, and `DescendantPolicy`.
- `RIVINIA_MODAL_CONTEXT` for dynamic modal components.

`RiviniaModal` exposes readonly `active`, `queued`, `closing`, `visible`, and
`top` signals, along with `openModal`, `close`, `dismiss`, `cancel`,
`requestDismiss`, `update`, `confirmClosed`, `dismissAll`, `findByRef`,
`useStrategy`, and diagnostics helpers. Inspect the signal values by calling
them, for example `manager.top()`.

The `@rivinia/modal/ui` entry point exports `RiviniaModalDialog`,
`RiviniaModalHost`, `RiviniaModalHostManager`, `RiviniaModalScrollLock`,
`RvModalHeader`, and `RvModalFooter`, plus the `RiviniaModalAnimation`,
`RiviniaModalBackdrop`, `RiviniaModalPosition`, `RiviniaModalSize`, and
`RiviniaModalUiOptions` types.

## License

MIT.

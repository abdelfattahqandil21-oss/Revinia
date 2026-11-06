# Typed modals

Configure the manager and open a typed modal.

[Back to @rivinia/modal README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/modal/v1.0.1/projects/modal/README.md)

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
one shared `RiviniaModalHost` for the manager. This example uses the
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

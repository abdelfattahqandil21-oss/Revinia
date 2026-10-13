# @rivinia/modal

[![npm version](https://img.shields.io/npm/v/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)
[![license](https://img.shields.io/npm/l/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)

Headless modal manager for Angular 22+. Stack/Queue strategies, typed
`Promise` results, dismissal policies, async guards, ownership — zero DOM,
zero styles, zero router dependency. A future `@rivinia/modal/ui` entry point
will render this state; Core never imports UI.

- Version: **0.2.0**
- Requires: **Angular `^22.0.0`**, `tslib`

## Install

```bash
npm install @rivinia/modal
ng add @rivinia/modal   # wires provideRiviniaModal() into app.config.ts
```

```ts
// app.config.ts
import { provideRiviniaModal } from '@rivinia/modal';

providers: [provideRiviniaModal({ strategy: 'stack', maxVisible: 3 })];
```

## Quick start

```ts
export class Users {
  private modals = injectRiviniaModal();

  async remove(user: User) {
    const handle = this.modals.openModal<DeleteData, boolean>(confirmTemplate, {
      data: { name: user.name },
      ref: 'confirm-delete',
    });
    const result = await handle.result;
    if (result.status === 'confirmed' && result.value) {
      this.delete(user);
    }
    // 'cancelled' | 'dismissed' | 'queued-cancelled' | 'owner-destroyed' | 'rejected'
  }
}
```

## API

| Export | Kind | Purpose |
|---|---|---|
| `provideRiviniaModal(config?)` | provider | `{ strategy?, dismiss?, maxVisible?, maxQueue?, overflow?, descendants?, presets?, closingTimeout?, diagnostics? }` |
| `RiviniaModal` | `@Service()` | `openModal/close/dismiss/cancel/requestDismiss/update/confirmClosed/dismissAll/findByRef/useStrategy/debugState` + `active/queued/top` signals |
| `injectRiviniaModal()` | function | shorthand for `inject(RiviniaModal)` |
| `RIVINIA_MODAL_CONTEXT` | token | per-instance context for dynamic components |
| `StackStrategy` / `QueueStrategy` | classes | built-in ordering policies (`ModalStrategy` for custom) |
| types | types | `ModalHandle`, `ModalResult`, `ModalContent`, `ModalOpenOptions`, `ModalDismissPolicy`, `ModalGuard`, … |

Results settle exactly once, at dismissal initiation — exit animations never
delay callers. `close/dismiss/cancel` are guard-free primitives (booleans);
`requestDismiss(id, origin)` runs async guards for user intents. Forced paths
(owner destroy, overflow eviction, `dismissAll`) bypass guards. Render failures
reject the promise instead of becoming variants.

## Ownership (who cleans up)

```ts
// Owned by a short-lived component: dies with it (active → owner-destroyed)
this.modals.openModal(tpl, { owner: this.destroyRef });

// Independent (default): lives until closed — for services and app flows
this.modals.openModal(tpl);
```

Owner teardown frees capacity like any other removal: queued requests promote
normally (a queued toast sharing the dead owner is still torn down by its own
callback, settling `owner-destroyed`).

Closing a parent cascades to descendants (`dismissed: parent-closed`) unless
`descendants: 'prevent-parent-close'` blocks it. Swapping strategies with live
modals throws — close everything first.

## License

MIT.

# @rivinia/modal

[![npm version](https://img.shields.io/npm/v/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)
[![license](https://img.shields.io/npm/l/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)

Headless modal manager for Angular 22+. Stack/Queue strategies, typed
`Promise` results, dismissal policies, async guards, ownership — zero DOM,
zero styles, zero router dependency. A future `@rivinia/modal/ui` entry point
will render this state; Core never imports UI.

- Version: **0.4.0**
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

| Export                            | Kind         | Purpose                                                                                                                                                        |
| --------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaModal(config?)`    | provider     | `{ strategy?, dismiss?, maxVisible?, maxQueue?, overflow?, descendants?, presets?, closingTimeout?, diagnostics? }`                                            |
| `RiviniaModal`                    | `@Service()` | `openModal/close/dismiss/cancel/requestDismiss/update/confirmClosed/dismissAll/findByRef/useStrategy/debugState` + `active/queued/closing/visible/top` signals |
| `injectRiviniaModal()`            | function     | shorthand for `inject(RiviniaModal)`                                                                                                                           |
| `RIVINIA_MODAL_CONTEXT`           | token        | per-instance context for dynamic components                                                                                                                    |
| `StackStrategy` / `QueueStrategy` | classes      | built-in ordering policies (`ModalStrategy` for custom)                                                                                                        |
| types                             | types        | `ModalHandle`, `ModalResult`, `ModalContent`, `ModalOpenOptions`, `ModalDismissPolicy`, `ModalGuard`, …                                                        |

Results settle exactly once, at dismissal initiation — exit animations never
delay callers. `close/dismiss/cancel` are guard-free primitives (booleans);
`requestDismiss(id, origin)` runs async guards for user intents. Forced paths
(owner destroy, overflow eviction, `dismissAll`) bypass guards. Render failures
reject the promise instead of becoming variants.

`openModal` accepts a raw `TemplateRef`, a component `Type`, or a full
`ModalContent` descriptor (component inputs via `options.inputs`). Dismissal
policy merges field-by-field: built-in defaults < global `dismiss` < named
preset < per-call options — absent keys never clobber.

## Ownership (who cleans up)

```ts
// Owned by a short-lived component: dies with it (active → owner-destroyed)
this.modals.openModal(tpl, { owner: this.destroyRef });

// Independent (default): lives until closed — for services and app flows
this.modals.openModal(tpl);
```

Owner teardown frees capacity like any other removal: queued requests promote
normally (a queued request sharing the dead owner is still torn down by its own
callback, settling `owner-destroyed`). Opening with an already-destroyed owner
settles `owner-destroyed` immediately without adding anything.

Closing a parent cascades to descendants (`dismissed: parent-closed`) unless
`descendants: 'prevent-parent-close'` blocks it. Swapping strategies with live
modals throws — close everything first.

## Ready-made UI (`@rivinia/modal/ui`)

Optional secondary entry point. Zero new runtime dependencies (platform
`<dialog>` + Angular only), no design system, no CSS framework. Headless
consumers never load it (proven: core FESM contains zero UI markers).

```ts
import { RiviniaModalDialog } from '@rivinia/modal/ui'; // UI-only
import { RiviniaModalHost } from '@rivinia/modal/ui'; // managed adapter
```

**Mode A — UI-only** (no controller; owns its `open` state):

```html
<rv-modal-dialog [(open)]="open" [title]="'Delete?'" [size]="'sm'" (confirmed)="remove()">
  <p>Delete {{ user.name }}?</p>
</rv-modal-dialog>
```

**Mode B — headless + custom UI:** keep using `@rivinia/modal` alone.
Nothing here loads, no styles leak.

**Mode C — headless + ready-made UI** (single source of truth stays Core):

```html
<rv-modal-host [modal]="injectRiviniaModal()" />
```

Intents (X, Escape, backdrop) route through `requestDismiss` (guards run);
exits play, then the host calls `confirmClosed()` (match `closingTimeout`
to the animation duration; default 300 ms covers the 150 ms default).

Custom chrome (no X button, custom header/footer, own actions in content):

```html
<rv-modal-dialog [(open)]="open">
  <div rv-modal-header rvModalHeader>My header, no X</div>
  <p>Body.</p>
  <div rv-modal-footer rvModalFooter><button (click)="save()">Save</button></div>
</rv-modal-dialog>
```

No header at all: omit the title (no custom header either). No footer:
omit the footer slot (renders nothing). Positions: `center` (default),
`top/bottom`, `-start/-end` variants (RTL-aware), `side-start/side-end`
full-height panels, `fullscreen`. Under 640px viewports, center/top/bottom
shapes become bottom sheets automatically (top-only radius, slide-up
entrance); panels and fullscreen keep their shape.
Sizes `sm/md/lg/xl/full/auto` are ceilings via `--rv-modal-width-*` vars.

Theming (no theme service; consumer owns it):

```css
:root {
  --rv-modal-bg: #1c1c1e;
  --rv-modal-fg: #f5f5f7;
}
@media (prefers-color-scheme: dark) {
  .rv-modal {
    /* built-in dark defaults already apply; override vars to brand it */
  }
}
```

Plus: `prefers-reduced-motion` disables animation; `animation: 'none'`
opt-out; `backdrop: 'close' | 'static' | 'disabled'`; Escape/backdrop/X
policies stay independent (no `disableClose` bundle); long content scrolls
inside (`rv-modal-body`); `scrollbar-gutter: stable` while open;
reference-counted scroll lock restores previous styles; focus trap + focus
restore + `aria-labelledby`/`aria-label`; `dir=rtl` works via logical
properties; SSR renders closed and opens after hydration; lazy-load the
entry (`loadComponent`) to split it into its own chunk (~16.7 kB raw,
~4.9 kB transfer, measured). Toasts: MEASURED (Chrome, `elementFromPoint`) —
neither a high `z-index` nor `popover="manual"` paints above an open modal
dialog; toasts queue behind it. No modal→toast dependency by design.

## Type holes (honest, by design)

Core checks `ModalHandle<TResult>.close(result?: TResult)` and
`ModalResult`/`ModalContext.data` typing (see `modal-type-safety.spec.ts`
`@ts-expect-error` tests). It does NOT check:

- `ModalContext.close(result?: unknown)` — any payload compiles; the mismatch
  reaches the opener's awaited `ModalResult` unchecked.
- `inputs?: Record<string, unknown>` (options + component content) — any shape
  compiles; misspelled keys fail silently at render. The UI owns binding.
- The internal deferred-promise cast to `Promise<ModalResult<TResult>>` —
  `close()` settles whatever it receives, never validated.

## License

MIT.

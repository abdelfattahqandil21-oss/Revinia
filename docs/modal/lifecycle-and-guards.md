# Lifecycle and guards

Control dismissal, guards, and modal lifecycle.

[Back to @rivinia/modal README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/projects/modal/README.md)

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

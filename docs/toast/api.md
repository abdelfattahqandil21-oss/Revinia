# API reference

Find the public entry points, symbols, and exports.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/projects/toast/README.md)

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


## License

MIT.

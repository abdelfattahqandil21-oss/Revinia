# @rivinia/toast

[![npm version](https://img.shields.io/npm/v/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)
[![license](https://img.shields.io/npm/l/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)

Headless toast queue for Angular 22+. Signals, pause-on-hover timers, actions,
dedupe, overflow policies — zero DOM, zero styles, zero router dependency.
A future `@rivinia/toast/ui` entry point will render this state; Core never
imports UI.

- Version: **0.4.0**
- Requires: **Angular `^22.0.0`**, `tslib`

## Install

```bash
npm install @rivinia/toast
ng add @rivinia/toast   # wires provideRiviniaToast() into app.config.ts
```

```ts
// app.config.ts
import { provideRiviniaToast } from '@rivinia/toast';

providers: [provideRiviniaToast({ duration: 5000, maxVisible: 5 })];
```

## Quick start

```ts
export class Checkout {
  private toast = injectRiviniaToast();

  pay() {
    const id = this.toast.show({ message: 'Payment sent', kind: 'success' });
    // id: number | null (null = rejected by the 'reject' overflow policy)
  }

  saving() {
    // Same key updates in place instead of stacking duplicates:
    this.toast.show({ message: 'Saving…', dedupeKey: 'save' });
    this.toast.show({ message: 'Saved', kind: 'success', dedupeKey: 'save' });
  }
}
```

```html
<!-- your outlet (or the future @rivinia/toast/ui): -->
@for (t of toast.active(); track t.id) {
<div [attr.data-kind]="t.kind">{{ resolveToastText(t.message) }}</div>
}
```

## API

| Export                         | Kind         | Purpose                                                                                                                          |
| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaToast(config?)` | provider     | `{ duration?=5000, durations?, maxVisible?=5, maxQueue?=∞, overflow?='dismiss-oldest' }`                                         |
| `RiviniaToast`                 | `@Service()` | `show/dismiss/dismissAll/update/pause/resume/runAction`, `active` + `queue` signals                                              |
| `injectRiviniaToast()`         | function     | shorthand for `inject(RiviniaToast)`                                                                                             |
| `resolveToastText(msg)`        | util         | reads `string \| Signal<string>` (reactive re-translation without i18n coupling)                                                 |
| `clampDuration(v, fallback)`   | util         | normalizes durations (`0`/negative/`NaN`/infinite = persistent)                                                                  |
| types                          | types        | `Toast`, `ToastKind`, `ToastMessage`, `ToastAction`, `ToastOptions`, `ToastChanges`, `ToastOverflowPolicy`, `RiviniaToastConfig` |

`show()` returns the stable id, or `null` under `'reject'` (or a full finite
queue). `dismiss/update/pause/resume/runAction` return `false` for unknown ids
(and repeated dismissal) instead of throwing. `duration: 0` = persistent.
`pause()` suspends only running timers (persistent toasts can never pause, so
hover-leave cannot dismiss them); `resume()` on anything unpaused is a no-op;
each toast exposes its `paused` flag for progress UI.
Timers start at queue **promotion**, never while queued. Per-toast options
always beat globals; a kind change re-resolves the per-kind default unless the
toast carries an explicit duration. Overflow eviction prefers timed,
actionless toasts — persistent errors with actions are last resort.

## Recipes (app-owned, deliberately not in the library)

```ts
import { filter } from 'rxjs';
import { NavigationStart } from '@angular/router';

// Clear timed toasts on navigation (BRT behavior, 3 lines, no library peer needed):
router.events
  .pipe(filter((e) => e instanceof NavigationStart))
  .subscribe(() => toast.active().forEach((t) => t.duration > 0 && toast.dismiss(t.id)));

// Backend-shaped errors stay in your error mapper, then:
toast.show({
  message: 'Order failed',
  kind: 'error',
  action: {
    label: 'Retry',
    onPress: () => retry(),
  },
}); // dismisses after press unless dismissAfterPress: false
```

Future UI renders inside `role="region" aria-live="polite"`, pauses on
hover **and** keyboard focus (WCAG 2.2.1 timing control), and offers a labelled
dismiss button — and now it exists:

## Ready-made UI (`@rivinia/toast/ui`)

Optional secondary entry point. Zero new runtime dependencies, no design
system. Headless consumers never load it (proven: core FESM has zero UI
markers).

```ts
import { RiviniaToastList } from '@rivinia/toast/ui';
```

```html
<!-- Managed: signals, hover-pause, actions, X button, exit animation -->
<rv-toast-list [manager]="injectRiviniaToast()" [position]="'bottom-end'" />

<!-- Presentational: you own the snapshots (no manager needed) -->
<rv-toast-list [toasts]="items" (dismissed)="remove($event)" (actionPressed)="act($event)" />
```

Positions (user-picked, RTL-aware): `top/bottom × start/center/end`
(default `bottom-end`, sonner-compatible). `richColors` swaps the kind rail
for full-bleed kind colors. Items are `role="status"` (`assertive` for
errors); stack order is `active()` order; hover/focus pauses via
`pause()/resume()`; throwing actions propagate to your `ErrorHandler`
(never swallowed). Dismissed rows play a 150 ms exit from their last
snapshot on the browser (SSR drops them — renders never hang). When both
`manager` and `toasts` are given, the manager wins: the UI never races Core.

## Testing your app code

```ts
vi.useFakeTimers();
toast.show({ message: 'x' });
vi.advanceTimersByTime(5000);
expect(toast.active()).toEqual([]);
```

## License

MIT.

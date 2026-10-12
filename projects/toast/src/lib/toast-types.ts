import type { Signal } from '@angular/core';

/**
 * Semantic severity. Core treats this as data only (default durations,
 * UI icon/role mapping) — never as styling.
 */
export type ToastKind = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast text without i18n coupling: pass a plain string, or a `Signal<string>`
 * (e.g. a `computed` over your language service) for reactive re-translation.
 * The future UI reads it via `resolveToastText()`.
 */
export type ToastMessage = string | Signal<string>;

/**
 * Optional call-to-action. DOM wiring (click handlers) lives in UI code,
 * which calls `runAction(id)` — Core only owns the metadata + callback.
 */
export interface ToastAction {
  /** Button label: plain string or reactive signal. */
  readonly label: ToastMessage;
  /** Runs when the UI triggers the action. Exceptions propagate to the caller. */
  readonly onPress: () => void;
  /**
   * Dismiss the toast after `onPress` runs.
   * @default true
   */
  readonly dismissAfterPress?: boolean;
}

/** A live notification. All fields readonly — mutate via service methods. */
export interface Toast {
  /** Stable monotonic identifier. Never reused, even after dismissal. */
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: ToastMessage;
  /** Resolved auto-dismiss delay in ms. `0` = persistent (no timer). */
  readonly duration: number;
  /** Milliseconds left on the active timer. Equals `duration` when fresh/queued. */
  readonly remaining: number;
  readonly action: ToastAction | null;
}

/** Arguments to `show()`. */
export interface ToastOptions {
  readonly message: ToastMessage;
  readonly kind?: ToastKind;
  /** Overrides every configured default. `0` (or negative/NaN) = persistent. */
  readonly duration?: number;
  readonly action?: ToastAction;
  /**
   * Opt-in deduplication scope. A second `show()` with an equal key updates the
   * existing active-or-queued toast in place (content replaced, timer restarted)
   * and returns its id — instead of opening a duplicate. No key = no dedupe.
   */
  readonly dedupeKey?: string;
}

/** Partial changes for `update()`. Re-keying is not supported. */
export interface ToastChanges {
  readonly message?: ToastMessage;
  readonly kind?: ToastKind;
  /** When provided, the timer restarts with the new duration. */
  readonly duration?: number;
  /** `null` removes an existing action. */
  readonly action?: ToastAction | null;
}

/**
 * Overflow behavior when showing past `maxVisible` active toasts.
 * See `RiviniaToastConfig.overflow` for semantics.
 */
export type ToastOverflowPolicy = 'dismiss-oldest' | 'queue' | 'reject';

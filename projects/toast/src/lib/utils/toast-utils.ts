import type { Signal } from '@angular/core';
import type { ToastMessage } from '../models/toast-types';

/**
 * Reads a toast message regardless of shape. Future UI entry points call this
 * in templates — one place to support `string | Signal<string>`.
 */
export function resolveToastText(message: ToastMessage): string {
  return typeof message === 'string' ? message : (message as Signal<string>)();
}

/**
 * Normalizes a duration into a safe non-negative integer.
 * `0`, negatives, `NaN` and non-finite values all mean persistent (no timer).
 * Rationale: a `setTimeout(Infinity)` silently overflows to ~1ms in browsers —
 * converting to persistent is the only non-surprising mapping.
 */
export function clampDuration(value: number | undefined, fallback: number): number {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate <= 0) {
    return 0;
  }
  return Math.floor(candidate);
}

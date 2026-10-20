import { InjectionToken } from '@angular/core';
import type { ToastKind, ToastOverflowPolicy } from './toast-types';

/**
 * Global configuration for `@rivinia/toast`.
 *
 * Every field is optional. Per-toast options always win over globals.
 * URLs, icons, positions, styles: intentionally absent — presentation is
 * app-owned (a future `@rivinia/toast/ui` entry point will consume this Core).
 */
export interface RiviniaToastConfig {
  /**
   * Default auto-dismiss delay in milliseconds.
   * @default 5000
   */
  duration?: number;
  /**
   * Per-kind default delays. A per-toast `duration` beats both levels.
   * @default {} (every kind falls back to `duration`)
   */
  durations?: Partial<Record<ToastKind, number>>;
  /**
   * Maximum simultaneously visible (active) toasts. Clamped to ≥ 1.
   * @default 5 (industry standard: shadcn `TOAST_LIMIT = 3`, BRT `MAX_VISIBLE = 5`)
   */
  maxVisible?: number;
  /**
   * Maximum queued toasts when `overflow: 'queue'`. Further shows are rejected.
   * @default Infinity (bounded only if you bound it — an unbounded queue is a
   * documented leak risk for hot paths; prefer `'dismiss-oldest'` there)
   */
  maxQueue?: number;
  /**
   * What happens when a new toast arrives while `maxVisible` are active.
   * - `'dismiss-oldest'`: dismiss the oldest active toast, show the new one.
   * - `'queue'`: hold the new toast (no timer runs) until room frees up.
   * - `'reject'`: `show()` returns `null`; nothing changes.
   * @default 'dismiss-oldest'
   */
  overflow?: ToastOverflowPolicy;
}

/**
 * Internal configuration token. Consumers must use `provideRiviniaToast()`.
 * @internal
 */
export const RIVINIA_TOAST_CONFIG = new InjectionToken<RiviniaToastConfig>(
  'RIVINIA_TOAST_CONFIG',
);

export const DEFAULT_DURATION = 5000;
export const DEFAULT_MAX_VISIBLE = 5;

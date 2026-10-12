import { InjectionToken } from '@angular/core';
import type {
  DescendantPolicy,
  ModalDismissPolicy,
  ModalOverflowPolicy,
} from './modal-types';

/** Named preset: a reusable dismissal shape (explicit options always win). */
export interface ModalPreset {
  readonly dismiss?: Partial<ModalDismissPolicy>;
}

/**
 * Global configuration for `@rivinia/modal`. Everything optional; per-open
 * options win. No styling, positions, icons, or translations here — ever.
 */
export interface RiviniaModalConfig {
  /**
   * Ordering/activation policy. `'stack'` = up to `maxVisible` concurrent,
   * topmost interactive. `'queue'` = strictly serial (one active, FIFO rest).
   * A custom `ModalStrategy` instance is also accepted.
   * @default 'stack'
   */
  readonly strategy?: 'stack' | 'queue' | import('./modal-strategy').ModalStrategy;
  /** Global dismissal defaults. @default { closeOnEscape: true, backdrop: 'close' } */
  readonly dismiss?: ModalDismissPolicy;
  /** Capacity of simultaneously active modals. Clamped to ≥ 1. @default 5 */
  readonly maxVisible?: number;
  /** Bound for queued requests (queue policy). @default Infinity */
  readonly maxQueue?: number;
  /** Overflow behavior when full. @default 'queue' (lossless — never drops input) */
  readonly overflow?: ModalOverflowPolicy;
  /** Parent closure with remaining descendants. @default 'close-with-parent' */
  readonly descendants?: DescendantPolicy;
  /** Named dismissal presets referenced by `openModal({ preset })`. */
  readonly presets?: Record<string, ModalPreset>;
  /**
   * Time the manager waits for UI teardown confirmation (`confirmClosed`)
   * before auto-finalizing a `closing` instance. `0` = manual only.
   * @default 300
   */
  readonly closingTimeout?: number;
  /**
   * Bounded transition log for debugging (ring buffer, no payloads).
   * Off by default to stay production-light.
   * @default false
   */
  readonly diagnostics?: boolean;
}

/**
 * Internal configuration token. Consumers must use `provideRiviniaModal()`.
 * @internal
 */
export const RIVINIA_MODAL_CONFIG = new InjectionToken<RiviniaModalConfig>(
  'RIVINIA_MODAL_CONFIG',
);

export const DEFAULT_MAX_VISIBLE = 5;
export const DEFAULT_CLOSING_TIMEOUT = 300;
export const DIAGNOSTIC_CAP = 100;

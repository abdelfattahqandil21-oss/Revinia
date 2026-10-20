/**
 * Ordering/admission policy. Strategies are pure with respect to lifecycle:
 * the manager owns identity, results, timers and disposal; strategies own
 * ordering and activation width. No mode-dependent `if/else` in the manager.
 */
export interface ModalStrategy {
  readonly name: string;
  /** Maximum simultaneously active instances under this strategy. */
  maxActive(maxVisible: number): number;
  /**
   * Admission of a new request given current visible/queued sets.
   * Returns the action; the manager executes it (and settles results).
   */
  admit(visibleCount: number, queuedCount: number, maxVisible: number): 'activate' | 'queue';
  /** Display order of visible instances, bottom-first. */
  order<T extends { readonly openedSeq: number }>(visible: readonly T[]): readonly T[];
}

/** Multiple concurrent modals, topmost (last opened) interactive. */
export class StackStrategy implements ModalStrategy {
  readonly name = 'stack';
  maxActive(maxVisible: number): number {
    return Math.max(1, Math.floor(maxVisible));
  }
  admit(visibleCount: number, _queuedCount: number, maxVisible: number): 'activate' | 'queue' {
    return visibleCount < Math.max(1, Math.floor(maxVisible)) ? 'activate' : 'queue';
  }
  order<T extends { readonly openedSeq: number }>(visible: readonly T[]): readonly T[] {
    return [...visible].sort((a, b) => a.openedSeq - b.openedSeq);
  }
}

/** Strictly serial: one active modal, FIFO activation of the rest. */
export class QueueStrategy implements ModalStrategy {
  readonly name = 'queue';
  maxActive(_maxVisible: number): number {
    return 1;
  }
  admit(visibleCount: number, _queuedCount: number, _maxVisible: number): 'activate' | 'queue' {
    return visibleCount < 1 ? 'activate' : 'queue';
  }
  order<T extends { readonly openedSeq: number }>(visible: readonly T[]): readonly T[] {
    return [...visible].sort((a, b) => a.openedSeq - b.openedSeq);
  }
}

import { Service, inject, signal } from '@angular/core';
import { PROOF_CONFIG } from './proof-config';

/**
 * Headless state owner for the proof experiment.
 *
 * No DOM access, no storage, no side effects outside its own signals.
 * Who owns the state: this root singleton. How it changes: only via
 * `increment` / `decrement` / `reset`. How consumers observe it: the
 * readonly `count` signal.
 */
@Service()
export class ProofStore {
  private readonly _initial = inject(PROOF_CONFIG, { optional: true })?.initialCount ?? 0;
  private readonly _count = signal(this._initial);

  /** Current count. Readonly — mutate only via methods below. */
  readonly count = this._count.asReadonly();

  increment(by = 1): void {
    this._count.update((v) => v + by);
  }

  decrement(by = 1): void {
    this._count.update((v) => v - by);
  }

  reset(): void {
    this._count.set(this._initial);
  }
}

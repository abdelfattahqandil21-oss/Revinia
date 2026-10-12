import { InjectionToken } from '@angular/core';

export interface ProofConfig {
  readonly initialCount?: number;
}

/**
 * Internal configuration token. Consumers must use `provideProofCore()`.
 * @internal
 */
export const PROOF_CONFIG = new InjectionToken<ProofConfig>('PROOF_CONFIG');

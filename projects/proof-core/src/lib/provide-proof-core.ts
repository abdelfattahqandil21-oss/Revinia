import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { PROOF_CONFIG, ProofConfig } from './proof-config';
import { ProofStore } from './proof-store';

/**
 * Registers the proof store configuration. Call once at bootstrap.
 */
export function provideProofCore(config: ProofConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PROOF_CONFIG, useValue: config }]);
}

/** Shorthand for `inject(ProofStore)`. */
export function injectProofStore(): ProofStore {
  return inject(ProofStore);
}

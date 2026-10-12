import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ProofStore } from './proof-store';
import { provideProofCore } from './provide-proof-core';

function setup(initialCount?: number): ProofStore {
  TestBed.configureTestingModule({
    providers: [provideProofCore(initialCount === undefined ? {} : { initialCount })],
  });
  return TestBed.inject(ProofStore);
}

describe('ProofStore (headless core)', () => {
  it('starts at zero by default', () => {
    expect(setup().count()).toBe(0);
  });

  it('honours the configured initial count', () => {
    expect(setup(5).count()).toBe(5);
  });

  it('mutates only via explicit methods', () => {
    const store = setup(1);
    store.increment();
    store.increment(2);
    expect(store.count()).toBe(4);
    store.decrement();
    expect(store.count()).toBe(3);
    store.reset();
    expect(store.count()).toBe(1);
  });

  it('exposes a readonly signal (no direct .set)', () => {
    const store = setup();
    expect('set' in store.count).toBe(false);
    expect('update' in store.count).toBe(false);
  });
});

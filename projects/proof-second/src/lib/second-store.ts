import { Service, signal } from '@angular/core';

/**
 * Independent headless service. Deliberately knows nothing about
 * `@rivinia/proof-core` — proves packages coexist without coupling.
 */
@Service()
export class SecondStore {
  private readonly _marks = signal<readonly string[]>([]);

  readonly marks = this._marks.asReadonly();

  mark(name: string): void {
    this._marks.update((all) => [...all, name]);
  }

  clear(): void {
    this._marks.set([]);
  }
}

import { describe, expect, it } from 'vitest';
import type { ModalContext, ModalHandle, ModalResult } from './modal-types';

/**
 * Compile-time contract tests. The assertion functions below are NEVER
 * invoked at runtime — they exist so `tsc`/ng-packagr typechecks what IS
 * enforced. Each `@ts-expect-error` marks a line that must fail compilation.
 * The documented holes (`ModalContext.close(unknown)`,
 * `inputs?: Record<string, unknown>`, the internal promise cast) are
 * deliberately NOT asserted here — they compile anything by design.
 */
function assertHandleEnforcesResult(handle: ModalHandle<string>): void {
  handle.close('ok');
  handle.close();
  // @ts-expect-error - number is not assignable to string
  handle.close(123);
}

function assertConfirmedCarriesTypedValue(result: ModalResult<string>): void {
  if (result.status === 'confirmed') {
    const value: string = result.value;
    // @ts-expect-error - string value is not a number
    const notNumber: number = result.value;
    void value;
    void notNumber;
  }
}

function assertContextPreservesData(context: ModalContext<{ title: string }>): void {
  const title: string = context.data.title;
  // @ts-expect-error - title is a string, not a number
  const notNumber: number = context.data.title;
  void title;
  void notNumber;
}

describe('Modal type safety', () => {
  it('exposes typed assertion functions (compile-time only)', () => {
    expect(typeof assertHandleEnforcesResult).toBe('function');
    expect(typeof assertConfirmedCarriesTypedValue).toBe('function');
    expect(typeof assertContextPreservesData).toBe('function');
  });
});

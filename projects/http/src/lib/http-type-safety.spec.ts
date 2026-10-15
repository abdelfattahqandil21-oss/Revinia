import { describe, expect } from 'vitest';
import { unwrapAs } from './http-utils';

/**
 * Compile-time contract tests. Functions below are NEVER invoked — they exist
 * so `tsc`/ng-packagr typechecks what IS enforced. Each `@ts-expect-error`
 * marks a line that must fail compilation. The `unwrapAs<T>` unchecked cast
 * is deliberately NOT asserted — any `T` compiles by design (see JSDoc).
 */
function assertUnwrapAsFlowsGeneric(key: string): void {
  const users: string[] = unwrapAs<string[]>({ data: ['a'] }, key);
  // @ts-expect-error - string[] is not assignable to number[]
  const notUsers: number[] = unwrapAs<string[]>({ data: ['a'] }, key);
  void users;
  void notUsers;
}

describe('Http type safety', () => {
  it('exposes typed assertion functions (compile-time only)', () => {
    expect(typeof assertUnwrapAsFlowsGeneric).toBe('function');
  });
});

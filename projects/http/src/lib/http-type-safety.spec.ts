import { describe, expect } from 'vitest';
import { unwrapAs } from './http-utils';
import type { RiviniaHttp } from './rivinia-http';

/**
 * Compile-time contract tests. Functions below are NEVER invoked — they exist
 * so `tsc`/ng-packagr typechecks what IS enforced. Each `@ts-expect-error`
 * sits directly above a single-line call it must suppress; a stale
 * suppression (line no longer erroring) fails the build by itself.
 * The `unwrapAs<T>` unchecked cast is deliberately NOT asserted — any `T`
 * compiles by design (see JSDoc).
 */
function assertUnwrapAsFlowsGeneric(key: string): void {
  const users: string[] = unwrapAs<string[]>({ data: ['a'] }, key);
  // @ts-expect-error - string[] is not assignable to number[]
  const notUsers: number[] = unwrapAs<string[]>({ data: ['a'] }, key);
  void users;
  void notUsers;
}

declare const http: RiviniaHttp;

function assertDefaultCompiles(): void {
  http.get<User[]>('/api/users');
  http.post<User>('/api/users', {});
  http.put<User>('/api/users/1', {});
  http.patch<User>('/api/users/1', {});
  http.delete<void>('/api/users/1');
  http.getBlob('/api/file.bin');
  http.getText('/api/note.txt');
  http.getResponse<User[]>('/api/users');
  http.postResponse<User>('/api/users', {});
  http.getResource<User[]>('/api/users');
}

function assertExplicitUnwrapCompiles(): void {
  http.get<User[]>('/api/users', { unwrap: true, unwrapKey: 'data' });
  http.post<User>('/api/users', {}, { unwrap: true, unwrapKey: 'payload' });
  http.put<User>('/api/users/1', {}, { unwrap: true, unwrapKey: 'data' });
  http.patch<User>('/api/users/1', {}, { unwrap: true, unwrapKey: 'data' });
  http.delete<void>('/api/users/1', { unwrap: true, unwrapKey: 'data' });
  http.getResource<User[]>('/api/users', { unwrap: true, unwrapKey: 'data' });
  http.get<User[]>('/api/users', { unwrap: false });
}

function assertKeyRequiresUnwrap(): void {
  // @ts-expect-error - key is required when unwrap is enabled
  http.get<User[]>('/api/users', { unwrap: true });
}

function assertKeyAloneRejected(): void {
  // @ts-expect-error - key cannot be supplied alone
  http.get<User[]>('/api/users', { unwrapKey: 'data' });
}

function assertDisabledWithKeyRejected(): void {
  // @ts-expect-error - disabled unwrap cannot carry a key
  http.get<User[]>('/api/users', { unwrap: false, unwrapKey: 'data' });
}

function assertRawMethodsRejectUnwrap(): void {
  // @ts-expect-error - blob responses never unwrap
  http.getBlob('/api/file.bin', { unwrap: true, unwrapKey: 'data' });
  // @ts-expect-error - text responses never unwrap
  http.getText('/api/note.txt', { unwrap: true, unwrapKey: 'data' });
  // @ts-expect-error - raw responses never unwrap
  http.getResponse<User[]>('/api/users', { unwrap: true, unwrapKey: 'data' });
  // @ts-expect-error - raw responses never unwrap
  http.postResponse<User>('/api/users', {}, { unwrap: true, unwrapKey: 'data' });
}

function assertResourceContract(): void {
  http.getResource<User[]>('/api/users', { unwrap: true, unwrapKey: 'data' });
  // @ts-expect-error - key is required when unwrap is enabled
  http.getResource<User[]>('/api/users', { unwrap: true });
  // @ts-expect-error - key cannot be supplied alone
  http.getResource<User[]>('/api/users', { unwrapKey: 'data' });
  http.delete<void>('/api/users/1', { body: { reason: 'x' }, unwrap: true, unwrapKey: 'data' });
  // @ts-expect-error - key is required when unwrap is enabled
  http.delete<void>('/api/users/1', { unwrap: true });
}

interface User {
  id: number;
}

describe('Http type safety', () => {
  it('exposes typed assertion functions (compile-time only)', () => {
    expect(typeof assertUnwrapAsFlowsGeneric).toBe('function');
    expect(typeof assertDefaultCompiles).toBe('function');
    expect(typeof assertExplicitUnwrapCompiles).toBe('function');
    expect(typeof assertKeyRequiresUnwrap).toBe('function');
    expect(typeof assertKeyAloneRejected).toBe('function');
    expect(typeof assertDisabledWithKeyRejected).toBe('function');
    expect(typeof assertRawMethodsRejectUnwrap).toBe('function');
    expect(typeof assertResourceContract).toBe('function');
  });
});

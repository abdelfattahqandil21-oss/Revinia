import { describe, expect, it } from 'vitest';
import { joinUrl, unwrapAs } from './http-utils';

describe('joinUrl', () => {
  it('joins base and endpoint with a single slash', () => {
    expect(joinUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
    expect(joinUrl('https://api.example.com', 'users')).toBe('https://api.example.com/users');
  });

  it('passes absolute endpoints through untouched', () => {
    expect(joinUrl('https://api.example.com', 'https://other.test/x')).toBe(
      'https://other.test/x',
    );
  });

  it('returns the base when the endpoint is empty', () => {
    expect(joinUrl('https://api.example.com/', '')).toBe('https://api.example.com');
  });
});

describe('unwrapAs', () => {
  it('unwraps exactly one level (nested keys are preserved)', () => {
    expect(unwrapAs({ data: [1, 2] }, 'data')).toEqual([1, 2]);
    expect(unwrapAs({ data: { data: [1, 2], page: 1 } }, 'data')).toEqual({
      data: [1, 2],
      page: 1,
    });
  });

  it('supports custom keys', () => {
    expect(unwrapAs({ result: 42 }, 'result')).toBe(42);
  });

  it('passes arrays, primitives and null payloads through', () => {
    expect(unwrapAs([1, 2], 'data')).toEqual([1, 2]);
    expect(unwrapAs('plain', 'data')).toBe('plain');
    expect(unwrapAs(null, 'data')).toBe(null);
    expect(unwrapAs({ data: null }, 'data')).toBe(null);
    expect(unwrapAs({ other: 1 }, 'data')).toEqual({ other: 1 });
  });
});

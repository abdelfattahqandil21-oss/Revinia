import { describe, expect, it } from 'vitest';
import { extractKey, joinUrl, RiviniaHttpUnwrapError, unwrapAs } from '../src/lib/utils/http-utils';

describe('joinUrl', () => {
  it('joins base and endpoint with a single slash', () => {
    expect(joinUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users');
    expect(joinUrl('https://api.example.com', 'users')).toBe('https://api.example.com/users');
  });

  it('passes absolute endpoints through untouched', () => {
    expect(joinUrl('https://api.example.com', 'https://other.test/x')).toBe('https://other.test/x');
  });

  it('returns the base when the endpoint is empty', () => {
    expect(joinUrl('https://api.example.com/', '')).toBe('https://api.example.com');
  });
});

describe('unwrapAs', () => {
  it('extracts exactly one level (nested keys are preserved)', () => {
    expect(unwrapAs({ data: [1, 2] }, 'data')).toEqual([1, 2]);
    expect(unwrapAs({ data: { data: [1, 2], page: 1 } }, 'data')).toEqual({
      data: [1, 2],
      page: 1,
    });
  });

  it('supports custom keys and preserves falsy values', () => {
    expect(unwrapAs({ result: 42 }, 'result')).toBe(42);
    expect(unwrapAs({ n: null }, 'n')).toBe(null);
    expect(unwrapAs({ f: false }, 'f')).toBe(false);
    expect(unwrapAs({ z: 0 }, 'z')).toBe(0);
    expect(unwrapAs({ e: '' }, 'e')).toBe('');
  });

  it('throws RiviniaHttpUnwrapError instead of passing through', () => {
    for (const body of [[1, 2], 'plain', null, { other: 1 }, { data: null }]) {
      if (body !== null && typeof body === 'object' && !Array.isArray(body) && 'data' in body)
        continue;
      expect(() => unwrapAs(body, 'data')).toThrow(RiviniaHttpUnwrapError);
    }
    expect(() => unwrapAs({}, 'toString')).toThrow(RiviniaHttpUnwrapError);
    expect(() => unwrapAs({ data: 1 }, '')).toThrow(RiviniaHttpUnwrapError);
    const err = (() => {
      try {
        unwrapAs({ other: 1 }, 'data');
      } catch (e) {
        return e as RiviniaHttpUnwrapError;
      }
      throw new Error('unreachable');
    })();
    expect(err.key).toBe('data');
    expect(err.body).toEqual({ other: 1 });
  });
});

describe('extractKey', () => {
  it('carries the endpoint into the error message, never the body', () => {
    try {
      extractKey({ secret: 's3cret' }, 'data', 'https://api.test/a');
      expect.unreachable();
    } catch (e) {
      const err = e as RiviniaHttpUnwrapError;
      expect(err).toBeInstanceOf(RiviniaHttpUnwrapError);
      expect(err.message).toContain('https://api.test/a');
      expect(err.message).not.toContain('s3cret');
    }
  });
});

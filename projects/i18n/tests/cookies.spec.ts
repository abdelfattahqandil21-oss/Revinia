import { describe, expect, it } from 'vitest';
import { parseCookie, serializeCookie, shouldSecureCookie } from '../src/lib/utils/cookies';

describe('parseCookie', () => {
  it('extracts values by name, decoding URI escapes', () => {
    expect(parseCookie('a=1; rivinia.i18n.language=en; b=2', 'rivinia.i18n.language')).toBe('en');
    expect(parseCookie('x=%D8%B9; y=2', 'x')).toBe('ع');
    expect(parseCookie('a=1', 'missing')).toBeNull();
    expect(parseCookie(null, 'a')).toBeNull();
    expect(parseCookie(undefined, 'a')).toBeNull();
    expect(parseCookie('', 'a')).toBeNull();
  });
});

describe('serializeCookie', () => {
  it('writes a root-path Lax cookie', () => {
    expect(serializeCookie('k', 'ar')).toBe('k=ar; Path=/; Max-Age=31536000; SameSite=Lax');
  });

  it('adds Secure only when asked (https, never localhost — decided by the caller)', () => {
    expect(serializeCookie('k', 'ar', { secure: true })).toBe(
      'k=ar; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    );
    expect(serializeCookie('k', 'ar', {})).toBe('k=ar; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});

describe('shouldSecureCookie', () => {
  it('is true only for https on a non-localhost host', () => {
    expect(shouldSecureCookie({ protocol: 'https:', hostname: 'example.com' })).toBe(true);
  });

  it('is false on http, localhost, and unknown locations', () => {
    expect(shouldSecureCookie({ protocol: 'http:', hostname: 'example.com' })).toBe(false);
    expect(shouldSecureCookie({ protocol: 'http:', hostname: 'localhost' })).toBe(false);
    expect(shouldSecureCookie({ protocol: 'https:', hostname: 'localhost' })).toBe(false);
    expect(shouldSecureCookie(null)).toBe(false);
    expect(shouldSecureCookie(undefined)).toBe(false);
    expect(shouldSecureCookie({})).toBe(false);
  });
});

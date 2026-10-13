import { describe, expect, it } from 'vitest';
import { parseCookie, serializeCookie } from './cookies';

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
});

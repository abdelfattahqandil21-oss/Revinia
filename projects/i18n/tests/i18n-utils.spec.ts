import { describe, expect, it } from 'vitest';
import { detectBrowserLanguage } from '../src/lib/utils/i18n-utils';

describe('detectBrowserLanguage priority', () => {
  it('honours browser order: top preference wins even via base tag', () => {
    expect(detectBrowserLanguage(['en', 'ar'], ['ar-EG', 'en'])).toBe('ar');
  });

  it('matches exact tags first, case-insensitively', () => {
    expect(detectBrowserLanguage(['en', 'ar'], ['EN-us', 'ar'])).toBe('en');
    expect(detectBrowserLanguage(['ar', 'en'], ['fr', 'AR'])).toBe('ar');
  });

  it('returns null when nothing matches or input is empty', () => {
    expect(detectBrowserLanguage(['ar', 'en'], ['fr', 'de'])).toBeNull();
    expect(detectBrowserLanguage(['ar', 'en'], [])).toBeNull();
    expect(detectBrowserLanguage(['ar', 'en'], undefined)).toBeNull();
    expect(detectBrowserLanguage(['ar', 'en'], ['  ', 'en'])).toBe('en');
  });

  it('preserves the configured id casing', () => {
    expect(detectBrowserLanguage(['ar-EG', 'en'], ['ar-eg'])).toBe('ar-EG');
  });
});

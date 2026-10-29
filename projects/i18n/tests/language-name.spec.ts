import { afterEach, describe, expect, it } from 'vitest';
import { languageName } from '../ui/src/lib/utils/language-name';

/*
 * Every cache-sensitive case uses its own id so a module-level cache from an
 * earlier test cannot answer for a later one.
 */

let restore: (() => void) | undefined;

function replaceDisplayNames(value: unknown): void {
  const original = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');
  Object.defineProperty(Intl, 'DisplayNames', { value, configurable: true, writable: true });
  restore = () => {
    if (original !== undefined) {
      Object.defineProperty(Intl, 'DisplayNames', original);
      return;
    }
    Reflect.deleteProperty(Intl, 'DisplayNames');
  };
}

afterEach(() => {
  restore?.();
  restore = undefined;
});

describe('languageName', () => {
  it('prefers nativeName over Intl', () => {
    expect(languageName({ id: 'en', locale: 'fr', nativeName: 'English (custom)' })).toBe(
      'English (custom)',
    );
  });

  it('falls back to Intl.DisplayNames when nativeName is absent', () => {
    expect(languageName({ id: 'de', locale: 'en' })).toBe('German');
  });

  it('falls back to the id when Intl.DisplayNames is absent', () => {
    replaceDisplayNames(undefined);

    expect(languageName({ id: 'qaa' })).toBe('qaa');
  });

  it('falls back to the id when Intl.DisplayNames throws', () => {
    replaceDisplayNames(
      class {
        constructor() {
          throw new RangeError('unsupported tag');
        }
      },
    );

    expect(languageName({ id: 'qab' })).toBe('qab');
  });

  it('caches one lookup per locale and id', () => {
    let constructed = 0;
    replaceDisplayNames(
      class {
        constructor() {
          constructed += 1;
        }
        of(): string {
          return 'Counted';
        }
      },
    );

    expect(languageName({ id: 'qac', locale: 'qac-locale' })).toBe('Counted');
    expect(languageName({ id: 'qac', locale: 'qac-locale' })).toBe('Counted');
    expect(constructed).toBe(1);
  });

  it('a new locale for the same id constructs a second lookup', () => {
    let constructed = 0;
    replaceDisplayNames(
      class {
        constructor() {
          constructed += 1;
        }
        of(): string {
          return 'Counted';
        }
      },
    );

    languageName({ id: 'qae', locale: 'qae-a' });
    languageName({ id: 'qae', locale: 'qae-b' });

    // A cache keyed on the id alone would answer the second call and stay at 1.
    expect(constructed).toBe(2);
  });
});

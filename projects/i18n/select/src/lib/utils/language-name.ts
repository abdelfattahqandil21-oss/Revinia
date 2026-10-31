import type { LanguageLike } from '@rivinia/i18n/ui';

/*
 * Deliberately duplicated from `@rivinia/i18n/ui` instead of imported at
 * runtime. The select entry point must not pull the UI chunk (toggle, trigger,
 * template, CSS) into its own bundle; the helper is small and the chunk
 * boundary is worth more than the duplication.
 */

/** One lookup per (locale, id); the key cannot collide because of the NUL separator. */
const cache = new Map<string, string>();

/** Resolution order: `nativeName` → `Intl.DisplayNames` → the raw id, never empty. */
export function languageName(entry: LanguageLike): string {
  if (entry.nativeName) {
    return entry.nativeName;
  }

  const locale = entry.locale ?? entry.id;
  const key = `${locale}\u0000${entry.id}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  let name = entry.id;
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    try {
      name = new Intl.DisplayNames([locale], { type: 'language' }).of(entry.id) ?? entry.id;
    } catch {
      name = entry.id;
    }
  }

  cache.set(key, name);
  return name;
}

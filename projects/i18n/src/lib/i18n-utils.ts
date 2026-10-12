import type { StorageStrategy } from './i18n-types';

function getStorage(strategy: StorageStrategy): Storage | null {
  if (strategy === 'none') return null;
  if (typeof window === 'undefined') return null;
  try {
    return strategy === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** SSR-safe read. Returns `null` off-browser, on denial, or when missing. */
export function safeGetItem(key: string, strategy: StorageStrategy): string | null {
  const storage = getStorage(strategy);
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** SSR-safe write. Silently no-ops off-browser or on denial. */
export function safeSetItem(key: string, value: string, strategy: StorageStrategy): void {
  const storage = getStorage(strategy);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Intentionally silent: persistence is best-effort.
  }
}

/**
 * Matches the browser language priority list against supported ids.
 * Exact (case-insensitive) matches win first; otherwise base tags match
 * (`ar-EG` → `ar`). Returns `null` when nothing matches or off-browser.
 * Pure and exported for testing — pass `navigator.languages` in app code.
 */
export function detectBrowserLanguage<T extends string>(
  supportedIds: readonly T[],
  browserLanguages: readonly string[] | undefined,
): T | null {
  if (!browserLanguages || browserLanguages.length === 0) return null;
  const supported = supportedIds.map((id) => id.toLowerCase());
  for (const raw of browserLanguages) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    const exact = supported.indexOf(tag);
    if (exact !== -1) return supportedIds[exact];
  }
  for (const raw of browserLanguages) {
    const base = raw.trim().toLowerCase().split(/[-_]/)[0];
    if (!base) continue;
    const hit = supported.indexOf(base);
    if (hit !== -1) return supportedIds[hit];
  }
  return null;
}

/** Browser language list, `undefined` off-browser (SSR-safe input for detection). */
export function browserLanguages(): readonly string[] | undefined {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;
  try {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      return [...navigator.languages];
    }
    return typeof navigator.language === 'string' ? [navigator.language] : undefined;
  } catch {
    return undefined;
  }
}

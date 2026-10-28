import type { Language, StorageStrategy } from '../models/i18n-types';
import { parseCookie, serializeCookie, shouldSecureCookie } from '../utils/cookies';
import { detectBrowserLanguage, safeGetItem, safeSetItem } from '../utils/i18n-utils';

export interface LanguageStorageDeps<L extends string> {
  readonly key: string;
  readonly strategy: StorageStrategy;
  readonly languages: () => readonly Language<L>[];
  readonly defaultLanguage: L;
  readonly detectBrowser: boolean;
  readonly document: Document;
  /** Present only on the server; carries the request `Cookie` header. */
  readonly request: { readonly headers: { get(name: string): string | null } } | null;
  /** `false` means the app owns persistence (RIV-17). */
  readonly persist: boolean;
  readonly browserLanguages: () => readonly string[] | undefined;
}

/**
 * Reads and writes the persisted language and decides the initial one.
 * Cookie strategy: server reads the request `Cookie` header (no hydration
 * mismatch), browser reads `document.cookie`; the server never writes.
 */
export class LanguageStorage<L extends string> {
  constructor(private readonly _deps: LanguageStorageDeps<L>) {}

  read(): string | null {
    if (this._deps.strategy === 'cookie') {
      const header = this._deps.request?.headers.get('cookie') ?? null;
      if (header !== null) return parseCookie(header, this._deps.key);
      try {
        return parseCookie(this._deps.document.cookie, this._deps.key);
      } catch {
        return null;
      }
    }
    return safeGetItem(this._deps.key, this._deps.strategy);
  }

  /** Persists the language. Server never writes (response cookies are app-owned). */
  write(id: L): void {
    if (this._deps.strategy === 'cookie') {
      if (this._deps.request) return;
      try {
        const location = (
          this._deps.document as unknown as { location?: { protocol?: string; hostname?: string } }
        )?.location;
        this._deps.document.cookie = serializeCookie(this._deps.key, id, {
          secure: shouldSecureCookie(location),
        });
      } catch {
        // Best-effort persistence.
      }
      return;
    }
    safeSetItem(this._deps.key, id, this._deps.strategy);
  }

  /** Explicit switches only (RIV-17): no write when storage already agrees. */
  persistAfterSwitch(id: L): void {
    if (!this._deps.persist) return;
    if (this.read() === id) return;
    this.write(id);
  }

  /** Stored id → browser detection → configured default. */
  resolveInitialLanguage(): L {
    const stored = this.read();
    const languages = this._deps.languages();
    if (stored && languages.some((l) => l.id === stored)) {
      return stored as L;
    }
    if (this._deps.detectBrowser) {
      const detected = detectBrowserLanguage(
        languages.map((l) => l.id),
        this._deps.browserLanguages(),
      );
      if (detected) return detected;
    }
    return this._deps.defaultLanguage;
  }
}

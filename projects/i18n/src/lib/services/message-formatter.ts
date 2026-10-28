import type { TranslateParams } from '../models/i18n-types';
import { formatIcu } from '../utils/icu';

/** Same ceiling as the ICU compile cache: enough for real option sets. */
const FORMATTER_CACHE_LIMIT = 40;

export interface MessageFormatterDeps {
  /** Read on every call so a language switch reaches the next render. */
  readonly locale: () => string;
  /** `key` is the dictionary key being rendered, for the error message. */
  readonly onMissingParam?: (key: string, name: string) => void;
}

/**
 * Renders dictionary text: the ICU subset plus memoized `Intl` formatters.
 * Plain class on purpose (D50): constructed by the facade, never injected.
 */
export class MessageFormatter {
  private readonly _formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

  constructor(
    private readonly _deps: MessageFormatterDeps,
    private readonly _capacity: number = FORMATTER_CACHE_LIMIT,
  ) {}

  /** Test seam for the bound; not part of any public surface. */
  get cachedFormatterCount(): number {
    return this._formatters.size;
  }

  render(
    template: string,
    params: TranslateParams | undefined,
    locale: string,
    key: string,
  ): string {
    // Apostrophe quoting is message syntax, so `''` collapses even when the
    // caller passed no params; everything else keeps the no-params fast path
    // (a plural template without values must stay raw, not pick `other`).
    const quoting = template.includes("'");
    if (params === undefined && !quoting) return template;
    if (!quoting && !template.includes('{')) return template;
    try {
      return formatIcu(template, params ?? {}, locale, {
        onMissingParam: (name) => this._deps.onMissingParam?.(key, name),
      });
    } catch {
      return template;
    }
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this._numberFormatter(options).format(value);
  }

  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this._dateTimeFormatter(options).format(value);
  }

  private _numberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const locale = this._deps.locale();
    const key = `n|${locale}|${JSON.stringify(options ?? null)}`;
    return this._memo(key, () => new Intl.NumberFormat(locale, options)) as Intl.NumberFormat;
  }

  private _dateTimeFormatter(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const locale = this._deps.locale();
    const key = `d|${locale}|${JSON.stringify(options ?? null)}`;
    return this._memo(
      key,
      () => new Intl.DateTimeFormat(locale, options),
    ) as Intl.DateTimeFormat;
  }

  /** Least-recently-used eviction; a hit moves the entry to the fresh end. */
  private _memo(key: string, create: () => Intl.NumberFormat | Intl.DateTimeFormat): object {
    const cached = this._formatters.get(key);
    if (cached) {
      this._formatters.delete(key);
      this._formatters.set(key, cached);
      return cached;
    }
    const created = create();
    if (this._formatters.size >= this._capacity) {
      const oldest = this._formatters.keys().next().value;
      if (oldest !== undefined) this._formatters.delete(oldest);
    }
    this._formatters.set(key, created);
    return created;
  }
}

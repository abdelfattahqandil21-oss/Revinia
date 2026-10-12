import type { HttpLoaderOptions, TranslationLoader } from './loaders';

export class HttpLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(private readonly _options: HttpLoaderOptions) {}

  async load(language: L): Promise<Record<string, unknown>> {
    const url = this._options.buildUrl?.(language) ?? `${this._options.endpoint}/${language}`;
    const response = await fetch(url, { method: this._options.method ?? 'GET' });
    if (!response.ok) {
      throw new Error(`[rivinia/i18n] Failed to load "${url}": ${response.statusText}`);
    }
    return response.json();
  }
}

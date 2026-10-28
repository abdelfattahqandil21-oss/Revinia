import type { HttpLoaderOptions, LoaderContext, TranslationLoader } from '../models/loaders';
import { RiviniaLoadError } from '../models/load-error';
import { resolveLoaderUrl } from '../utils/loader-url';

export class HttpLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(private readonly _options: HttpLoaderOptions) {}

  async load(language: L, context?: LoaderContext): Promise<Record<string, unknown>> {
    const built = this._options.buildUrl?.(language) ?? `${this._options.endpoint}/${language}`;
    const url = resolveLoaderUrl(built, context);
    const response = await fetch(url, { method: this._options.method ?? 'GET' });
    if (!response.ok) {
      throw new RiviniaLoadError(url, response.status, language);
    }
    return response.json();
  }
}

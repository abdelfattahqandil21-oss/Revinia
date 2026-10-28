import type { LoaderContext, RemoteLoaderOptions, TranslationLoader } from '../models/loaders';
import { resolveLoaderUrl } from '../utils/loader-url';

export class RemoteLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(private readonly _options: RemoteLoaderOptions) {}

  async load(language: L, context?: LoaderContext): Promise<Record<string, unknown>> {
    const url = resolveLoaderUrl(this._options.url(language), context);
    const response = await fetch(url, { headers: this._options.headers });
    if (!response.ok) {
      throw new Error(`[rivinia/i18n] Failed to load "${url}": ${response.statusText}`);
    }
    return response.json();
  }
}

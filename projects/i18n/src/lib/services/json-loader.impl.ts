import type { LoaderContext, TranslationLoader } from '../models/loaders';
import { RiviniaLoadError } from '../models/load-error';
import { resolveLoaderUrl } from '../utils/loader-url';

const DEFAULT_BASE_PATH = 'i18n';

export class JsonLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(private readonly _options?: { path?: string }) {}

  async load(language: L, context?: LoaderContext): Promise<Record<string, unknown>> {
    const basePath = this._options?.path ?? DEFAULT_BASE_PATH;
    const url = resolveLoaderUrl(`${basePath}/${language}.json`, context);
    const response = await fetch(url);
    if (!response.ok) {
      throw new RiviniaLoadError(url, response.status, language);
    }
    return response.json();
  }
}

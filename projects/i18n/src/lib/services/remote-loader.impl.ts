import type { LoaderContext, RemoteLoaderOptions, TranslationLoader } from '../models/loaders';

type ResolveUrl = (url: string, context?: LoaderContext) => string;
type CreateError = (url: string, status: number, language: string) => Error;

export class RemoteLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(
    private readonly _options: RemoteLoaderOptions,
    private readonly _resolveUrl: ResolveUrl,
    private readonly _createError: CreateError,
  ) {}

  async load(language: L, context?: LoaderContext): Promise<Record<string, unknown>> {
    const url = this._resolveUrl(this._options.url(language), context);
    const response = await fetch(url, { headers: this._options.headers });
    if (!response.ok) {
      throw this._createError(url, response.status, language);
    }
    return response.json();
  }
}

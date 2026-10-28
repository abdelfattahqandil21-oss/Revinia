import type { HttpLoaderOptions, LoaderContext, TranslationLoader } from '../models/loaders';

type ResolveUrl = (url: string, context?: LoaderContext) => string;
type CreateError = (url: string, status: number, language: string) => Error;

export class HttpLoader<L extends string = string> implements TranslationLoader<L> {
  constructor(
    private readonly _options: HttpLoaderOptions,
    private readonly _resolveUrl: ResolveUrl,
    private readonly _createError: CreateError,
  ) {}

  async load(language: L, context?: LoaderContext): Promise<Record<string, unknown>> {
    const built = this._options.buildUrl?.(language) ?? `${this._options.endpoint}/${language}`;
    const url = this._resolveUrl(built, context);
    const response = await fetch(url, { method: this._options.method ?? 'GET' });
    if (!response.ok) {
      throw this._createError(url, response.status, language);
    }
    return response.json();
  }
}

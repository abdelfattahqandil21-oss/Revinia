export type {
  Direction,
  Language,
  StorageStrategy,
  SwitchStrategy,
  TranslateParams,
  Translation,
  ViewTransitionConfig,
  ViewTransitionInfo,
} from './lib/i18n-types';
export type { RiviniaI18nConfig } from './lib/i18n-config';
export type { TranslationLoader, LoaderDescriptor } from './lib/loaders';
export type { HttpLoaderOptions, RemoteLoaderOptions } from './lib/loaders';
export { customLoader, httpLoader, jsonLoader, remoteLoader } from './lib/loaders';
export { browserLanguages, detectBrowserLanguage } from './lib/i18n-utils';
export { formatIcu } from './lib/icu';
export { injectRiviniaI18n, provideRiviniaI18n } from './lib/provide-i18n';
export { RiviniaI18n } from './lib/rivinia-i18n';
export { ViewTransitionService } from './lib/view-transition.service';
export { RTranslatePipe } from './lib/translate.pipe';

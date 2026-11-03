import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideRiviniaI18n } from '@rivinia/i18n';
import { routes } from './app.routes';

/**
 * The default `jsonLoader()` is used on purpose: this app is the proof that
 * the conventional `public/i18n/{language}.json` layout works in the browser
 * AND on the server, with no custom loader.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The standard SSR pair (what `ng new --ssr` generates): the server HTML
    // is reused instead of re-created, and events that happen before hydration
    // completes are replayed. Without it the client silently re-renders, which
    // would make "hydration" untestable.
    provideClientHydration(withEventReplay()),
    provideRouter(routes),
    provideRiviniaI18n<'ar' | 'en'>({
      defaultLanguage: 'ar',
      languages: [
        { id: 'ar', nativeName: 'العربية', dir: 'rtl', locale: 'ar-EG' },
        { id: 'en', nativeName: 'English', dir: 'ltr', locale: 'en-GB' },
      ],
      fallbackLanguage: 'en',
      storageStrategy: 'local',
      // A dictionary that cannot be fetched is a console.error on purpose:
      // the e2e suite asserts zero console errors, so a broken loader cannot
      // pass silently.
      onLoadError: (language, error) =>
        console.error(`[i18n-e2e] failed to load "${language}"`, error),
    }),
  ],
};

import { APP_ID, DOCUMENT, TransferState, inject } from '@angular/core';
import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server';
import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * Server-side bootstrap. `server.ts` hands this to `renderApplication`, which
 * is the documented `@angular/platform-server` entry point — no Express for
 * this proof app.
 *
 * `renderApplication` serializes the TransferState from the PLATFORM injector,
 * but `bootstrapApplication` gives the app its own root injector, so the
 * dictionaries the i18n service loads land in a different `TransferState`
 * instance and were never written (measured: zero `ng-state` scripts, client
 * refetched both dictionaries). Registering the serializer in the APP injector
 * — where the service actually lives — is what makes the transfer real.
 *
 * `provideServerRendering()` is deliberately NOT used here: it registers a
 * second serializer, and two `ng-state` scripts with the same id mean
 * `getElementById` finds the empty one first (measured: 2 scripts, the client
 * still refetched).
 */
export default (context: BootstrapContext) =>
  bootstrapApplication(
    App,
    {
      ...appConfig,
      providers: [
        ...appConfig.providers,
        {
          provide: BEFORE_APP_SERIALIZED,
          multi: true,
          useFactory: () => {
            const doc = inject(DOCUMENT);
            const appId = inject(APP_ID);
            const state = inject(TransferState);
            return () => {
              if (state.isEmpty) return;
              const script = doc.createElement('script');
              script.id = `${appId}-state`;
              script.setAttribute('type', 'application/json');
              script.textContent = state.toJson();
              doc.body.appendChild(script);
            };
          },
        },
      ],
    },
    context,
  );

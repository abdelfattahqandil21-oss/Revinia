import type { Routes } from '@angular/router';
import { Home } from './home/home';
import { TogglePage } from './toggle/toggle-page';

/**
 * `/` is the i18n proof (dictionaries, ICU, fallback, hardening) and `/toggle`
 * is the `@rivinia/i18n/ui` proof. The router is also what the application
 * builder's SSR route extraction walks: an app without one fails with
 * `NotYetImplemented` while extracting routes (measured 2026-10-28).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home },
  { path: 'toggle', component: TogglePage },
];

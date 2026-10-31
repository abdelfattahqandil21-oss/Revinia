import type { Routes } from '@angular/router';
import { Home } from './home/home';
import { SelectPage } from './select/select-page';
import { TogglePage } from './toggle/toggle-page';

/**
 * `/` is the i18n proof (dictionaries, ICU, fallback, hardening), `/toggle`
 * is the `@rivinia/i18n/ui` proof and `/select` is the
 * `@rivinia/i18n/select` one. The router is also what the application
 * builder's SSR route extraction walks: an app without one fails with
 * `NotYetImplemented` while extracting routes (measured 2026-10-28).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home },
  { path: 'toggle', component: TogglePage },
  { path: 'select', component: SelectPage },
];

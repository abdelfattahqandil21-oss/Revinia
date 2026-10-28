import type { Routes } from '@angular/router';

/**
 * One page on purpose: the e2e suite drives a single document. The router is
 * still installed because the application builder's SSR route extraction
 * expects one (an app without it fails with `NotYetImplemented` while
 * extracting routes, measured 2026-10-28).
 */
export const routes: Routes = [];

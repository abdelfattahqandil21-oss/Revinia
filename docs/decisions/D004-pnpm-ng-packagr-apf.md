## 2026-10-12 — D04: pnpm + ng-packagr + APF

- Context: i18n-egy precedent uses pnpm + `@angular/build:ng-packagr`, partial compilation,
  FESM2022 output with per-loader chunks.
- Decision: Rivinia workspace uses pnpm workspaces, one `projects/<pkg>` per publishable
  package, `ng-package.json` per primary + per secondary entry point. APF compliance verified
  via `npm pack` + consumer install, not assumed.
- Impact: secondary entry points are explicit npm export boundaries; lazy chunks must be
  proven with production builds.

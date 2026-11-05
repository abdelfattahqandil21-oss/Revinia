## 2026-10-28 — D62: Angular 22.2.3 baseline (patch upgrade, all suites green)

- Context: the user asked to raise the workspace to the latest Angular before the
  `@rivinia/i18n` hardening work. Registry state checked on 2026-10-28:
  `@angular/core` latest **22.2.3** (2026-10-14), `@angular/cli` / `@angular/build` /
  `@angular-devkit/*` **22.2.4**, `ng-packagr` **22.2.5**. There is no Angular 23:
  the `next` tag is `22.3.0-next.2`, a pre-release, so "latest stable" is 22.2.3.
  TypeScript is bounded by `@angular/compiler-cli@22.2.3` peers to `>=6.0 <6.1`;
  6.0.3 was already installed and was not changed.
- Decision: upgrade every `@angular/*` runtime package to **22.2.3** exactly and the
  build toolchain to the versions above. No API or peer-range change: libraries keep
  `peerDependencies: {"@angular/core": "^22.0.0"}`.
- Verified: all **10 packages build** (`ng build` per package: http, i18n, toast,
  modal, menu, select, table, datepicker, theme, env), all unit suites pass — http 39, i18n 52, toast 35,
  modal 53, menu 40, select 71, table 207, datepicker 468, env 2 = **967 tests** —
  and the schematic suite passes **40/40** (`pnpm test:schematics`).
- Impact: `AGENTS.md` baseline updated; no consumer migration is needed (patch).
  Unverified: nothing from this change; the upgrade touched no package source.

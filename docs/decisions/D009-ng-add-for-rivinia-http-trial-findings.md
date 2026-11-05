## 2026-10-12 — D09: ng-add for @rivinia/http (trial findings)

- Scope: schematic ONLY inserts 2 imports + 2 providers into `app.config.ts`;
  idempotent, warns-and-skips when config/workspace is unrecognized, never throws
  (a throwing schematic would break `ng add` installs). No file generation.
- Finding 1: compiled schematic MUST use `.cjs` extension. The published package
  carries `"type": "module"` (APF), so Node parses `.js` schematics as ESM and the
  CJS factory breaks (`exports is not defined` → CLI reports "no ng add actions").
  Pipeline: `tsc` (nodenext) → rename `index.js` → `index.cjs`; collection factory
  `./ng-add/index.cjs#ngAdd`; shipped via `ng-package.json` `assets`.
- Finding 2: TS6 deprecates `moduleResolution: node10` — schematics tsconfig uses
  `nodenext/nodenext`. Runtime `require('@angular-devkit/schematics')` resolves via
  the CLI's hoisted copy (verified under npm; pnpm-consumer check still open).
- Verified 2026-10-12: 4/4 schematic unit tests (virtual FS, incl. idempotency +
  missing-config skip); tarball (8 files incl. schematics + README); real
  `ng add <tarball> --baseUrl …` in fresh app wired config correctly; second run
  no-op; wired app production build succeeded (209.59 kB raw initial).
- Open: pnpm-consumer devkit resolution; publish itself (needs user `npm login` +
  `@rivinia` scope availability at publish time).

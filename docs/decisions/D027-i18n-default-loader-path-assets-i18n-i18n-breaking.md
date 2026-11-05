## 2026-10-15 — D27: i18n default loader path `assets/i18n` → `i18n` (breaking)

- Context: the default `jsonLoader()` fetched `assets/i18n/{language}.json`,
  but modern Angular app templates serve `public/` at the site root —
  evidence (installed `@schematics/angular@22.2.2`, checked 2026-10-15):
  `application/index.js:253`
  `assets: [{ 'glob': '**/*', 'input': \`${projectRoot}public\` }]`and template dir`application/files/common-files/public/`(favicon only).
Files in`public/i18n/{lang}.json`are served at`i18n/{lang}.json`, so the
  old default 404s in convention-following apps.
- Decision: `DEFAULT_BASE_PATH = 'i18n'` (relative, site-root). Breaking
  default change → ships as **i18n 0.3.0** (pre-1.0 minor; PROPOSED, not
  bumped in this pass). Migration: move `src/assets/i18n/*.json` →
  `public/i18n/*.json`, or pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`. Synced: `ng-add` starter comment +
  schema `languages` description + tests, README + JSDoc, specs.
- Alternatives rejected: keep `assets/i18n` + document the `public/` mapping
  (leaves the zero-config path broken); an HttpClient-based loader
  (interceptors) and renaming/aliasing `httpLoader` — NOT approved in this
  pass, report only. Any SSR absolute-URL/base-href fix: NOT implemented;
  SSR proof reported separately, options proposed on failure.
- Verified: i18n lib 49/49, schematics 7/7, `ng build i18n`, 14-file tarball.
  NOT published (no explicit user confirmation).

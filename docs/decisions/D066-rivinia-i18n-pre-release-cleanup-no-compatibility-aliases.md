## 2026-10-28 — D66: `@rivinia/i18n` pre-release cleanup — no compatibility aliases

- **Rule.** `@rivinia/i18n` has no official release: the npm versions are experimental
  and carry no backward-compatibility commitment. Transitional names are therefore
  removed before 0.6.0 ships, not carried to 1.0. This supersedes the deprecation
  window D65 planned for the pipe.
- **Removed.** `RTranslatePipe` and the `rTranslate` selector (the alias had existed for
  one unreleased commit); `RiviniaI18n.languageChanged` (the same signal as
  `currentLanguage`); the `silent` option on `loadTranslations()` (declared, never read
  — `background` is the internal flag that suppresses loading state).
- **Kept, deliberately.** The `Translation<L>` object overload of `translate()`; all
  three `t()` overloads; `defineRiviniaI18n()`; `toggle()`/`next()`/`previous()`;
  `getLanguage()`; `clearMissingKeys()`/`clearMissingParams()`; the `formatIcu` caches;
  the `@experimental` view-transition surface; the `@internal` helpers
  (`ViewTransitionService`, cookie helpers, browser-language helpers) — internal is an
  entry-point tier, not a deprecated one.
- **Behaviour preserved.** `RvTranslatePipe` stays impure (`pure: false`): it must
  re-evaluate when the language signal changes, and a pure pipe would freeze the text.
  Fallback resolution, missing-key isolation, ICU rendering and transfer reuse are
  untouched.
- **Evidence.** Public `.d.ts` diffed against the 0.5.0 tag: `RTranslatePipe` →
  `RvTranslatePipe`, `languageChanged` gone, `loadTranslations` lost its dead `opts`
  parameter; no other declaration moved. Unit 276, schematics 40, Playwright 51 on
  chromium/chrome/firefox, SSR smoke 21/21 on chromium and firefox, and a consumer
  production build against the packed tarball that renders `rvTranslate` (key, ICU
  params, translation object) in Chromium with zero page errors.
- **Not done.** No version bump, tag or publish (gate 7); no change outside
  `projects/i18n` except this decision entry.

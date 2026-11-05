## 2026-10-12 — D03: i18n-egy is knowledge source, not to duplicate

- Context: inspected `i18n-egy` v2.2.0 (`/media/abdelfattahqandi/OWN/projects/i18n-egy-main/i18n-egy`).
  Single entry point, `peerDependencies: {@angular/core ^22.0.0}`, `sideEffects: false`,
  `provideI18n` + `I18nService(@Service())` + `injectLanguage()` + `TranslatePipe(pure:false)` +
  `LoaderDescriptor.resolve()->dynamic import()` + signals + SSR-safe storage + RTL via
  `document.documentElement`.
- Decision: reuse its patterns (D02 + descriptor/dedupe/token, SSR guards, peer/sideEffects
  discipline). Do NOT reimplement i18n, pluralization, or locale formatting here until a
  documented gap requires a new `@rivinia/*` wrapper.
- Impact: Phase 5 language integration = thin optional UI selectors over `i18n-egy`,
  never a fork.

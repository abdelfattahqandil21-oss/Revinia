## 2026-10-12 — D24: default JSON loader convention (user directive)

- `RiviniaI18nConfig.loader` omitted → `jsonLoader()` reading
  `assets/i18n/{language}.json` (ar.json, en.json, …). The descriptor still
  code-splits; dictionaries load on switch/`loadTranslations`, never at
  construction. Escape hatch for inline-only apps: `customLoader(async () => ({}))`.
- Trade-off accepted: convention-following apps get zero-config key lookups;
  apps without JSON files see failed fetches surface on `loadingState`/`onLoadError`
  (safe fallbacks preserved). Test hygiene rule learned: every spec that calls
  `setLanguage` without caring about dictionaries must neutralize the loader,
  or fire-and-forget fetches leak across tests (observed 5 stray fetches).

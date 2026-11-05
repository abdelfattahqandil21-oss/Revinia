## 2026-10-29 — D69: a failed dictionary load is loud in dev, once per language

- **The gap.** `warnOnMissingKey` and `warnOnMissingParam` both default to
  `isDevMode() && !handler`, but a *dictionary* load failure — the case that leaves every
  key unresolved and paints raw key names — had no default output at all: the error
  reached `onLoadError` only when the consumer had configured it. The quietest failure was
  the most severe one.
- **Default.** New `warnOnLoadError?: boolean`, `@default isDevMode() && !onLoadError`.
  `false` silences it, `true` keeps it in production. It mirrors the two existing flags
  rather than introducing a third pattern; if the package ever prefers silence by default,
  all three move together.
- **Deduped per language, not per failure.** The warning is keyed on the language id in a
  `Set` for the lifetime of the service, so `reload()` and retry loops cannot flood the
  console. `onLoadError` keeps firing on every failure — telemetry wants the count, the
  warning does not.
- **Not a rejection.** `initialize()` still never rejects and an `'instant'` switch is
  still not rolled back: the warning reports a failure, it does not change behaviour.
- **The JSDoc example.** The hoisted `const AR`/`const EN` example on
  `provideRiviniaI18n` did not type-check (unannotated literals widen to `string` and fail
  `Language`). It now uses `as const`, the form `projects/i18n/tests` already uses.
- **Versioning.** 0.7.1 — a patch: additive, optional, dev-only by default. 0.7.0 was
  never published, so its `/ui` work ships inside this release.

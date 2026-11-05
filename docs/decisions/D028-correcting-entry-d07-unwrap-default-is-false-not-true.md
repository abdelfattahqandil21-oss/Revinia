## 2026-10-15 — D28: correcting entry — D07 unwrap default is `false`, not `true`

- Drift: D07 (2026-10-12) records `provideHttp({…, unwrap?=true…})` and
  "per call `options.unwrap ?? config.unwrap ?? true`", but the shipped code
  has always been opt-in: `DEFAULT_UNWRAP = false` (`http-config.ts:52`),
  resolver `options?.unwrap ?? config?.unwrap ?? DEFAULT_UNWRAP`
  (`rivinia-http.ts`), JSDoc `@default false`, README "opt-in, default off".
  D07's text is wrong; the code is right. This append-only entry corrects the
  log — D07 itself is untouched.
- Decision: the documented-and-shipped default is `unwrap: false` (library
  assumes nothing about the backend; a key alone never enables unwrapping).
  No code change, no version bump (docs-follow-code).
- Numbering note: minted as D27 on its branch; renumbered to D28 on the
  `integration/audit-2026-10` branch where D27 was already taken by the i18n
  loader-path entry (merged first).

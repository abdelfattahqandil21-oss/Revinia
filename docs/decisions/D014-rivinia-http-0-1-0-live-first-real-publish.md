## 2026-10-12 — D14: @rivinia/http@0.1.0 LIVE (first real publish)

- Flow: `npm login` refresh (old stored token lacked org scope) → publish tarball →
  package entered npm STAGED publishing (`0.0.0-stage` placeholder, README empty) →
  user approved the staged `0.1.0` in browser (2FA) → registry live
  (`npm view`: `0.1.0`, `latest: 0.1.0`).
- Interactive proof (user TTY, fresh tailwind app `/media/.../OWN/libs/s`):
  `ng add @rivinia/http` resolved `0.1.0` from the registry and asked all three
  questions (baseUrl skipped, key typed `d`, unwrapping Yes) → wired
  `provideRiviniaHttp({ unwrapKey: 'd' })`. NOTE flagged to user: key is literally
  `'d'` — correct only if their backend envelope uses `d`, else change to `data`.
- Lesson: first-time scoped publishes go through staging + manual approval; budget
  for it (D05 release workflow updated in practice, automation later).

## 2026-10-31 — D82: `@rivinia/i18n/select` — compose, do not rebuild; and the floor a shrink-to-fit host loses

A third entry point (`docs/SPEC-i18n-select.md`, frozen before code): the language
picker, built on `@rivinia/select` instead of a second listbox.

- **Compose through the public `/ui` entry as an optional peer.** The component
  imports `RiviniaSelectComponent` from `@rivinia/select/ui`; `@rivinia/select`
  (`^0.7.0`) is declared in `peerDependencies` with `peerDependenciesMeta.optional`.
  A consumer that never imports `@rivinia/i18n/select` installs no peer, and the core
  and `/ui` FESMs in the tarball are byte-identical to 0.7.2's (`cmp`, not a diff of
  sizes). The pack gate greps the built FESM: only
  `fesm2022/rivinia-i18n-select.mjs` may mention `@rivinia/select/ui`.
- **Reuse the manager contract, do not invent a second one.** `[manager]` takes the
  `RiviniaLanguageManager` already published by `/ui` (four members, structural), so
  `RiviniaI18n` satisfies it and a test double does not need the service. The entry
  re-exports it, so importing `/select` alone is enough. Managed wins over
  `[languages]`/`[current]`/`[busy]`, as the toggle does.
- **Managed picks are last-wins, including a re-pick of the current language.**
  `setLanguageAsync()` never rejects, so a superseded resolution must not emit: the
  component keeps a request counter and only the newest intent may announce. The
  non-obvious case is re-picking the language that is _already_ current — no manager
  call is made for it, yet it is a newer intent and must outvote the switch still in
  flight. Without the counter bump that branch returned early and the pending `en`
  switch surfaced as a change the user never asked for (proven with a red test that
  holds the manager's promise open; mutation-checked by deleting the bump).
- **The picker owns a 14rem floor.** `rv-select`'s `min-width: min(14rem, 100%)`
  resolves that `100%` to 0 inside a shrink-to-fit host, and the i18n host is
  `inline-block`. The bare documented usage therefore rendered an 89px trigger, an
  87px panel and 0-width labels — `English` wrapped as `En / gli / sh`, 134px tall.
  `:host { min-inline-size: 14rem }` restores the floor (measured 224px host, 130px
  label, 19px line). No unit test or build can see this: the `i18n-e2e` `/select` page
  keeps the picker in plain block flow (a stretched grid item hides it) and asserts
  host width, panel width and row line count in Chromium, system Chrome and Firefox.
  Removing the floor fails both geometry tests.
- **Artifacts.** Published from the exact tarball inspected before the publish: 20
  files, 109.6 kB packed / 403.2 kB unpacked, shasum `7e22fe0b…`, sha512
  `MkRtp+KQ…`. This time the tag existed first — `i18n/v0.8.0` points at the
  `--no-ff` merge `253e967`, pushed before `npm publish`.
- **Auth and propagation.** The stored token was logged out (`whoami` → ENEEDAUTH).
  The publish under a PTY raised a `PUT 401`, npm opened the web-auth URL, the
  browser approval completed it (`PUT 202`, exit 0). The version endpoint answered
  404 for about a minute afterwards while `dist-tags` still said `0.7.2`; the direct
  registry query then returned `latest: 0.8.0`, and `npm pack @rivinia/i18n@0.8.0`
  is byte-identical to the inspected tarball.

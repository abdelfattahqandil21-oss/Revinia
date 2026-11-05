## 2026-10-31 — D81: `@rivinia/menu@0.4.0` and `@rivinia/i18n@0.7.2` LIVE — web auth, exact tarballs

- **What shipped.** `@rivinia/menu` 0.4.0 (minor): the pointer-open
  interaction change and the usage/display fixes in D80. `@rivinia/i18n`
  0.7.2 (patch): the view-transition dictionary fix — the load and
  `ensureFallback()` run inside the transition callback, after
  `_currentLanguageId.set(id)`.
- **Artifacts.** Published from the exact tarballs inspected before the
  publish, not rebuilt: menu 8 files, 36.9 kB packed / 131.0 kB unpacked,
  shasum `ac64d13f…`; i18n 17 files, 100.2 kB packed / 356.2 kB unpacked,
  shasum `9e38a8e0…`. The registry `dist.shasum` matches both, and the
  downloaded tarballs are byte-identical (sha1 and sha256).
- **Auth.** The stored npm token authenticated `whoami` but returned E404 on
  PUT; a fresh web login still hit EOTP. Publishing under a PTY printed the
  full `https://www.npmjs.com/auth/cli/<uuid>` URL, and the web approval
  completed the publish. Both packages went to
  `https://registry.npmjs.org/` with `--access public`, tag `latest`.
- **Registry state.** `dist-tags.latest` is `0.4.0` and `0.7.2`. The version
  endpoint answered 404 for ~1–2 minutes before 200 (the same propagation gap
  as D64/D74); do not re-publish during it.
- **Release record.** The publish itself used the inspected `pack/` tarballs,
  so the "publish from a tag" gate was not satisfied at that moment. It was
  closed afterwards: `d4c052c` (menu), `899e815` (i18n), `b12c2d1` (repo
  docs), merged with `--no-ff` as `b32b6b6`; `main` and the annotated tags
  `menu/v0.4.0` / `i18n/v0.7.2` are pushed, and both tags point at the merge
  commit.

## 2026-10-28 — D64: `@rivinia/i18n@0.5.0` LIVE — publish from the tag, and npm "Validating"

- **Order (owner correction).** `i18n/v0.5.0` was already tagged and merged
  (`23d5056`) while npm `latest` was still 0.4.0. Tags are immutable (D17), so
  the refactor cannot land on top of the tag: 0.5.0 had to be published first.
  RIV-18 (core split) and `/ui` start only after this publish.
- **Artifact.** Built in a worktree at the tag (`git worktree add --detach …
  i18n/v0.5.0`, `pnpm install --frozen-lockfile`, `pnpm build:i18n`), not from
  `HEAD`: `git diff i18n/v0.5.0..HEAD -- projects/i18n` is empty, but the
  published bytes still come from the tag's own build. 14 files, 67,151 B,
  `shasum cea589a8c28f3d164d2980563e8eb4e14693f28e`, sha256
  `3d0a77d05dda6cc6fbc8043d3a25ea97e9623569a5f43095edd8316570aa3c6b`.
  Compared file-by-file with the earlier `pack/rivinia-i18n-0.5.0.tgz`:
  identical except one TypeScript declaration-emit union-order line in
  `types/rivinia-i18n.d.ts` (`loadingState`) — same union, not a source change.
- **2FA.** npm answered `EOTP`; a 2FA-bypass token cannot publish, so the
  web-auth flow runs: open the printed URL, approve, npm exchanges it through
  `GET /-/v1/done?authId=…`. It needs a TTY — non-interactively npm exits
  `EOTP` without polling, and at "Press ENTER to open in the browser…" it waits
  forever, so the newline has to be fed.
- **202 is not a failure.** The final `PUT` returned `202 Accepted` and npm
  printed success, yet the registry answered 404 for a while: the npm UI showed
  `0.5.0 Validating`. A 202 plus "Validating" means the upload landed and is
  being processed — do not re-publish, and do not call a version live until
  `dist-tags` says so (the owner's UI flipped to Published, then
  `dist-tags = { latest: '0.5.0' }`).
- **Registry proof.** `dist.shasum` matches the artifact, `dist.fileCount` 14,
  `dist.unpackedSize` 238,082; `npm pack @rivinia/i18n@0.5.0` from the registry
  is byte-identical (sha256 above) to the inspected build. FESM imports
  `@angular/core` only.
- **Gate 4 on the registry version** (clean directory, no `file:` link, `npm
  install` from the registry): `tsc -p tsconfig.app.json --noEmit` exit 0,
  production build 239.26 kB raw / 65.96 kB transfer, lazy loader chunks
  400 / 352 B, `node_modules/.bin/rivinia-i18n-keys` linked, and `--parity`
  over the e2e dictionaries exits 1 with exactly the one real report
  (`MISSING ar key "fallback.onlyEnglish"`).
- npm normalizes `bin` on publish (`./cli/…` → `cli/…`) and prints a misleading
  "invalid and removed" warning; the entry survives (packument, same as 0.4.0).
  Tag, source and `.d.ts` surface untouched.
- Not run: npm provenance (no CI), yarn, WebKit.

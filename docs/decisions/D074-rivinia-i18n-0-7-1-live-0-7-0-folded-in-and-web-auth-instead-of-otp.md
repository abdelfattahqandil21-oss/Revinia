## 2026-10-30 — D74: `@rivinia/i18n@0.7.1` LIVE — 0.7.0 folded in, and web auth instead of `--otp`

- **What shipped.** 0.7.0 was merged (`70b1ad6`) but never published; with no users
  yet the owner folded it into a patch and added `warnOnLoadError`, the
  `defaultLanguage` default, duplicate-id rejection at runtime and compile time, the
  `init` generator and the three-tier README. The registry will never see 0.7.0
  (precedent: 0.3.4 shipped inside 0.4.0).
- **Preconditions.** The branch was merged with `--no-ff` (`e9cebfd`) and its tree is
  the branch tip's tree (`17fe756`, the same as `e508683`). The release commit
  (`b7a18f4`) already carried the version, the CHANGELOG heading and the root README
  Workspace column; the "Latest on npm" column moved only after the publish.
- **Artifact.** Built in a fresh worktree at `i18n/v0.7.1`, not from `HEAD`:
  `pnpm install --frozen-lockfile` with `PNPM_CONFIG_ALLOW_BUILDS` (see the pnpm-12
  note), `pnpm build i18n` exit 0, 345/345 tests in 32 files. 17 files, 99,464 B,
  shasum `eabda8068056598874e8bcf42831aba42b6389ee`, sha256
  `97525973a4f0bc5392e9336fabfa6a8514c0f6fb406f710452cbdcec2353f654`. `diff -r`
  against the tarball inspected before the tag is empty — the two builds are the same
  bytes, so the browser checks already run on the earlier copy apply unchanged.
  README, CHANGELOG and the CLI asset are byte-identical to the tagged sources; the
  FESM imports `@angular/core` only.
- **Web auth replaced `--otp`.** The 40-character token in `~/.npmrc` had stopped
  authenticating: `npm whoami --registry=https://registry.npmjs.org/` and a direct
  `GET /-/whoami` both answered 401 while `/-/ping` answered 200. The owner published
  without `--otp`; npm printed `https://www.npmjs.com/auth/cli/<uuid>`, the browser
  approved the request, and `+ @rivinia/i18n@0.7.1` followed ~40 s later. Owner
  decision: publish without OTP from now on and let the web flow authenticate.
- **Propagation, again.** `GET /@rivinia/i18n/0.7.1` answered 404 for about a minute
  before 200, and `dist-tags` reported `latest: 0.7.1` only after that — the same
  202/"Validating" gap as D64. Do not re-publish during it.
- **Registry proof.** `dist.shasum` and `dist.integrity` match the artifact,
  `dist.fileCount` is 17, `dist.unpackedSize` is 354,387, and the tarball downloaded
  from the registry is byte-identical (same sha256). Peers, `bin` and `exports` are
  unchanged.
- **Gate 4 on the registry version.** A fresh copy of the consumer with
  `"@rivinia/i18n": "0.7.1"` and `pnpm install --registry=https://registry.npmjs.org/`:
  the installed tree is `diff -r`-identical to the inspected tarball, `ng build` exits
  0 at 156.90 kB raw / 46.17 kB transfer plus the two lazy loader chunks, the
  installed `rivinia-i18n-keys init --help` exits 0, and a Chromium smoke switches
  en-GB/ltr → ar-EG/rtl with 0 console errors.
- **Not run:** npm provenance (no CI), yarn and npm-package-manager consumers, and
  Firefox/WebKit against these bytes — the published tarball was exercised in
  Chromium only; the repo's Playwright suites ran against the branch build.
- **Still local at the time of writing:** `main` (31 commits ahead of `origin/main`)
  and the tag `i18n/v0.7.1` had not been pushed.

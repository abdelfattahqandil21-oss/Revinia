## 2026-10-30 — D79: `@rivinia/select@0.7.0` LIVE — 0.6.1/0.6.2 skipped, and the brand mark ships inside

- **What shipped.** The three merges behind D75–D78: `panel-metrics`,
  `ownership-contract` and the premium `variant` skin, plus the 0.6.1 packaging
  rework (layered `src/lib/**` + `tests/`, `@angular/common` declared). 0.6.1 and
  0.6.2 were prepared and never published, so the registry jumps 0.6.0 → 0.7.0
  (precedent: i18n 0.3.4/0.4.0/0.7.0). Minor, not patch: `variant` is public
  API (pre-1.0 rule, CHANGELOG line 3).
- **Preconditions.** `origin/main` and the release commit are the same tree; the
  tag `select/v0.7.0` is annotated (tag object `0d268c17…`) and points at
  `21616160…`, which was already `origin/main` before the publish. The tag was
  moved once — rebuilt and re-tagged to carry the brand mark — and has not been
  touched since.
- **Artifact.** Built from the tagged tree with `ng build select`, packed from
  `dist/select` into `pack/` (outside the package): 8 files, 65,748 B, unpacked
  266,292 B, shasum `be66dc681b6b81deba1a58b500f4135ede1abb7c`, sha256
  `e072652f764afead18bc4449ab085fa2a5302cc689d8bb2d424c1a5065777d3f`,
  integrity `sha512-Oq0GBXv…EMTCA==`. `npm pack` is deterministic here: the
  repack is byte-identical, so the diff-pair check is on extracted trees.
- **The brand mark is a README-only change.** `assets/` is workspace-only; the
  package README points at the raw GitHub URL because npm does not resolve
  relative image paths in package pages, and the light rendition exists because
  the owner's gold measures ≈2.6:1 on white. The JS is untouched: the published
  FESM hashes are the ones the browser matrix and the size measurement ran on.
- **Web auth, again.** The stored 40-character token had been answering 401 since
  2026-10-30 (D74), and `npm publish` in this shell fell to `EOTP`. The owner ran
  `npm login --registry=https://registry.npmjs.org/` (web login, `auth-and-writes`
  account) and then published the same tarball from his TTY without `--otp`:
  `npm publish ./pack/rivinia-select-0.7.0.tgz --access public
  --registry=https://registry.npmjs.org` printed
  `https://www.npmjs.com/auth/cli/<uuid>`, he approved in the browser, and
  `+ @rivinia/select@0.7.0` followed 17.44 s later.
- **Propagation.** `npm view … version` answered `0.6.0` for about a minute —
  `dist-tags` and `versions` both — before flipping to `0.7.0`. Do not re-publish
  during that window (same 202 gap as D64/D74).
- **Registry proof.** `dist-tags.latest` is `0.7.0`, `versions` ends at `0.7.0`,
  `dist.shasum`/`dist.integrity`/`dist.fileCount` (8)/`dist.unpackedSize`
  (266,292) all match. The tarball downloaded from the registry has the same
  sha256 as the packed one, and `diff -r` of both extracted trees is empty.
- **Gate 4 on the registry version.** A fresh consumer with
  `"@rivinia/select": "0.7.0"` and `pnpm install --registry=https://registry.npmjs.org/`:
  the lockfile records the same sha512 as `dist.integrity`, the installed tree is
  `diff -r`-identical to the tarball, and `ng build` exits 0 at 285.10 kB raw /
  74.60 kB transfer for the full demo surface (every mode, every form binding,
  virtual list, paged list, placements, RTL, premium/simple).
- **Not run.** npm provenance (no CI workflow), yarn and npm-package-manager
  consumers, and a publish through the OTP prompt — web auth replaced it.
- **Follow-ups, not part of this release.** Flipping the library default to
  `premium`, wiring `--rv-accent` into the trigger, and the five other prepared
  package releases still sit on `main` unpublished.

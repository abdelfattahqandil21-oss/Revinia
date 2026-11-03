# Versioned documentation policy

**Owner:** Package maintainers and release maintainers
**Purpose:** ensure an installed package can reach instructions matching that exact release.
**Status:** policy approved; hosted platform choice remains open.

## Canonical source and release snapshot

Canonical consumer documentation remains in `projects/<package>/README.md` and the relevant `docs/<topic>/` pages. Do not copy a full docs tree per package or major. A release tag points to an immutable Git tree; that tree is the canonical snapshot for that package version and its examples.

For the initial exact-version links, use repository tag references (conceptually `blob/<package>/v<exact-version>/<path>`). This is a link pattern, not a claim that a separate website exists. Verify the tag/path before shipping the link. Never link package documentation to `main`, a moving branch, `latest`, or an unversioned website URL. Keep relative links within the tagged tree when they resolve in the published README renderer.

The npm package README is itself part of the release tarball and cannot be retroactively repaired for an already published version. Current rc.2 READMEs contain links to `main`; record that as legacy debt and convert them only in a future unpublished release. Do not republish or alter the old artifact to fix links.

## Release workflow

1. Build package docs against the exact package version/API being released. Mark minor-only capabilities with their introduction version; do not imply a capability exists throughout a major.
2. Validate code examples against the package tarball or an isolated fixture installing that exact package version. Include public import paths and the intended Angular peer range.
3. Prepare the package README links to the exact release tag and ensure every referenced file exists in the release tree.
4. Run link validation on the built/published README and source documentation. A missing path, moving `main` URL, wrong package tag, or wrong package version blocks the release.
5. Create the immutable release tag and release artifact only through the approved release process. Preserve the exact docs tree and archive the checksums with release evidence.
6. Keep old tag snapshots accessible for the lifetime of the corresponding package release/support period. Do not silently redirect historical docs to current `main`.

## Platform compatibility

Git tag URLs provide a deterministic fallback because they refer to source already committed. If a hosted documentation platform is later selected, it must support immutable per-version routes, version navigation, retained historical snapshots, source references to release tags and redirects that do not change semantics. Decide canonical hostname, publication mechanism, link form and retention before adding it to package READMEs. No live docs URL is invented here.

## Link and example validation

`node scripts/check-versioned-doc-links.mjs <package> <exact-version> --package-dir=dist/<package>` validates the built manifest, README, changelog, GitHub `blob`/`tree` links pinned to the package tag, and linked source paths. It catches inline and reference-style links; exact-tag `raw.githubusercontent.com` assets are accepted. After packing, pass `--tarball=<file.tgz>` to validate the actual shipped manifest, README and changelog bytes. Once the approved tag exists, add `--verify-tag-snapshot` to verify the tag's package manifest, exact packed README/changelog bytes and every linked path in its immutable tree. In a clean tag worktree, add `--require-tag` to require the tag to resolve to HEAD and the worktree to be clean. The checker does not validate arbitrary external documentation hosts or registry hashes. `check:pack` separately checks required package metadata and files. Current published READMEs are legacy debt, so the release-mode check is not expected to pass against rc.2. Example verification belongs to the exact-version consumer fixture described in [testing architecture](TESTING-ARCHITECTURE.md).

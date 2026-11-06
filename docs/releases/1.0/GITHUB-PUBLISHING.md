# Publish a Rivinia release through GitHub Actions

This workflow publishes only an inspected, synchronized 11-package release
from the exact immutable package tags. It uses npm Trusted Publishing with
GitHub OIDC, so no npm write token or local OTP is used. The workflow is manual:
it does not publish when tags are pushed.

## One-time account setup

Complete these steps in GitHub and npm after `.github/workflows/publish.yml` is
available on `main`:

1. In GitHub, create the `npm-production` environment. Add the account that
   should approve publication as a required reviewer. Do not add environment
   secrets; OIDC needs no npm token.
2. In npmjs.com, open **Settings → Trusted Publishers** for each of the eleven
   packages in `release-groups.json`. Add a GitHub Actions publisher with:
   - Owner: `abdelfattahqandil21-oss`
   - Repository: `Revinia`
   - Workflow filename: `publish.yml`
   - Environment: `npm-production`
   - Allowed actions: enable `npm publish` and `npm dist-tag`
3. Save each package's publisher entry. npm stores this per package; repeat it
   for Popup, Theme, Select, Menu, i18n, Datepicker, Env, HTTP, Toast, Modal,
   and Table. The first successful publish must happen within two days after
   creating a publisher entry.
4. In repository settings for `main`, require the `Required validation` status
   check and code-owner review. The root CODEOWNERS currently names the repo
   owner; add a second trusted reviewer if reviews must be independent. Set
   allowed merge methods to match the human `--no-ff` integration rule, or
   update that rule by a separate owner-approved decision.

## Each release

1. Complete the release skill's exact tarball, consumer, and human gates. Merge
   the approved release candidate to `main`, then create all eleven immutable
   package tags on that same commit using `<package>/v<version>` names.
2. In **Actions → Publish Rivinia release → Run workflow**, choose `main`, enter
   the exact synchronized version, and choose `latest` for stable or `next`
   for a prerelease.
3. Review the verification job. It reruns `pnpm validate:ci`, confirms every
   package manifest and tag points to the same commit, checks versioned docs,
   packs all tarballs, and builds them in a clean consumer. Only then approve
   the `npm-production` environment job.
4. The publish job checks every tarball hash and preflights all registry
   versions before publishing anything. If a matching version/integrity was
   already published during an interrupted run, it safely skips that package;
   a same-version integrity mismatch stops the release. After each publish it
   retries registry reads briefly until the published integrity is visible,
   then checks it against the inspected tarball. A tooling-only follow-up on
   `main` may run the verified package tags again when no package or build input
   changed after those tags; release tags remain pinned to their original
   package source commit.

The GitHub workflow has `id-token: write` only in its protected publish job.
npm automatically creates provenance for public packages published from this
public GitHub repository. The workflow pins npm 11.21.0 to support OIDC
dist-tag publishing. Do not add an `NPM_TOKEN` secret or run `npm publish`
locally for this release process.

## Current setup status

Repository files and all eleven npm Trusted Publisher entries are prepared.
Each npm entry is pending validation and must complete a successful trusted
publish within npm's displayed two-day window. The workflow must first be
available on `main`; GitHub Environment protection and main branch rules also
remain to be configured. Dispatching the workflow is a release action and
still requires explicit approval for the exact package versions, `latest`/`next`
tag, public access, and inspected file lists.

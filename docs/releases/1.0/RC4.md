# 1.0.0-rc.4 — Popup release preparation

**Status:** prepared locally; not pushed, tagged or published. This candidate adds the first public `@rivinia/popup` package to the synchronized `rivinia-1.0` release line. The exact candidate version for Popup, Theme, Select, Menu and i18n is `1.0.0-rc.4`.

This procedure is based on the [1.1 popup runbook](../1.1/PUBLISH-RUNBOOK.md), updated for the owner's decision to include Popup before the 1.0 final. Read [D96](../../decisions/D096-popup-ships-in-the-1-0-rc-4-release-line.md), [D88](../../decisions/D088-1-0-ships-as-1-0-0-rc-1-on-next-then-1-0-0.md), [D93](../../decisions/D093-latest-moves-onto-the-1-0-line-at-1-0-0-rc-1-and-the-whole-0-x-line-is-d.md), [D94](../../decisions/D094-1-0-0-rc-2-is-published-on-annotated-tags-the-four-next-tags-are-aligned.md), and the [1.0 publish runbook](PUBLISH-RUNBOOK.md) before release.

## Candidate order and registry prerequisites

Publish in dependency order: **Popup → Theme → Select → Menu → i18n**. Select and Menu each require Popup as a regular dependency. i18n has an optional peer on Select; Theme is independent. Publish Popup first and verify it from the registry before either consumer package. If Select or Menu is published before `@rivinia/popup@1.0.0-rc.4` exists, an ordinary clean install can fail with `E404` or `ETARGET`; a mismatched dependency range can make the published package un-installable against this candidate.

D88 initially placed the four original packages on `next`, then moved stable `1.0.0` to `latest`. D93 explicitly moved the 1.0 RC line to `latest`; D94 later says each new RC is published to `next` and `latest` is moved across the whole set afterward. Current registry reads show rc.3 on both `latest` and `next` for all four existing packages. The owner must select one rc.4 strategy before publishing:

- **Direct `latest`:** consistent with the current visible 1.0 line and the owner's instruction that the RC remains on `latest`; each publish moves `latest`, while `next` stays at rc.3 unless moved separately.
- **`next` first, then align `latest`:** follows D94's newer sequencing rule; publish every candidate with `--tag next`, verify the complete set, then explicitly move `latest` to rc.4 for all five. This adds a tag-alignment pass and keeps consumers of `latest` on rc.3 until then.

The current instruction resolves the publish tag as `latest`; an **Owner decision** remains whether `next` should also be aligned to rc.4 after all five are published. D94's alternative is to publish to `next` and then move `latest` for all five. A first publication of the new Popup name requires `--access public`. The owner runs every `npm publish` using interactive web authentication (`--auth-type=web`); enter any OTP only in the interactive prompt and never store it. CI has no npm trusted-publishing job, so this release does not use provenance.

## Pre-publish gates

From a clean checkout at the approved release commit, build and test all five packages. i18n's build also builds Select as a prerequisite.

```sh
pnpm exec ng build popup
pnpm build:theme
pnpm build:select
pnpm build:menu
pnpm build:i18n
pnpm exec ng test popup --watch=false
pnpm test:theme
pnpm exec ng test select --watch=false
pnpm exec ng test menu --watch=false
pnpm exec ng test i18n --watch=false
```

Run repository and package checks after the manifests, README and changelogs are release-ready:

```sh
pnpm check:pack
pnpm check:readmes
pnpm check:docs
pnpm check:governance
pnpm check:skills
pnpm check:contrast
pnpm check:theme-dark
pnpm check:component-theme
pnpm check:popup-ssr
pnpm check:popup-mutations
pnpm check:duplication
pnpm test:scripts
```

Run versioned-document validation for each exact candidate build before packing:

```sh
for package in popup theme select menu i18n; do
  pnpm check:versioned-doc-links "@rivinia/$package" 1.0.0-rc.4 "--package-dir=dist/$package"
done
```

Also build the menu/select/popup E2E harnesses and run Chromium and Playwright WebKit where available. WebKit automation is not native Safari testing. Required human checks remain in [HUMAN-CHECKS.md](HUMAN-CHECKS.md), including a real mobile keyboard resize, screen reader pass, native Safari and Firefox forced-colors. Popup extraction reopens focus, dismissal, resize and cross-browser checks; use the document's current per-check status, not historical evidence.

Pack exact archives into ignored `pack/`, inspect each package manifest, exports, types, peers/dependencies, file list and FESM imports, and verify LICENSE is present. Popup must be a regular dependency (not a peer) of Select and Menu, and external from their FESM. Record SHA-256 for all five archives. Run the theme package checker against its exact tarball.

The governance gate verifies Select and Menu use `@rivinia/popup: ^1.0.0-rc.4`. The caret range accepts rc.4 and stable `1.0.0`, but not rc.3. i18n's optional Select peer remains `^1.0.0-rc.1`, which accepts rc.4; keep `peerDependenciesMeta` optional.

## Registry sequence — owner only

Use only the exact inspected archives from `pack/`. The first publish is public and web-authenticated. The current owner instruction selects `latest`.

```sh
npm publish pack/rivinia-popup-1.0.0-rc.4.tgz --access public --auth-type=web --tag latest
npm view @rivinia/popup@1.0.0-rc.4 version
```

Before publishing Select or Menu, create a clean consumer and verify npm resolves Popup from the registry:

```sh
mkdir /tmp/rv-rc4-popup-check && cd /tmp/rv-rc4-popup-check
npm init -y
npm install @rivinia/popup@1.0.0-rc.4
npm ls @rivinia/popup
```

Only after that succeeds, publish each following inspected tarball in order, checking each exact registry version before continuing:

```sh
npm publish pack/rivinia-theme-1.0.0-rc.4.tgz --access public --auth-type=web --tag latest
npm view @rivinia/theme@1.0.0-rc.4 version
npm publish pack/rivinia-select-1.0.0-rc.4.tgz --access public --auth-type=web --tag latest
npm view @rivinia/select@1.0.0-rc.4 version
npm publish pack/rivinia-menu-1.0.0-rc.4.tgz --access public --auth-type=web --tag latest
npm view @rivinia/menu@1.0.0-rc.4 version
npm publish pack/rivinia-i18n-1.0.0-rc.4.tgz --access public --auth-type=web --tag latest
npm view @rivinia/i18n@1.0.0-rc.4 version
```

If the owner reverses the current instruction in favor of D94's next-first flow, publish every package with `--tag next` and, after all five verify, align `latest` explicitly:

```sh
for package in popup theme select menu i18n; do
  npm dist-tag add "@rivinia/$package@1.0.0-rc.4" latest
done
```

## Gaps and findings

- `LICENSE` was absent from all five initial archives. Four packages now include a package-local copy of the repository MIT license and pass `check:pack`. Theme’s exact-file checker rejects an added `LICENSE` as unexpected, and this task does not authorize editing that checker. Therefore the Theme tarball still lacks `LICENSE`; minimal fix is to add it to the checker’s expected files and keep the package-local asset.
- `check:pack` now includes Popup in its default five-package run. The API-surface snapshot test still passes without a snapshot edit; it enumerates the existing public entry points and does not demand an update for this new package.

## Real-registry verification after publication

Use a new empty consumer directory and npm registry packages only (no workspace paths, tarballs, or overrides). First install only Select and verify Popup arrives transitively; then verify the full integration set:

```sh
npm init -y
npm install @rivinia/select@1.0.0-rc.4
npm ls @rivinia/select @rivinia/popup
# In a second clean consumer:
npm install @rivinia/select@1.0.0-rc.4 @rivinia/menu@1.0.0-rc.4 @rivinia/theme@1.0.0-rc.4 @rivinia/i18n@1.0.0-rc.4
npm ls @rivinia/popup
```

The second dependency tree must contain one deduped Popup copy. Build a production Angular consumer that imports documented paths, exercise the SSR render/run path, and confirm registry metadata and tags:

```sh
npm view @rivinia/popup dist-tags
npm view @rivinia/theme dist-tags
npm view @rivinia/select dist-tags
npm view @rivinia/menu dist-tags
npm view @rivinia/i18n dist-tags
```

Record production bundle sizes for select-only and menu-only apps against the 1.0.0 baseline. The prior local-tarball consumer is only a pre-publish simulation; it does not replace this registry verification.

## Tags and immutable release commit

After the local release commits are pushed and merged to `main` with `--no-ff`, the owner creates all five immutable tags on the recorded release SHA and pushes them:

```sh
git tag -a popup/v1.0.0-rc.4 <RELEASE_SHA> -m "@rivinia/popup 1.0.0-rc.4"
git tag -a theme/v1.0.0-rc.4 <RELEASE_SHA> -m "@rivinia/theme 1.0.0-rc.4"
git tag -a select/v1.0.0-rc.4 <RELEASE_SHA> -m "@rivinia/select 1.0.0-rc.4"
git tag -a menu/v1.0.0-rc.4 <RELEASE_SHA> -m "@rivinia/menu 1.0.0-rc.4"
git tag -a i18n/v1.0.0-rc.4 <RELEASE_SHA> -m "@rivinia/i18n 1.0.0-rc.4"
git push origin --tags
```

Never move or replace these tags. Published versions cannot be changed. If an artifact is defective, publish a new fix-forward version (for example, the next approved RC); deprecate a bad registry version with `npm deprecate`. In particular, if Select or Menu reaches npm while Popup is missing or mismatched, consumers may receive E404/ETARGET or an unsatisfiable dependency. Publish no dependent package until Popup's exact version is readable from npm; if the bad dependent version has already shipped, leave it immutable, deprecate it, and issue a corrected version after Popup is available.

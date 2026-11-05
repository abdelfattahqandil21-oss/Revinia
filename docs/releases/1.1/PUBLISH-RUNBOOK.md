> **Superseded for Popup first publish:** use [the 1.0.0-rc.4 procedure](../1.0/RC4.md); the owner moved Popup into the 1.0 line before final.

# Publish runbook — Rivinia 1.1 (planned)

**Status: planning only.** The planned stable release is a synchronized 1.1.0 of
all five rivinia-1.0 group members: popup, theme, select, menu and i18n. The
group name is retained by policy. This document does not authorize version
changes, merge, tags or publication. See
[release-groups.json](../../../release-groups.json#L4-L12) and
[VERSIONING](../../engineering/VERSIONING.md#L15-L28). Do not use the
time-specific registry state in the historical [1.0 runbook](../1.0/PUBLISH-RUNBOOK.md)
as current state.

This procedure can start only after 1.0.0 final has been published, this branch
has been rebased onto that main, and the owner has separately approved release
integration.

## 1. Publish order: popup, theme, select, menu, i18n

The order follows package manifests:

| Order | Package | Dependency reason |
| ---: | --- | --- |
| 1 | @rivinia/popup | Must exist before Select and Menu, both of which have it in regular dependencies; current development pins are 0.0.0. [Select](../../../projects/select/package.json#L34-L36), [Menu](../../../projects/menu/package.json#L30-L33) |
| 2 | @rivinia/theme | Independent in its manifest; no dependency edge to the other group members. [Theme](../../../projects/theme/package.json#L1-L18) |
| 3 | @rivinia/select | Depends on popup. i18n has an optional peer on Select, so Select precedes i18n. [i18n](../../../projects/i18n/package.json#L33-L44) |
| 4 | @rivinia/menu | Depends on popup; it has no manifest dependency on Select. |
| 5 | @rivinia/i18n | Its optional Select peer must resolve to the new group version when installed. |

D88's order for the original four was theme → select → menu → i18n; 1.1
inserts popup first and preserves the relative order of those four. D88 placed
i18n after Select because of its peer ([D88](../../decisions/D088-1-0-ships-as-1-0-0-rc-1-on-next-then-1-0-0.md#L3-L11)).
If Select or Menu is published while its popup version is absent, a clean
install can fail with E404 or ETARGET. If the range is wrong, the dependent
artifact cannot be repaired in place.

## 2. Owner decision: RC soak or direct stable

Choose before writing release versions or publish commands; keep all five
packages on one generation and dist-tag.

| Option | Flow | Consequence |
| --- | --- | --- |
| **A — 1.1.0-rc.1 on next** | Publish all five RCs to next, soak in a real consumer, then build/tag/publish the distinct 1.1.0 stable versions to latest after a second approval. | Gives a soak period; requires two versioned builds and publish/tag passes. An RC never becomes the stable version; latest stays on the old stable until moved. |
| **B — direct 1.1.0 on latest** | Publish the five stable packages directly to latest after all gates and human checks. | Fewer steps, but the default install receives the new line immediately and there is no RC soak. |

**Owner decision required:** choose A or B, the tags for each publish, and
whether/when next moves after stable. D88's RC choice was explicitly for 1.0;
VERSIONING says not to infer a future prerelease policy from it
([VERSIONING](../../engineering/VERSIONING.md#L55-L59)).

## 3. First scoped publish, authentication and provenance

@rivinia/popup is a new scoped name. npm defaults a new scoped package to
restricted visibility; its first public publication requires --access public.
Direct publishing requires account 2FA (or a granular token configured to
bypass 2FA). The current repo procedure is owner-run npm CLI publishing using
web authentication: the owner runs **every npm publish**, approves browser/web
auth and any second-factor prompt interactively, and never stores an OTP/token
in a file, command log or commit. The historical publish command uses
--auth-type=web and no --otp
([auth notes](../1.0/PUBLISH-RUNBOOK.md#L331-L353),
[publish command](../1.0/PUBLISH-RUNBOOK.md#L532-L538)). npm may place a first
publish into staged review requiring manual browser approval
([release skill](../../../.agents/skills/rivinia-release/SKILL.md#L148-L150)).

The repo currently has no trusted-publishing workflow: CI runs checks but no
npm publish job, and the 1.0 registry record says attestations were absent
([CI](../../../.github/workflows/ci.yml#L1-L39),
[1.0 provenance evidence](../1.0/PUBLISH-RUNBOOK.md#L578-L579)). Therefore
this procedure does not claim provenance. If the owner requires it, configure
a public GitHub Actions OIDC trusted publisher before release. npm's current
[scoped package](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/),
[2FA](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
and [trusted publisher](https://docs.npmjs.com/trusted-publishers/) docs apply.

## 4. Rebase and merge prerequisite

Wait for 1.0.0 final to be published and verified. Fetch main, rebase this
branch onto current main, resolve and review conflicts, then rerun affected
gates. Owner integration is human and uses --no-ff; no automatic merge, commit
or push is authorized ([AGENTS.md](../../../AGENTS.md#L30-L36)).

1. Record git status -sb, git rev-parse HEAD main origin/main, and the 1.0.0
   final registry readback. Preserve unrelated work.
2. Rebase on the latest main; no reset or force-push.
3. Expect conflicts in release-groups.json, the root README package table,
   package CHANGELOGs, docs/decisions/README.md, and release indexes. Keep
   the 1.0 records historical and unchanged.
4. Recheck five manifests and group; rerun builds, unit suites, docs/readme/
   governance/versioned-link/pack gates, theme gates, exact-tarball consumer
   checks, browser and required human checks. Recreate tarballs from the final
   tagged tree.
5. Only after separate merge approval, merge to main with --no-ff. Merge
   approval does not approve tags or publishing.

## 5. Version alignment and dependency range

At release, all five manifests align at the chosen exact version. Planned
stable target: 1.1.0; popup remains 0.0.0 during development and aligns only at
release ([VERSIONING](../../engineering/VERSIONING.md#L15-L26)). Set both
Select and Menu's dependency to:

    "dependencies": {
      "@rivinia/popup": "^1.1.0"
    }

For an RC, use the owner-approved prerelease range and prove its registry
resolution. The caret form follows the existing sibling peer convention:
i18n currently uses @rivinia/select: ^1.0.0-rc.1
([manifest](../../../projects/i18n/package.json#L33-L44)). VERSIONING classifies
the new shared runtime capability as a synchronized minor addition
([lines 24–26](../../engineering/VERSIONING.md#L24-L26)).

**Checker gap:** check:pack validates required files, repository metadata,
engines and that export targets are packed; it does not compare dependency
ranges with the group version ([checker](../../../scripts/check-pack.mjs#L64-L112)).
Current governance checks synchronize package versions but not Select/Menu's
popup dependency range. Minimal fix proposal (not part of this docs task): add
a governance assertion/test that release-aligned Select/Menu manifests declare
^<group-version> for popup, retaining the explicit development 0.0.0 exception.

## 6. Preflight gates and exact archives

After all candidate versions, READMEs and CHANGELOGs are updated, run global
documentation/governance gates before tagging. Then check candidate docs, build
packages in dependency order, and gate each fresh dist before packing.

    pnpm check:docs
    pnpm check:readmes
    pnpm check:governance

    # Set to the owner-approved exact version: 1.1.0 or 1.1.0-rc.1.
    VERSION=1.1.0
    for PKG in popup theme select menu i18n; do
      pnpm check:versioned-doc-links "@rivinia/$PKG" "$VERSION" "--package-dir=dist/$PKG"
    done

    pnpm exec ng build popup
    pnpm build:theme
    pnpm build:select
    pnpm build:menu
    pnpm build:i18n

    for PKG in popup theme select menu i18n; do
      pnpm check:pack "$PKG"
    done

check:readmes, check:docs and check:governance are root-wide. Run them after
all five docs/manifests are edited and again after a rebase.
check:versioned-doc-links with --package-dir=dist/PACKAGE runs after each package
is built with the chosen exact version. It checks manifest/docs version,
CHANGELOG heading, version-pinned links and source paths; it does not prove the
tag or registry exists.

Theme-only checks run after the fresh Theme build and before approving its
archive:

    pnpm test:theme
    pnpm check:theme
    pnpm check:theme-dark
    pnpm check:contrast
    node scripts/check-theme-package.mjs /tmp/rivinia-1.1.0/rivinia-theme-1.1.0.tgz

Pack every fresh dist to a temp directory. Manually inspect exact manifests,
exports and type files, peers/dependencies, full archive file list, and FESM
runtime imports. check:pack does not replace this inspection.

    PACK=/tmp/rivinia-1.1.0
    mkdir -p "$PACK"
    for PKG in popup theme select menu i18n; do
      npm pack "./dist/$PKG" --pack-destination "$PACK"
    done
    tar -tzf "$PACK/rivinia-popup-1.1.0.tgz"
    tar -xOf "$PACK/rivinia-select-1.1.0.tgz" package/package.json
    tar -xOf "$PACK/rivinia-menu-1.1.0.tgz" package/package.json
    grep -oE "from ['\"][^'\"]+['\"]" dist/select/fesm2022/*.mjs dist/menu/fesm2022/*.mjs | sort -u

For the RC path, replace the 1.1.0 filename components above with the exact
approved VERSION (for example, 1.1.0-rc.1) consistently in both archives.

The Select and Menu archives must show popup in regular dependencies, not
peerDependencies, at the approved range. Prove the candidate pair in clean
consumers with existing consumer:smoke (exact tarballs, documented specifiers,
production build):

    pnpm consumer:smoke -- --tarball "$PACK/rivinia-popup-1.1.0.tgz" \
      --tarball "$PACK/rivinia-select-1.1.0.tgz" \
      --specifier @rivinia/select --specifier @rivinia/select/ui
    pnpm consumer:smoke -- --tarball "$PACK/rivinia-popup-1.1.0.tgz" \
      --tarball "$PACK/rivinia-menu-1.1.0.tgz" \
      --specifier @rivinia/menu --specifier @rivinia/menu/ui

Run it for Theme with documented CSS specifiers, and i18n with documented
exports both with Select installed and with --absent-package @rivinia/select.
consumer:smoke accepts exact tarballs, installs them in a temporary consumer
and production-builds it ([usage](../../../scripts/consumer-smoke.mjs#L7-L10),
[install/build](../../../scripts/consumer-smoke.mjs#L150-L180)).

After tags exist, rerun versioned-doc validation against each exact archive in
a clean tagged checkout. --require-tag checks tag equals HEAD and clean tree;
--verify-tag-snapshot checks README/CHANGELOG and linked paths against that
immutable tag ([options](../../../scripts/check-versioned-doc-links.mjs#L200-L230)).

    pnpm check:versioned-doc-links @rivinia/popup "$VERSION" \
      "--tarball=$PACK/rivinia-popup-$VERSION.tgz" --require-tag --verify-tag-snapshot

Repeat for Theme, Select, Menu and i18n with their exact archives.

## 7. Namespaced tags, after merge

After the approved --no-ff merge, on a clean main containing the complete
candidate, the **owner** creates five immutable tags pointing at that
same commit. Root Git policy requires tags on main whose names use the package
name, slash, v and exact semver; a fix ships as a new version
([AGENTS.md](../../../AGENTS.md#L34-L36)). Stable 1.1.0
tags:

    popup/v1.1.0
    theme/v1.1.0
    select/v1.1.0
    menu/v1.1.0
    i18n/v1.1.0

If option A is selected, first use v1.1.0-rc.1; stable later gets new v1.1.0
tags from its approved commit. The owner verifies each tag points to the
approved main SHA, and pushes tags only after separate approval. Never move or
recreate a tag. The namespaced form follows policy, not historical 1.0 tag
inconsistencies ([1.0 history](../1.0/PUBLISH-RUNBOOK.md#L460-L500)).

## 8. Publish and verify popup before its dependents

Commands are templates only. The owner personally runs every publish using
the exact inspected archive from its approved tag. Name npmjs explicitly
because local npm config may target a mirror
([1.0 procedure](../1.0/PUBLISH-RUNBOOK.md#L335-L353)).

    PKG=popup
    VERSION=1.1.0
    DIST_TAG=latest # Owner decision: next for RC, latest for direct stable.
    TARBALL=/tmp/rivinia-1.1.0/rivinia-popup-$VERSION.tgz
    npm whoami --registry=https://registry.npmjs.org/
    npm publish "$TARBALL" --registry=https://registry.npmjs.org/ \
      --access public --tag "$DIST_TAG" --auth-type=web

Before publishing Select or Menu, confirm the exact popup version exists in
the real registry and install it in a clean consumer:

    npm view "@rivinia/popup@$VERSION" version dist.tarball dist.integrity \
      --registry=https://registry.npmjs.org/
    VERIFY=$(mktemp -d)
    cd "$VERIFY"
    npm init -y
    npm install --registry=https://registry.npmjs.org/ "@rivinia/popup@$VERSION"
    npm ls @rivinia/popup

Readback must show the approved version, tarball and integrity; the install
and tree must resolve that exact version. Only then publish Theme, Select, Menu
and i18n in order. After each publish run
npm view "@rivinia/$PKG@$VERSION" version dist.tarball dist.integrity with
--registry=https://registry.npmjs.org/ and record it. Stop on missing or
mismatched readback; do not publish dependents.

    npm view "@rivinia/$PKG@$VERSION" version dist.tarball dist.integrity \
      --registry=https://registry.npmjs.org/

## 9. Post-publish verification from npmjs

The pre-release simulation used local tarball overrides. Close that gap with
two clean installs from the real registry:

    SINGLE=$(mktemp -d)
    cd "$SINGLE"
    npm init -y
    npm install --registry=https://registry.npmjs.org/ @rivinia/select@1.1.0
    npm ls @rivinia/select @rivinia/popup

    PAIR=$(mktemp -d)
    cd "$PAIR"
    npm init -y
    npm install --registry=https://registry.npmjs.org/ \
      @rivinia/select@1.1.0 @rivinia/menu@1.1.0
    npm ls @rivinia/popup

The first consumer's direct Rivinia dependency is Select only; popup resolves
through Select. The pair's tree must contain one popup version, with one edge
marked deduped.

Download the registry tarballs and run the existing production/import consumer
gate. Their popup dependency will resolve from npmjs because no local popup
override is supplied:

    PUBLISHED=/tmp/rivinia-published-1.1.0
    mkdir -p "$PUBLISHED"
    npm pack @rivinia/select@1.1.0 --pack-destination "$PUBLISHED" \
      --registry=https://registry.npmjs.org/
    npm pack @rivinia/menu@1.1.0 --pack-destination "$PUBLISHED" \
      --registry=https://registry.npmjs.org/
    pnpm consumer:smoke -- --tarball "$PUBLISHED/rivinia-select-1.1.0.tgz" \
      --specifier @rivinia/select --specifier @rivinia/select/ui
    pnpm consumer:smoke -- --tarball "$PUBLISHED/rivinia-select-1.1.0.tgz" \
      --tarball "$PUBLISHED/rivinia-menu-1.1.0.tgz" \
      --specifier @rivinia/select --specifier @rivinia/select/ui \
      --specifier @rivinia/menu --specifier @rivinia/menu/ui

For SSR, install these registry packages into a clean Angular SSR consumer,
then run this renderApplication proof from that consumer directory. It imports
the installed documented exports, runs in plain Node without DOM globals, and
asserts the two trigger markers. The source pattern is also in
[check:popup-ssr.mjs](../../../scripts/check-popup-ssr.mjs); do not run that
workspace script as registry evidence because its resolver maps to local dist.

    node --input-type=module <<'NODE'
    import '@angular/compiler';
    const [{ Component, provideZonelessChangeDetection }, { bootstrapApplication },
      { provideServerRendering, renderApplication }] = await Promise.all([
      import('@angular/core'), import('@angular/platform-browser'),
      import('@angular/platform-server'),
    ]);
    const [{ RiviniaSelectComponent }, { RiviniaMenuComponent, RiviniaMenuItem }] =
      await Promise.all([import('@rivinia/select/ui'), import('@rivinia/menu/ui')]);
    class Host {}
    Component({ selector: 'ssr-host', standalone: true,
      imports: [RiviniaSelectComponent, RiviniaMenuComponent, RiviniaMenuItem],
      template: '<rv-select id="ssr-select" label="Status" [options]="[{value:\'a\',label:\'A\'}]" />' +
        '<rv-menu menuLabel="Actions"><button rv-menu-trigger>Menu</button><div rv-menu-panel><button rvMenuItem id="one">One</button></div></rv-menu>',
    })(Host);
    const html = await renderApplication((context) => bootstrapApplication(Host,
      { providers: [provideServerRendering(), provideZonelessChangeDetection()] }, context),
      { url: '/', document: '<html><head></head><body><ssr-host></ssr-host></body></html>' });
    if (!html.includes('rv-select-trigger') || !html.includes('rv-menu-trigger')) {
      throw new Error('SSR output is missing the Select or Menu trigger');
    }
    console.log('installed-package Select/Menu SSR passed');
    NODE

The existing workspace SSR runner does not cover this installed-package case;
the missing reusable runner is listed under Gaps found.

Record raw and gzip browser initial-chunk sizes for identical Select-only and
Menu-only production consumers: compare exact registry 1.0.0 tarballs to
1.1.0, holding Angular, Node, builder, app source and optimization constant.
Record wc -c and gzip -9 results. The current consumer smoke deletes its
temporary build, so retain a separate temp consumer for these measurements
(see Gaps found).

## 10. Human checks still owed

Carry forward [1.0 HUMAN-CHECKS](../1.0/HUMAN-CHECKS.md):

- **S2 screen-reader pass:** still owed for the published UI. Run the documented
  matrix and include Select/Menu focus and pick behavior.
- **S4 resize with a real mobile keyboard:** re-opened for 1.1 because shared
  resize/dismissal mechanics moved into popup core. Test keyboard opening,
  typing, orientation change and close on a physical device.
- **S7 native macOS Safari:** re-opened because positioning/dismissal are now
  shared runtime behavior. WebKit is not Safari; check native popover/top layer,
  Safari chrome resize, RTL and virtualized-list behavior.
- **Firefox forced-colors/high-contrast:** there is no dedicated task in the
  1.0 human checklist; a11y verification says no forced-colors pass. Popup is
  headless and does not move CSS, so extraction itself does not re-open this
  CSS-specific check. It remains an outstanding accessibility gap before the
  release decision ([a11y record](../../testing/a11y-verification.md#L49-L54),
  [browser support](../../testing/browser-support.md#L35-L40)).

S2 is a pre-existing obligation; S4 and S7 must be repeated because shared
positioning/dismissal code changed. The 1.0 record marks real-device resize and
Safari not tested ([S4](../1.0/HUMAN-CHECKS.md#L94-L108),
[S7](../1.0/HUMAN-CHECKS.md#L176-L192)); D95 requires retaining behavior and
consumer contracts
([D95](../../decisions/D095-popup-core-extraction-after-the-1-0-final.md#L6-L11)).

## 11. Rollback and failure handling

Published package/version pairs are immutable. Fix an RC with the next RC
(for example, 1.1.0-rc.2); fix a defective stable 1.1.0 with 1.1.1. Deprecate
only the exact bad version if consumers could otherwise install it:

    npm deprecate "@rivinia/select@1.1.0" \
      "Use 1.1.1; 1.1.0 has an unresolved @rivinia/popup dependency."

If Select/Menu is published while popup is absent, installs can fail with
E404; publish and verify the required popup version before further packages.
That only restores installs if the immutable dependency range admits it. If the
range is missing or mismatched, the dependent artifact cannot be repaired:
publish corrected 1.1.1 package(s), coordinate the group, then deprecate the
bad exact version. Wrong integrity, registry install failure or tag mismatch
are stop conditions. This follows the immutability policy
([AGENTS.md](../../../AGENTS.md#L28-L30)) and exact-version deprecation pattern
([1.0 rollback](../1.0/PUBLISH-RUNBOOK.md#L708-L717)).

## 12. Approval statement — before each release action

Merge, tag, push and publish are separate approvals. Before publishing, the
owner's approval must identify package names, exact versions, registry, access
and inspected archive contents ([AGENTS.md](../../../AGENTS.md#L28-L30)). The
owner personally runs each npm publish.

    I approve publishing this synchronized release set:
    Packages: @rivinia/popup, @rivinia/theme, @rivinia/select, @rivinia/menu, @rivinia/i18n
    Exact versions: <five exact versions; all 1.1.0 or all 1.1.0-rc.1>
    Registry: https://registry.npmjs.org/
    Access: public
    Dist-tag: <next or latest; one approved strategy for the set>
    Inspected archives and contents:
      @rivinia/popup — <filename, SHA-256/integrity, full file list>
      @rivinia/theme — <filename, SHA-256/integrity, full file list>
      @rivinia/select — <filename, SHA-256/integrity, full file list>
      @rivinia/menu — <filename, SHA-256/integrity, full file list>
      @rivinia/i18n — <filename, SHA-256/integrity, full file list>
    Tag commit: <approved main SHA and five immutable namespaced tags>

## Gaps found

1. **Dependency-range consistency is not checked.** Add a small governance
   assertion/test for Select/Menu's popup range at a release-aligned group
   version, preserving the 0.0.0 development exception. No code change here.
2. **CI's versioned-doc loop omits popup.** It currently names only
   theme/select/menu/i18n ([workflow](../../../.github/workflows/ci.yml#L24-L31)).
   Add popup after release docs use the candidate version; development 0.0.0
   docs are not a release snapshot.
3. **No registry-backed SSR runner.** consumer:smoke builds from exact archives
   but deletes its temp directory and does not SSR-render. Add consumer:ssr or
   an option that retains the temp consumer and invokes SSR.
4. **No retained bundle-size output.** consumer:smoke removes build output.
   Add --keep-dir or a size-report option to make 1.0-versus-1.1 measurements
   auditable; manual identical-consumer measurements remain required.
5. **Firefox forced-colors steps are absent.** The a11y record says no such pass
   exists, but HUMAN-CHECKS has no procedure. Add one or explicitly accept that
   gap before release.
6. **No provenance configuration.** Manual CLI history has no attestations and
   CI has no trusted publisher. Decide whether 1.1 requires provenance; if yes,
   configure a public GitHub Actions trusted publisher before publishing.
7. **Popup is not version-doc-ready during development.** Running the checker
   against its current 0.0.0 manifest fails because its development README
   does not claim a release version or link canonical docs through a release
   tag. At the release candidate, update the popup README/CHANGELOG to the
   approved exact version and tag-pinned docs, then require the check to pass.

## Gate record

Record every gate as passed, failed or not run, with exact package version,
tagged commit, archive hash/file list and consumer result. Prior-release
evidence does not count as a current green gate.

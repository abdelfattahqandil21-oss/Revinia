# Synchronized stable release — 1.0.0

**Current status: all eleven `1.0.0` packages were published to npm on 2026-11-05 and `latest` now points to `1.0.0`. Registry verification confirms exact archive integrity. Namespaced Git tags are still absent; the pre-release S2, S4 and S8 checks were not completed before publication. Safari was deferred by owner.**
This document tracks the first stable release of all eleven libraries. The
pre-publication registry snapshot on 2026-11-05 showed Popup, Theme, Select,
Menu and i18n with `latest`
at `1.0.0-rc.4` (Theme, Select, Menu and i18n have `next` at `rc.3`); Datepicker
is `0.1.0`, Env `0.3.3`, HTTP `0.5.3`, Toast `0.5.1`, Modal `0.6.1`, and Table
`0.1.0`. None of the eleven has a published `1.0.0`. The workspace candidate is
`1.0.0` for all eleven.

## Scope and publish order

The synchronized set is `@rivinia/popup`, `@rivinia/theme`, `@rivinia/select`,
`@rivinia/menu`, `@rivinia/i18n`, `@rivinia/datepicker`, `@rivinia/env`,
`@rivinia/http`, `@rivinia/toast`, `@rivinia/modal` and `@rivinia/table`.

Publish Popup first. Select and Menu declare it as a regular runtime dependency,
so consumers must be able to resolve `@rivinia/popup@1.0.0` before either
dependent is published. Theme and the remaining six libraries are independent;
they may follow in any order. Publish Select before i18n because i18n's optional
Select peer must resolve when the `/select` entry point is used. A practical
sequence is Popup → Theme → Select → Menu → i18n → Datepicker → Env → HTTP →
Toast → Modal → Table.

After publishing Popup, read back the version and install it in a clean consumer
before publishing Select or Menu:

```bash
npm view @rivinia/popup@1.0.0 version --registry=https://registry.npmjs.org/
npm install @rivinia/popup@1.0.0 --registry=https://registry.npmjs.org/
```

Repeat `npm view @rivinia/<package>@1.0.0 version` after every publish. Publish
the stable versions to `latest`; this makes a bare install resolve to the first
stable release. Leave historical `next` prerelease tags unchanged unless the
owner separately decides to realign them.

## Release gates

For each package, build and test the exact candidate, then run:

```bash
pnpm check:pack
pnpm check:readmes
pnpm check:docs
pnpm check:governance
node scripts/check-versioned-doc-links.mjs @rivinia/<package> 1.0.0 --package-dir=dist/<package>
```

Run `pnpm check:theme` against the exact Theme tarball. Pack all eleven
`dist/<package>` directories, inspect the exact archives (exports, type entry
points, peers, dependencies, file list and FESM runtime imports), then run
`node scripts/check-versioned-doc-links.mjs` against each tarball. Install the
archives through `node scripts/consumer-smoke.mjs` in its clean consumer,
compile every documented public import and stylesheet, and run a production
build. The external all-library lab additionally must pass its production build,
SSR render and Playwright route, guard, table and modal flows.

At stable publish time, Select and Menu must depend on
`@rivinia/popup: ^1.0.0`; i18n's `@rivinia/select` optional peer must be
`^1.0.0`. `pnpm check:governance` proves group alignment and the Popup dependency
ranges; `language-select-surface.spec.ts` proves the optional-peer contract.

At candidate-preparation time, the exact `1.0.0` archives passed local consumer
build and import checks, but the registry had no `1.0.0` versions. The archives
had not been built from a clean release tag, so they were not yet release
artifacts.

### Exact local archive inventory (2026-11-05)

These are the final local `pack/` archives used by `node scripts/consumer-smoke.mjs`.
They are review candidates only; none is an approved publish artifact until the
same source is integrated on `main`, tagged, and re-inspected there.

| Package | Archive size | Files | SHA-256 |
| --- | ---: | ---: | --- |
| `@rivinia/popup` | 5,051 B | 7 | `f1ef1ad94425f58dfe6ceadadc2a3e657d102ef1f83687d7e1903be7e8303fed` |
| `@rivinia/theme` | 9,395 B | 10 | `e57b27e9952b3b40e0e8d5c48919b62c945d443ceafd0986c1abeadb11eee8d5` |
| `@rivinia/select` | 65,512 B | 10 | `e17a6afab465e97813f8c48e0fb277f73242e29f38c407190bf3fc3c5eed0c42` |
| `@rivinia/menu` | 35,681 B | 10 | `f3f7c081a8aedd93bbe48dc5ab95d2a823a69eb7832c7a01f93b0f957af69620` |
| `@rivinia/i18n` | 94,116 B | 21 | `ff010434efdda99e45cf48a10beb39378f587aaa37c921a77c0775773bcb3587` |
| `@rivinia/datepicker` | 128,128 B | 10 | `f54b7e66af0711893b859f6c8974cef6c390e9cf67b187f2b1a8e5e07c1704de` |
| `@rivinia/env` | 7,504 B | 9 | `a97667497770d81601ad5493311f816c3df427183b66ee6fc75d664923ad5751` |
| `@rivinia/http` | 21,948 B | 10 | `50746c54cacd8c8ac347ea3e1e9f5feb069af0fe84acf92dfcf0a7269ecfef0d` |
| `@rivinia/toast` | 29,983 B | 13 | `fc6f1c2f0337cd7cc21f10ca84f0882bd4fde8383a5d2791e04c2c3d14684e54` |
| `@rivinia/modal` | 56,788 B | 13 | `a83eea38289f8a1de94062f39be0b1eef22536f5e25f880f65e428a765d8e14f` |
| `@rivinia/table` | 81,773 B | 10 | `8cc1e16405757c86d4a1da82923fc37e8c234406528b896be8c2672793c07838` |

The package archives contain each package's `README.md`, `CHANGELOG.md`, license,
manifest, declaration files, FESM output, and any package-specific styles or
schematics listed by `pnpm check:pack`. The exact archive consumer build passed,
including all documented imports and the Theme stylesheet. Registry `npm view`
lookups on 2026-11-05 returned no `1.0.0` version for all eleven package names.

## Human checks and soak

The existing [1.0 human checklist](HUMAN-CHECKS.md) tracks these checks. On
2026-11-05, the owner deferred native Safari verification to a later release;
it is not a 1.0.0 promotion gate. The remaining open work is:

- S2: screen reader pass.
- S4: real phone/tablet resize with the on-screen keyboard.
- S8: real consumer soak against published release candidates.

The runbook requires S8 before stable promotion. `1.0.0-rc.5` is only a local
candidate today, so the soak cannot use it yet. These checks must be completed
and their results recorded before stable release approval.

### S8 scope for the synchronized eleven-package group

Once all eleven `1.0.0-rc.5` versions exist on the registry, run the real
consumer soak against those exact versions, not a moving `next` range or local
tarball override. Exercise the all-library lab's production routes and cover:

- Theme light/dark switching; Select single, multi, search and RTL; Menu keyboard
  navigation and projected controls; Popup dismissal and focus restore through
  both Select and Menu.
- i18n Arabic/English switching, RTL, production build and SSR; Datepicker date
  and time selection with `Africa/Cairo` explicitly selected.
- Env configuration; HTTP request/response behavior; Toast actions and
  dismissal; nested Modal open/result/close; Table sorting, filtering, paging,
  selection and duplicate/invalid row identity behavior.
- `npm ls @rivinia/popup` has one deduped copy, every documented import resolves,
  the production build succeeds, and SSR renders and hydrates without errors.

Keep the package versions exact during the sitting. Any integration failure
blocks promotion: fix it in a new RC, publish the new RC through the approved
release process, then restart the soak against that exact version set.

## Main, tags and publication boundary

The verification above was performed on the release-preparation branch. Before
creating any release tags, integrate the reviewed candidate to `main` with
`--no-ff` and rerun the applicable gates on the merged tree. Only then may the
owner create immutable package tags on that `main` commit:

```text
popup/v1.0.0
theme/v1.0.0
select/v1.0.0
menu/v1.0.0
i18n/v1.0.0
datepicker/v1.0.0
env/v1.0.0
http/v1.0.0
toast/v1.0.0
modal/v1.0.0
table/v1.0.0
```

The owner runs every `npm publish` from the exact inspected archive and approved
tag. After publication, verify each `npm view` result, clean-consumer installs,
one deduped Popup for Select + Menu, production build, SSR, documented imports,
and bundle sizes against the previous published release. Published versions are
immutable; any correction ships as a new version.

Candidate preparation does not create release tags, push branches, change npm
dist-tags or publish packages.

## Local integration verification — 2026-11-05

The candidate was merged to local `main` with `--no-ff` as `164473b`; this
status was recorded by `e973deb`. The merged tree is locally verified, while
`origin/main` remains unchanged. No release tags or package publications were
created.

- All eleven package unit-test commands passed, as did `pnpm test:schematics`
  and `pnpm test:scripts`.
- All eleven `pnpm exec ng build <package>` builds passed.
- `pnpm check:governance`, `pnpm check:readmes`, `pnpm check:docs`,
  `pnpm check:pack`, the exact Theme tarball check, and all source/tarball
  `check-versioned-doc-links` checks passed. `check:docs` reports 41 existing
  warnings and zero failures.
- The exact local tarballs passed the clean `consumer-smoke.mjs` production
  build, public imports and Theme CSS. `npm ls @rivinia/popup --all` reports one
  deduped copy through Select and Menu. SSR `/libraries/table` returned HTTP 200
  with the expected rendered-table marker.
- The all-library lab ran `CI=1 npm run test:e2e`: 10/10 passed across Playwright
  Chromium and Firefox. Its config always starts a fresh server to avoid stale
  bundles. This does not provide native Safari, a screen-reader listening pass,
  or real-device on-screen keyboard evidence; S2, S4, S7 and the published-RC
  soak S8 remain open.
- Specialized checks passed: `pnpm check:contrast`, `pnpm check:theme-dark`
  (Chromium + Firefox), `pnpm check:component-theme` (Chromium + Firefox),
  `pnpm check:popup-ssr`, and `pnpm check:popup-mutations` (8/8 mutants killed
  exactly as expected). The shared Popup/Menu/Select suite also passed all 126
  tests with `pnpm exec playwright test --project=webkit`. This is Playwright
  WebKit engine coverage, not native Safari coverage.
- Full shared Playwright Chromium run: 125 passed, 1 skipped. The i18n browser
  suite passed 96/96 across bundled Chromium, system Chrome and Firefox; its SSR
  smoke passed 36/36. `pnpm check:skills` passed.

## Final `1.0.0` artifact preparation after the datepicker focus fix — 2026-11-05

The datepicker focus-out fix and its tests/docs were committed as `8140ee9` and
merged to local `main` with `--no-ff` as `6237c3b`. All eleven manifests and
`release-groups.json` agree on `1.0.0` and group `rivinia-1.0`.

- Production builds passed in dependency order: `pnpm exec ng build popup`,
  `theme`, `select`, `menu`, `i18n`, `datepicker`, `env`, `http`, `toast`,
  `modal`, `table`.
- Unit tests passed: Popup 5, Theme 11, Select 166, Menu 66, i18n 376,
  Datepicker 470, Env 2, HTTP 40, Toast 35, Modal 55 and Table 210
  (1,436 total). `pnpm test:schematics` passed 40 and `pnpm test:scripts`
  passed 140 more.
- `pnpm check:governance`, `pnpm check:readmes`, `pnpm check:pack`,
  `pnpm check:skills`, `node scripts/check-theme-package.mjs
  pack/rivinia-theme-1.0.0.tgz`, and `git diff --check` passed. `pnpm check:docs`
  passed with zero failures and 41 existing warnings.
- Built package directories and all eleven exact tarballs passed
  `check-versioned-doc-links`. Each 1.0.0 package README carries its own
  namespaced 1.0 tag links (`<package>/v1.0.0`), not `main`; the exact tarball
  check confirmed the README is inside each archive. The immutable tag
  snapshots cannot yet be checked because those tags do not exist; run
  `--verify-tag-snapshot --require-tag` after integration/tagging.
- Exact archive inspection passed for exports, type targets, peers, dependencies,
  file lists and FESM runtime imports. Select/Menu depend on Popup at `^1.0.0`;
  i18n's Select peer is optional and `^1.0.0`. Theme retains CSS/SCSS side-effect
  metadata. Full archive sizes, file lists and SHA-256 values are in the
  inventory above and private task record.
- Clean `consumer-smoke.mjs` install/build passed for all eleven tarballs,
  nineteen documented package import paths and the three Theme CSS entry
  points. A second clean consumer built i18n without installing optional
  `@rivinia/select`. In the all-library lab, all eleven vendor archive hashes
  matched `pack/`, `npm ls @rivinia/popup --all` showed one deduped Popup, the
  production build passed, all 12 Playwright cases passed across Chromium and
  Firefox, and SSR returned 200 for `/`, `/libraries/datepicker` and
  `/libraries/table`.
- README release links are ready to become immutable once tags are created. A
  package's README inside its 1.0.0 tarball keeps linking to its 1.0.0 tag when
  the repository later advances to 2.0.0; the new 2.0.0 README will link to the
  separate `<package>/v2.0.0` snapshot.

### Still blocks final promotion

- S2: the owner confirmed Orca speech works on Linux and tried the datepicker
  Tab flow; the full Select/Menu screen-reader matrix is not yet recorded.
- S4: real phone/tablet keyboard and rotation check not run.
- S7: deferred by owner to a later release; not a 1.0.0 blocker.
- S8: real consumer soak against published release candidates not run. No
  `1.0.0-rc.5` set is published; local tarballs and Vercel preview do not satisfy
  the registry soak requirement.

At candidate-preparation time, no release tags, `npm publish` or push had been
performed. The post-publication state and remaining release record are below.

## Post-publication verification — 2026-11-05

This addendum supersedes the pre-publication status above. The owner published
all eleven `1.0.0` archives. The first immediate `npm view` calls returned
`E404` while npm was processing the uploads; a later registry check confirmed
all eleven versions are visible and each package's `latest` tag is `1.0.0`.

- For all eleven packages, npm registry `dist.integrity` and `dist.shasum` match
  the exact local `pack/rivinia-<package>-1.0.0.tgz` bytes.
- A clean consumer installed `@rivinia/select@1.0.0` as its only direct Rivinia
  dependency; Popup resolved through Select. After adding Menu, `npm ls
  @rivinia/popup --all` showed one deduped Popup. The same consumer then installed
  all eleven registry packages, compiled all 19 documented JavaScript entry
  points and the three Theme CSS imports, and passed an Angular production build.
- An SSR smoke app importing those public entry points rendered successfully.
  This was a minimal `renderApplication` smoke, not the full all-library SSR/E2E
  soak.
- Namespaced release tags are absent locally and on `origin`. The versioned
  README links therefore do not yet resolve to GitHub snapshots. The local
  `main` integration (`6237c3b`, followed by release-doc commit `a403567`) is
  not pushed.
- S2 (full screen-reader matrix), S4 (physical phone/tablet keyboard), and S8
  (real consumer soak against published RCs) were still open when stable
  publication happened. S7 Safari remains deferred by owner. Published versions
  are immutable; follow-up fixes require new versions.
- Post-publish bundle-size comparison against the preceding release was not
  run. Record it with the follow-up consumer audit.

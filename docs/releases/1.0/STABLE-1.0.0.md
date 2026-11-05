# Synchronized stable release — 1.0.0

**Status: merged to local `main` (`164473b`), not published, and not ready for final promotion.**
This document tracks the first stable release of all eleven libraries. Registry
state last checked on 2026-11-05: Popup, Theme, Select, Menu and i18n are at
`1.0.0-rc.4`; Datepicker, Env, HTTP, Toast, Modal and Table remain on their
published 0.x versions. The workspace candidate is `1.0.0` for all eleven.

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

The exact `1.0.0` candidate was built and local gates were run on the current
topic branch. The exact archives passed the local consumer build and imports;
the registry still has no `1.0.0` versions. It has not been built from a clean
release tag, and therefore is not yet a release artifact.

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
| `@rivinia/datepicker` | 127,883 B | 10 | `da8f18dd75d43923080294200eaab545fffae9a3d6998f10baf800e44b32cb19` |
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

The existing [1.0 human checklist](HUMAN-CHECKS.md) still has open work:

- S2: screen reader pass.
- S4: real phone/tablet resize with the on-screen keyboard.
- S7: native Safari pass.
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

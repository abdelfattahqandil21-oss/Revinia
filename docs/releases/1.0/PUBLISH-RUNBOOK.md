# Publish runbook — Rivinia 1.0

**Status: step 2 has run twice for all four packages — `1.0.0-rc.1` on the morning of
2026-11-03 and `1.0.0-rc.2` on the evening of the same day — and for nothing after
that.** Read the next section before running anything: every sentence in this file that
names `1.0.0-rc.1` as the state of the registry is the **rc.1 record**, kept for the
audit trail, and `latest` moved off it twice. The owner published
`@rivinia/theme@1.0.0-rc.1`, `@rivinia/select@1.0.0-rc.1`,
`@rivinia/menu@1.0.0-rc.1` and `@rivinia/i18n@1.0.0-rc.1` to the `next` dist-tag on
2026-11-03, from the `theme/v1.0.0-rc.1`, `select/v1.0.0-rc.1`, `menu/v1.0.0-rc.1`
and `i18n/v1.0.0-rc.1` tags — the first two point at tips of
`release/1.0-integration` (`3cb8b51`, `1e78c6c`), the last two at `d5d7f91`, which is
`main`. The four rc.1 tags are **lightweight** (`git cat-file -t` prints `commit`);
the four `*/v1.0.0-rc.2` tags are **annotated** (`git cat-file -t` prints `tag`, and all
four peel to `69af061`), which is the release form D92 predicted and the reason "every
rc tag is lightweight" can no longer be said from this line. **`latest` answered
`1.0.0-rc.1` for all four after D93** — the owner moved it
on the afternoon of 2026-11-03 and deprecated the whole 0.x line, which is D93 below
and `D93` in `docs/DECISIONS.md`; the `dist-tags` objects quoted in the table rows
are the state each check read **at publish time**, and every one of them is
superseded. The agent
that prepared the rcs published nothing, created no tag and pushed no tag: every
command below is still a human action. **Step 1 is done, pushed and long since
overtaken: the SHAs this file prints as the state of `main` (`173f150`, `9281f85`) are
history — `rc.2` reached `main` through its own merge, `f066a32` (row 12 of
`docs/releases/1.0/MERGES.md`), and the governance work came after it. Read the state at
run time with `git rev-parse main origin/main release/1.0-integration
origin/release/1.0-integration` and `git tag -l "*rc*"`.** The tagged builds of `menu` and `i18n`
each reproduced their pre-flight tarball byte for byte, and the tarballs downloaded
from the registry `cmp`-identical to both. What is left in this file is `1.0.0-rc.3`
— prepared on `release/1.0-rc3`, branched off `main` and gated on 2026-11-04, and as of
that read **untagged, unpushed and unpublished**, which is why step 2 below still has to
be run by a human — (its payload: the rc.2 changelog headings the published rc.2 tarballs
do not contain, plus the tag-pinned README links the new gate demands), then the soak
(step 3), then the promotion to `1.0.0` (step 4).

## What the registry answers today — read this before step 2

On 2026-11-04 the agent read the npmjs mirror's packuments and the four rc.2 tarballs
themselves. Every one of the four answers `{"latest":"1.0.0-rc.2","next":"1.0.0-rc.2"}`;
`1.0.0-rc.3` does not exist in any form — no version in the packument, no tag locally or
on origin, no manifest. The four tarballs verify: local `shasum` equals `dist.shasum`,
base64 `sha512sum` equals `dist.integrity`, at 8,419 B / 9 files (theme), 66,818 / 9
(select), 36,887 / 9 (menu), 93,265 / 20 (i18n), and those four shasums are the numbers
the owner read off npmjs, which is what makes a cache read a real one. Full record:
`D94` in `docs/DECISIONS.md`.

Three consequences for whoever runs the next publish.

1. **`select` and `menu` answered `next: 1.0.0-rc.1` while `latest` answered `rc.2`,
   until the owner moved them on 2026-11-04.** That was npm behaving as documented:
   rc.1 went out with `--tag next`, D93 moved `latest` by hand, rc.2 went out with
   `--tag latest` — a publish moves exactly one pointer and only the one it names. The
   rule for every rc from now on: **publish the new version with `--tag next` for all
   four packages, then move `latest` for all four, and always all four in one run** —
   never two packages on one tag and two on another, because
   `docs/releases/1.0/HUMAN-CHECKS.md` installs `@rivinia/{theme,select,menu,i18n}@next` in a single command
   and a split line makes the soak test two rc generations at once.
2. **The published rc.2 artifacts are internally inconsistent.** `package.json` says
   `1.0.0-rc.2` and the README says `Package version: **1.0.0-rc.2**`, but `CHANGELOG.md`
   inside the same tarball stops at `## 1.0.0-rc.1` for all four. A published version is
   immutable, so this is the content of rc.3.
3. **`check:versioned-doc-links` — added after rc.2 by `34a52c9` — fails on every rc.2
   artifact and on the current tree: 12 issues for theme, 14 for select, 12 for menu, 17
   for i18n.** One is the missing CHANGELOG heading; the rest are repository links that
   point at `main` where the gate requires the immutable tag (`<pkg>/v<version>/…`). Run
   it per package before packing:
   `node scripts/check-versioned-doc-links.mjs @rivinia/<pkg> <version>`, and with
   `--tarball=<exact.tgz> --require-tag --verify-tag-snapshot` once the tag exists. A red
   run here is a stop, not a warning.

Also still owed and not done: **`1.0.0-rc.1` is not deprecated on any of the four** (D93's
"deprecate the rc the next one replaces" step, by version, never by range), and no
production build or consumer install has ever run against a published rc.2 artifact.

| Package           | rc on `next`             | Registry verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rivinia/theme`  | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `76fbabd7…`; the downloaded tarball `cmp`-identical to `/tmp/rv-rc-theme/rivinia-theme-1.0.0-rc.1.tgz` (8,396 B, 9 files); `npm install @rivinia/theme@next` in a scratch consumer resolved all six `exports`, and `diff -r` of the installed tree against the inspected tarball printed nothing                                                                                                                                                                                                                                                                                                                                                 |
| `@rivinia/select` | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `9e268244…`; the downloaded tarball `cmp`-identical to `/tmp/rv-rc-select/rivinia-select-1.0.0-rc.1.tgz` (66,787 B, 9 files); `dist-tags` `{"latest":"0.7.1","next":"1.0.0-rc.1"}`; `npm install @rivinia/select@next` resolved all three `exports` in a scratch consumer; the barrels carry the freeze's counts — `.` 7 names, `./ui` 10. Read the note under the table                                                                                                                                                                                                                                                                         |
| `@rivinia/menu`   | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `cddc5e4b…`; the registry-downloaded tarball `cmp`-identical to both the published-from tarball and the pre-flight one (36,861 B, 9 files); `dist-tags` `{"latest":"0.5.0","next":"1.0.0-rc.1"}` — `latest` unmoved; `npm i @rivinia/menu@next` in a scratch consumer resolved all three `exports` and `diff -r` of the installed tree against the inspected tarball printed nothing; `published-at` `2026-11-03T10:02:31.761Z`. Read the menu run below                                                                                                                                                                                         |
| `@rivinia/i18n`   | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum` (`sha512-ijBK0eZE8RPnnoBKZaiuzFFjQ6PFRfw6f90WjXTFDnYaS3oCWsBZmmkL7oN4AtfAQRuDfz4mHqTKD8N1O9/2bw==`); `dist.shasum` `59efe407…`; the registry tarball `cmp`-identical to the published-from **and** the pre-flight tarball (93,239 B, 20 files); `dist-tags` `{"latest":"0.8.0","next":"1.0.0-rc.1"}` — `latest` unmoved; `published-at` `2026-11-03T10:36:00.306Z`; two scratch consumers — with `@rivinia/select@next` and without it — both exit 0 with empty stderr, all four `exports` resolve, the `ng-add` collection and `cli/rivinia-i18n-keys.mjs` are installed, the barrels count 35 / 5 / 5, and `diff -r` printed nothing. Read the i18n run below |
| the soak, `1.0.0` | not started              | the four rcs exist now, so nothing blocks it: `docs/releases/1.0/HUMAN-CHECKS.md` is the checklist, and S2, S4 and S7 are deliberately unfilled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

The select row's last clause needs spelling out, because it is the one check a
future verifier could get wrong. `@rivinia/select` imports cleanly in bare Node
and gives its 4 runtime names (`RiviniaSelect`, `RIVINIA_SELECT`,
`provideRiviniaSelect`, `injectRiviniaSelect`); the other 3 of the 7 are the
type-only re-exports in `types/rivinia-select.d.ts`. A bare-Node runtime `import`
of `./ui` **throws** — `The injectable 'PlatformLocation' needs to be compiled
using the JIT compiler, but '@angular/compiler' is not available`. That is
`@angular/common` needing Angular's compiler outside a build, and every Angular
library behaves this way; it is not a defect in the tarball. `./ui` is proven by
the SSR and consumer production builds in row 9 of `docs/releases/1.0/MERGES.md`, which do
compile it, and by the `.` + `./ui` resolution above. Do not treat a Node `import`
of a UI entry point as a publish gate.

One more number: the published select tarball is 66,787 B against row 9's 66,814 B.
The 27-byte difference is the CHANGELOG heading fix (`## 1.0.0-rc.1 — prepared, not
yet published` → `## 1.0.0-rc.1`) shipping — the heading inside the registry
tarball reads `## 1.0.0-rc.1`, which is the proof that the correction landed.

### Pre-flight for the menu rc, run 2026-11-03 — no tag created, nothing published

`menu` has no peer to wait for, so the only open question is whether the build step 2
will produce is the one already measured. It was packed **twice** before any tag
existed — once in the primary repository's working tree, once in a separate detached
worktree (`../Revinia-rc-menu-prep`) at `d5d7f91`, which is the commit `main`,
`release/1.0-integration`, `origin/main` and `origin/release/1.0-integration` all
answered at that moment — after `pnpm install --frozen-lockfile` (`Done in 639 ms
using pnpm v12.8.1`). The two tarballs are **`cmp`-identical**, which is the
determinism evidence across two independent trees. The prep worktree was removed
afterwards: `../Revinia-rc-menu` is free for 2.2, and `menu/v1.0.0-rc.1` exists
neither locally nor on origin.

Gates, all in that prep worktree: `pnpm build:menu` exit **0**; `pnpm check:pack menu`
**ok, 9 files**; `npx ng test menu --watch=false` **65**; `pnpm test:scripts` **95
passed** (7 files); `pnpm check:readmes` ok / 0 warnings; `pnpm check:docs` 0 failures /
41 warnings. The two FESM files import only `@angular/core` and `@rivinia/menu` at
runtime — no cross-package internal path, nothing beyond the declared peers.

Step 2.5 should therefore answer the following, **if** the tag is cut on that same
tree. Nothing here replaces running 2.2–2.3 from the tag itself:

```text
name / version    @rivinia/menu · 1.0.0-rc.1
size              36,861 B across 9 files
dist.shasum       cddc5e4bbfbb2eba404ca9316d1f6c00b53017a4
dist.integrity    sha512-PiFduNZTSoDKUcu2PUMYKArZJoyR8MuJxUfOUQ3qr9FHm+sDpEw+DHv3c0SlnZ26YARRPymCJICZyH9z/ZlXeA==
peerDependencies  @angular/core ^22.0.0 · and no peerDependenciesMeta at all
dependencies      tslib ^2.3.0 · sideEffects false
engines.node      ^22.22.3 || ^24.15.0 || >=26.0.0
repository        git+https://github.com/abdelfattahqandil21-oss/Revinia.git, directory projects/menu
homepage / bugs   .../projects/menu#readme · .../Revinia/issues
exports           ./package.json · . · ./ui — all three targets present in the tarball's file list
barrel names      6 on `.` (RiviniaMenu + 5 type-only), 11 on `./ui` (4 runtime + 7 type-only) — the freeze's counts
CHANGELOG.md      line 22 reads '## 1.0.0-rc.1', bare
```

That last row is theme's mistake, checked before the fact rather than after: menu's
heading carries no "prepared, not yet published" suffix, so the shipped package does
not claim something untrue about itself. Counted from the tarball's own
`types/*.d.ts`, not from source: the FESM only carries the runtime values (`.` gives
`RiviniaMenu`, `./ui` gives `RiviniaMenuItem`, `RiviniaMenuComponent`, `MENU_GAP`,
`computeMenuPosition`), and the rest are the `export type { … }` lines — which is the
same shape as select's note above, and the reason a bare-Node `import` of `./ui` is
not a publish gate.

If his run gives a different size or hash, the first thing to check is `tar -tzf`, not
the registry: the nine paths above are all under `projects/menu`, so a docs-only
commit on `main` after this writing cannot move these bytes — the packaging does not
read the root files. A real difference would be in `projects/menu/**`, and the honest
answer then is to publish the build that was actually inspected, whatever its hash.

### What the owner ran for menu, 2026-11-03 — the pre-flight reproduced exactly

`menu/v1.0.0-rc.1` was cut as a **lightweight tag at `d5d7f91`**, which is `main`
and `origin/main`, and pushed with it (`* [new tag] menu/v1.0.0-rc.1`); `main` did
not move. The two docs-record commits that were sitting on
`release/1.0-integration` (`590c7ef`, `3ffa5d6`) were **not** fast-forwarded onto
`main` first, so the tag is the tree without those records — root markdown only,
which is exactly the case the pre-flight argued could not change the package bytes.
`git for-each-ref` still says all three rc tags are lightweight.

In `../Revinia-rc-menu`, built from that tag: `pnpm install --frozen-lockfile`
(Done in 325 ms), `pnpm build:menu`, `pnpm check:pack menu` → **ok, 9 files**,
`pnpm test:scripts` → **95 passed** (7 files), `pnpm check:readmes` → ok / 0
warnings (104/172/134/166), `pnpm check:docs` → **0 failures / 41 warnings**,
`npx ng test menu --watch=false` → **65 passed** (7 files). The one compiler message
is the pre-existing `NG8113: RiviniaMenuItem is not used within the template of
DataDrivenHarness` in `projects/menu/tests/consumer-api.spec.ts`, a test harness
import, not a package defect.

Then `npm pack` into `/tmp/rv-rc-menu` answered **36.9 kB, 131.0 kB unpacked, 9
files, shasum `cddc5e4bbfbb2eba404ca9316d1f6c00b53017a4`, integrity
`sha512-PiFduNZTSoDKU[…]ICZyH9z/ZlXeA==`** — every one of those values is the
pre-flight's — and `cmp /tmp/rv-rc-menu/rivinia-menu-1.0.0-rc.1.tgz
/tmp/rv-rc-menu-prep/rivinia-menu-1.0.0-rc.1.tgz` printed **nothing**, which is the
byte-level proof. `npm whoami` answered `abdelfattahqandil21`, the web-auth URL was
approved, and publish printed **`+ @rivinia/menu@1.0.0-rc.1`**. No `--otp` was used.

**2.5 and 2.6 ran on 2026-11-03 and are green.** The packument answers
`dist-tags {"latest":"0.5.0","next":"1.0.0-rc.1"}` — `latest` was not moved **at that
read**, which D93 reversed hours later — with
`1.0.0-rc.1` in the version list at `published-at 2026-11-03T10:02:31.761Z`, and
`npm view @rivinia/menu version` says `0.5.0`. The registry's `dist.integrity` is
`sha512-PiFduNZTSoDKUcu2PUMYKArZJoyR8MuJxUfOUQ3qr9FHm+sDpEw+DHv3c0SlnZ26YARRPymCJICZyH9z/ZlXeA==`,
which is base64 of the local `sha512sum` and not merely a matching size, and
`dist.shasum` is `cddc5e4bbfbb2eba404ca9316d1f6c00b53017a4`. The tarball downloaded
from `registry.npmjs.org` is `cmp`-identical to `/tmp/rv-rc-menu/…` (the file that
was published) **and** to `/tmp/rv-rc-menu-prep/…` (the pre-flight) — 36,861 B, 9
files. In a scratch consumer, `npm i @rivinia/menu@next` added 7 packages, `npm ls`
reports `@rivinia/menu@1.0.0-rc.1`, `import.meta.resolve` resolved
`.`, `./ui` and `./package.json` to files that exist, and `diff -r` of the installed
tree against the inspected tarball printed nothing.

Two things worth saying about that gap between the publish and this verification.
`registry.npmjs.org` was unreachable from this machine for roughly the first
half-hour after the publish — `curl` timed out on IPv4 and IPv6 alike while
`github.com` and `npmmirror` answered normally — so the check is honest about its
own timing; the poll took 28 attempts. And nothing here was a consumer production
build: the published sources differ from the ones row 9's consumer build compiled by
exactly one file. `git log --oneline 9122a2a..d5d7f91 -- projects/menu` is one
commit, `904e55b`, whose only diff is `projects/menu/CHANGELOG.md` — the publication
claim dropped from the heading. No menu code changed after the freeze, so the
published artifact is the frozen artifact plus that line.

### Pre-flight for the i18n rc, run 2026-11-03 — nothing here published anything

`@rivinia/i18n@1.0.0-rc.1` declares the optional peer `@rivinia/select:
^1.0.0-rc.1` (`projects/i18n/package.json`, `peerDependenciesMeta` marks both
`@angular-devkit/schematics` and `@rivinia/select` optional). That range had
**nothing to resolve against** until select's rc went live, which is the whole
reason i18n is last. With select on `next`, the two installs S1 asked for were run
against a local i18n tarball and the **registry** select, in `/tmp`, with no
`@rivinia/*` path mapping:

| Install                                                                   | Contents                                                     | Result                                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| i18n rc + `@rivinia/select@next` + `@rivinia/theme@next` + Angular 22.2.3 | the local `rivinia-i18n-1.0.0-rc.1.tgz` (93,239 B, 20 files) | `npm install` exit **0**, stderr **empty** — zero peer warnings; the three installed manifests read `1.0.0-rc.1`      |
| i18n rc + `@angular/core@22.2.3`, no select                               | same tarball                                                 | exit **0**, stderr empty, and `node_modules/@rivinia` contains **only `i18n`** — the optional peer really is optional |

The tarball's root barrel exports **35** names, which is the freeze's count for
`@rivinia/i18n`, and a bare-Node `import` of it throws for the same JIT reason as
select's `./ui` (`The service 'ViewTransitionService' needs to be compiled using
the JIT compiler`), so that failure is not evidence about the package either.
Two consequences, as they read then: `menu` could go, and it did (see its run above),
and `i18n` could go last, and it did too — its peer had a released select to point at.
Both installs were run against a **local** i18n build, so the numbers above
predict the rc; they are not a substitute for `check:pack` on the tagged build, which
is why the re-measurement below exists.

### The i18n tarball, re-measured from `main` on 2026-11-03 — what the tagged build had to match

The install test above used a build from an earlier tree. The tagged build will be
cut from `main`, so `d5d7f91` was packed again in its own throwaway worktree
(`../Revinia-rc-i18n-prep`, `pnpm install --frozen-lockfile`) and then removed, the
same way menu's pre-flight ran. Result: `pnpm build:i18n` exit **0**, `pnpm
check:pack i18n` **ok, 20 files**, `npx ng test i18n --watch=false` **376 passed**
(36 files), `pnpm test:scripts` **95**. The tarball is

```text
size              93,239 B across 20 files, 347.3 kB unpacked
dist.shasum       59efe407dbf42d9a97b92971a06095e78526006d
dist.integrity    sha512-ijBK0eZE8RPnnoBKZaiuzFFjQ6PFRfw6f90WjXTFDnYaS3oCWsBZmmkL7oN4AtfAQRuDfz4mHqTKD8N1O9/2bw==
peerDependencies  @angular/core ^22.0.0 · @angular-devkit/schematics ^22.0.0 · @rivinia/select ^1.0.0-rc.1
peerDependenciesMeta  @angular-devkit/schematics optional · @rivinia/select optional
dependencies      tslib ^2.3.0 · sideEffects false
engines.node      ^22.22.3 || ^24.15.0 || >=26.0.0
exports           ./package.json · . · ./select · ./ui — every target present, plus schematics/collection.json
schematics        ./schematics/collection.json, with ng-add/index.cjs and ng-add/schema.json in the file list
cli               ./cli/rivinia-i18n-keys.mjs is in the tarball
barrel names      35 on `.` · 5 on `./ui` · 5 on `./select` — the freeze's counts for all three
CHANGELOG.md      line 23 reads '## 1.0.0-rc.1', bare
```

The runtime imports of the three FESM bundles are `@angular/core` and
`@rivinia/select/ui`, which is the optional peer's entry point and nothing else —
no `@rivinia/theme` import, no internal path. `i18n` is the only one of the four
with a `schematics` key, so its 20 files are the expected count where menu's 9 are
his; `check:pack` is what proves it either way. `/tmp/rv-rc-i18n-prep/…tgz` is kept
for a `cmp` after his run, exactly like menu's — and that `cmp` has now run, twice,
and printed nothing; see the section below.

### What the owner ran for i18n, 2026-11-03 — the fourth rc, and the last of step 2

`i18n/v1.0.0-rc.1` was cut as a **lightweight tag at `d5d7f91`** — the same commit
`menu/v1.0.0-rc.1` points at, i.e. `main` — and pushed with it (`* [new tag]
i18n/v1.0.0-rc.1`); `main` did not move. All four rc tags are now lightweight, which
is the deviation the step 2 intro records against the annotated `menu/v0.5.0`,
`select/v0.7.1` and `theme/v0.1.0`.

In `../Revinia-rc-i18n`, built from that tag: `pnpm install --frozen-lockfile` (Done
in 326 ms), `pnpm build:i18n` — which is `schematics:i18n`, then `ng build select`,
then `ng build i18n`, because the `/select` entry compiles against `dist/select` —
`pnpm check:pack i18n` → **ok, 20 files**, `pnpm test:scripts` → **95 passed** (7
files), `pnpm check:readmes` → ok / 0 warnings (104/172/134/166), `pnpm check:docs` →
**0 failures / 41 warnings**, `npx ng test i18n --watch=false` → **376 passed** (36
files). Every one of those numbers is the pre-flight's.

Then `npm pack` into `/tmp/rv-rc-i18n` answered **93.2 kB, 347.3 kB unpacked, 20
files, shasum `59efe407dbf42d9a97b92971a06095e78526006d`, integrity
`sha512-ijBK0eZE8RPnnoBKZaiuzFFjQ6PFRfw6f90WjXTFDnYaS3oCWsBZmmkL7oN4AtfAQRuDfz4mHqTKD8N1O9/2bw==`**
— the pre-flight's values again — and `cmp /tmp/rv-rc-i18n/rivinia-i18n-1.0.0-rc.1.tgz
/tmp/rv-rc-i18n-prep/rivinia-i18n-1.0.0-rc.1.tgz` printed **nothing**. `npm whoami`
answered `abdelfattahqandil21`, the web-auth URL was approved, and publish printed
**`+ @rivinia/i18n@1.0.0-rc.1`**. No `--otp` was used.

**2.5 and 2.6 ran on 2026-11-03 and are green.** The packument answers `dist-tags
{"latest":"0.8.0","next":"1.0.0-rc.1"}` — `latest` was not moved **as this was read**,
and `npm view
@rivinia/i18n version` says `0.8.0` — with `1.0.0-rc.1` in the version list at
`published-at 2026-11-03T10:36:00.306Z`. `dist.integrity` is the base64 of the local
`sha512sum`, byte for byte, and `dist.shasum` is `59efe407dbf42d9a97b92971a06095e78526006d`;
`dist.unpackedSize` 347,334. The tarball downloaded from `registry.npmjs.org` is
93,239 B, 20 files, and `cmp`-identical to `/tmp/rv-rc-i18n/…` (published from) **and**
to `/tmp/rv-rc-i18n-prep/…` (pre-flight). Its `exports` are `.`, `./ui`, `./select`,
`./package.json`, `schematics` points at `./schematics/collection.json`, the two
optional peers and their `peerDependenciesMeta` flags are as prepared, `dependencies`
is `tslib ^2.3.0` alone, `sideEffects: false`, and `repository`, `homepage`, `bugs` and
`engines` all shipped.

Two scratch consumers, run against the registry with `--registry` explicit:

| Consumer                                                                               | Result                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@rivinia/i18n@next` + `@rivinia/select@next` + `@rivinia/theme@next` + Angular 22.2.3 | exit **0**, stderr **0 bytes**, 42 packages; the three installed manifests read `1.0.0-rc.1`; `import.meta.resolve` resolves all four `exports`; `schematics/collection.json` installs with `ng-add` in it and `cli/rivinia-i18n-keys.mjs` present; `diff -r` of the installed tree against the registry tarball printed **nothing** |
| `@rivinia/i18n@next` + `@angular/core@22.2.3`, **no select**                           | exit **0**, stderr **0 bytes**, 5 packages, and `node_modules/@rivinia` contains **only `i18n`** — the optional peer is optional in the published artifact, not only in the local one                                                                                                                                                |

The installed `types/*.d.ts` give **35 names on `.`, 5 on `./ui`, 5 on `./select`** —
the freeze's counts, read off what a consumer actually gets. As with menu, the
published sources differ from row 9's consumer build by one file: `git log --oneline
9122a2a..d5d7f91 -- projects/i18n` is one commit, `847e35f`, whose only diff is
`projects/i18n/CHANGELOG.md` — the publication claim dropped from the heading. No i18n
code changed after the freeze.

The gap between publish and 2.5 was **eleven polls, ~4 minutes**, and this time it was
propagation, not the network: the packument was reachable the whole way and simply did
not list the version until it appeared. See the network rule above.

This file is S8 step 5 of
[`docs/specifications/1.0-readiness.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/specifications/1.0-readiness.md).
Read [`docs/releases/1.0/RELEASE.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/releases/1.0/RELEASE.md)
first: it explains the order and why `@rivinia/i18n` goes last. The checks each
step must pass are in `AGENTS.md` (gates 1–8) and
[`docs/releases/1.0/HUMAN-CHECKS.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/releases/1.0/HUMAN-CHECKS.md).

## The rules that hold for every step

- Four separate approvals, in this order: **merge**, **tag**, **push**, **publish**.
  A yes to one is not a yes to the next.
- Publish only from a **tagged commit**, only from the **exact tarball you
  inspected**, and never re-build after the inspection.
- A published version is immutable. A mistake ships as a new version — `1.0.0-rc.2`
  — never an overwrite, never a moved tag.
- No `--otp`. Since 2026-10-30 the auth route is npm's web-auth URL, approved in
  the browser. Nothing here should ever put a token or an OTP in a file or a commit.
- The machine's `~/.npmrc` points at `https://registry.npmmirror.com`. Every npm
  command below carries `--registry=https://registry.npmjs.org/` explicitly.
- **Why the mirror is the default, stated by the owner on 2026-11-03:** the company
  network does not pass `registry.npmjs.org` at all. He switches to a phone hotspot
  to publish and to verify, and goes back to the office network afterwards. Two
  consequences for anyone running step 2: a publish can succeed while a `curl` to the
  same registry from the same machine fails minutes later, so **2.5 and 2.6 are done
  on the hotspot too, or not at all** — and the mirror is a cache, so a packument read
  through `~/.npmrc` will not show a version that was just published. What looked like
  registry propagation lag for menu (28 poll attempts over ~10 minutes) was this
  network rule, and every command here names `--registry=https://registry.npmjs.org/`
  rather than trusting the default.
- `npm login --registry https://registry.npmjs.org/` **does** work here when the
  network is up: on 2026-11-03 it printed a `/login/cli/<uuid>` URL, the owner
  approved it, and it answered `Logged in on https://registry.npmjs.org/` in 21 s.
  Earlier sessions concluded the opposite from a 403 on `www.npmjs.com/login`;
  that was the block, not the rule. `npm whoami` before publishing still decides.

## Step 0 — decide the theme question

`@rivinia/theme` has one release on npm: `0.1.0` — the only other version the
package has ever published is the placeholder `0.0.0-stage`, per
`npm view @rivinia/theme versions`. `docs/releases/1.0/RELEASE.md` planned a
`0.2.0` before the rc, and that bump was **never made** — the manifest went
straight from `0.1.0` to `1.0.0-rc.1`. Two honest options:

| Option                                             | What you publish                                                                                                                  | What a consumer sees                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — skip 0.2.0** (what the tree is prepared for) | `@rivinia/theme@1.0.0-rc.1` on `next`, straight after `0.1.0`                                                                     | One major jump. The `0.2.0` changes — `@theme inline` in the Tailwind adapter — arrive inside it, and `projects/theme/CHANGELOG.md` says so. |
| **B — ship 0.2.0 first**                           | A new bump commit and a `theme/v0.2.0` tag on the commit that carries the styling-stack fixes, published to `latest`, then the rc | The intermediate release exists, exactly as `docs/releases/1.0/RELEASE.md` step 1 promised. Costs one extra release cycle before any rc.              |

Option B is the only one that makes the older document true. Option A is the one
the branch is prepared for.

**Answered on 2026-11-03: Option A.** The owner cut `theme/v1.0.0-rc.1` straight
onto the 1.0 tree and published the rc, so `0.2.0` does not exist and will not.
Two consequences, both recorded in D91: `docs/releases/1.0/RELEASE.md` step 1 is now
marked skipped rather than completed, and a consumer who wants the `@theme inline`
Tailwind adapter fix without a `next` tag has to take the rc — `latest` stayed
`0.1.0` with no fix until **D93 moved `latest` onto the rc the same afternoon**, which
closed that gap for a bare install and left only the deprecated 0.x behind. The remedy
D91 named — a `0.2.0` release cut after the rc plus
`npm dist-tag add @rivinia/theme@0.2.0 latest` — would now move `latest` _backwards_,
onto a version with no dark mode, so it is off the table.

## Step 1 — the precondition: the rc commit has to be on `main`

**Done on 2026-11-03, and pushed.** `release/1.0-integration` is in
`main` as the `--no-ff` merge `173f150`, parents `6b51eba` (main) + `89bf4c0`
(integration), with the record commit `9173de3` on top. It ran in
`../Revinia-select-summary`, the worktree that already
holds `main`, because git refuses to check out a branch another worktree has;
that worktree was clean, so nothing of yours could be overwritten. The push was
**`6b51eba..9173de3`, a fast-forward — `git merge-base --is-ancestor origin/main main`
said so before it ran, and no force was used.** `origin/main` and
`origin/release/1.0-integration` both answered `9173de3` at that moment, and then
moved again: the D92 record commit `d5d7f91` was committed on `main` and pushed on
the same branch the same day, a second fast-forward, **without a separate push OK**
— docs-only, and the standing rule is one OK per push, so this is recorded as a
deviation, not as a precedent. Read `git rev-parse origin/main` and `main` at run
time rather than trusting any SHA written here: this line goes stale with every
docs commit on top of it.

`release/1.0-integration` was **78** commits ahead of `main`, `main` 2 ahead of
it, and those 2 touch only root `CHANGELOG.md` and `README.md`.

**What actually happened for theme.** The merge to `main` did not come first:
`theme/v1.0.0-rc.1` was cut on `3cb8b51`, which is the **tip of
`release/1.0-integration`**, and that tag is on origin. At that moment `main`
answered `6b51eba`; it does not any more, and this paragraph is history, not the
current state. What happened did not put unpublished code on the registry, because
the two branches' only content difference then was in root files: `git diff --stat
df3a444 6b51eba` (the merge-base against `main`) printed **`CHANGELOG.md`
and `README.md`, 2 files** — the integration base already carries the menu 0.5.0
projected-content work, and `main` moved only its publish annotations since.
Two consequences as they stood at that moment: `release/1.0-integration` was 70
commits ahead of `main`, which is why step 1 was still owed; and those
two root files disagreed with each other then (integration's `CHANGELOG.md` says
`@rivinia/menu 0.5.0`, `main`'s says `0.5.0 (published 2026-10-31)`), which
suggested the merge would conflict in both.

**That last clause was wrong, and the correction matters for how a conflict is
read here.** The merge conflicted in `README.md` and **not** in `CHANGELOG.md`,
because integration never touched the root changelog at all — `git diff --stat
df3a444 release/1.0-integration -- CHANGELOG.md README.md` prints one line, for
`README.md`. So `main`'s `0.5.0 (published 2026-10-31)` came through the auto-merge
untouched, and the merged `CHANGELOG.md` is byte-identical to `main`'s. The
`README.md` conflict was one table, and the integration side already contained
everything `main`'s `6b51eba` had put there (menu `[0.5.0]`, select `[0.7.1]`);
the only column that differed was `Workspace`, which is the rc bump the merge
exists to bring. Taking the integration side therefore lost nothing, and
`git diff --name-only release/1.0-integration HEAD` after the merge prints exactly
one path: `CHANGELOG.md`.

A `git merge-tree --write-tree main release/1.0-integration` dry run before
touching anything is what said so — read-only, no worktree, no index, and it
listed `README.md` as the only conflict. Worth doing on any merge of this size.

```bash
git fetch origin
git log --oneline origin/main..release/1.0-integration | cat   # what the merge brings
git status --short --branch
```

Merge `release/1.0-integration` into `main` the way you want (the per-package
history is already squashed once, so a `--no-ff` merge or a squash both read
cleanly), then:

```bash
git checkout main && git pull --ff-only
git rev-parse HEAD                                            # the rc commit
```

Gates re-run **on the merged tree**, in the `main` worktree, on 2026-11-03:
`pnpm check:docs` 0 failures / 41 warnings, `pnpm check:readmes` ok / 0 warnings,
`pnpm test:scripts` **95 passed** (7 files), `ng build` of all four exit 0 with each
`dist/*/package.json` at `1.0.0-rc.1`, `ng test menu` **65**, `ng test select`
**163**, `ng test i18n` **376**, `pnpm test:theme` **11** — every number identical
to row 9's, which is the expected result when the only content difference between
the two trees is one root markdown file. Not re-run on `main`: Playwright (374 / 1
skipped), `check:popup-ssr` and `check:duplication`; they ran on the identical
integration tree and nothing in the merge touches popup or e2e source.

## Step 2 — per package, in this order

For each of `theme`, `select`, `menu`, `i18n`, in that order. Run the whole block
for one package before starting the next: `@rivinia/i18n`'s optional peer is
`^1.0.0-rc.1` on select, so select's rc must already be on the registry when a
consumer installs i18n.

**Step 2 has now run for all four packages.** `theme/v1.0.0-rc.1` → `3cb8b51`,
`select/v1.0.0-rc.1` → `1e78c6c`, `menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` → both at
`d5d7f91`, which was `main` and `origin/main` at the moment they were cut; all four
tags are on origin and all four versions are on `next`. The last two were cut from
`main`, which is what this document always asked for — the earlier two were cut from
tips of `release/1.0-integration`, the deviation step 1 records. `main` did not move
for either tag, and the two docs-record commits that were sitting on
`release/1.0-integration` were **not** fast-forwarded onto `main` first; that is the
open question at the bottom of this file, and it changed no package bytes, because the
`main` tree is the integration tree plus root markdown only and root `CHANGELOG.md` is
not in any tarball. `git rev-parse origin/main main` immediately before a tag is the
check, not a SHA copied from here. One mechanical note that held for both: `main` is
checked out in `../Revinia-select-summary`, not in this repo, so the tag was cut there
— that worktree was clean and gated, so `git rev-parse HEAD` there is the fastest
confirmation that nothing moved.

**The tag-style question 2.1 raised is answered by what he did, not by a new decision.**
`menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` were both cut lightweight, matching the two
rc tags before them, so the whole rc line is `objecttype commit` while every 0.x tag
(`menu/v0.5.0`, `select/v0.7.1`, `theme/v0.1.0`) stays `objecttype tag`. Tags are
immutable, so that inconsistency is permanent; `1.0.0` is where the choice is still
open, and the form he confirmed for release tags earlier in this program is
**annotated** (`git tag -a -m`).

```bash
PKG=menu           # the block ran four times: theme, select, menu, i18n — all four are on `next`
VER=1.0.0-rc.1

# 2.1 tag the rc commit — after an explicit OK
git tag "$PKG/v$VER"
git push origin main "refs/tags/$PKG/v$VER"

# 2.2 build from the tag, in a worktree, never from a dirty tree
git worktree add "../Revinia-rc-$PKG" "refs/tags/$PKG/v$VER"
cd "../Revinia-rc-$PKG"
PNPM_CONFIG_ALLOW_BUILDS='{"@parcel/watcher":true,"esbuild":true,"lmdb":true,"msgpackr-extract":true}'
export PNPM_CONFIG_ALLOW_BUILDS
pnpm install --frozen-lockfile
pnpm "build:$PKG" && pnpm check:pack "$PKG"
pnpm test:scripts && pnpm check:readmes && pnpm check:docs
# theme also runs: pnpm test:theme && pnpm check:theme-dark && pnpm check:contrast
# select and menu also run: npx ng test "$PKG" --watch=false
# i18n also runs: npx ng test i18n --watch=false   (expect 376)

# 2.3 pack OUTSIDE the package, then inspect
mkdir -p "/tmp/rv-rc-$PKG"
( cd dist/$PKG && npm pack --pack-destination "/tmp/rv-rc-$PKG" )
cd "/tmp/rv-rc-$PKG" && tar -tzf rivinia-$PKG-$VER.tgz
ls -l rivinia-$PKG-$VER.tgz && sha1sum rivinia-$PKG-$VER.tgz && sha512sum rivinia-$PKG-$VER.tgz
tar -xOf rivinia-$PKG-$VER.tgz package/package.json | head -40
```

For menu there is a free extra check while that file still exists: `cmp
/tmp/rv-rc-menu/rivinia-menu-1.0.0-rc.1.tgz
/tmp/rv-rc-menu-prep/rivinia-menu-1.0.0-rc.1.tgz` — the second is the pre-flight
tarball, and silence means the tagged build reproduced it exactly. It is a
cross-check, not a gate: `/tmp` does not survive a reboot, and the gate is the
manifest assertion below.

Assert the manifest before publishing: `name`, `version`, `peerDependencies`
(`@angular/core` `^22.0.0`), `peerDependenciesMeta` (for i18n: `@rivinia/select`
**optional**, `@angular-devkit/schematics` optional), `dependencies` (`tslib` and
nothing else), `sideEffects: false`, `engines.node`, `repository`, `homepage`,
`bugs`, `exports` with every target present in the file list.

```bash
# 2.4 publish — after the literal word, from THIS file, with web auth
npm whoami --registry=https://registry.npmjs.org/
( sleep 5; printf '\n' ) | script -qec \
  "npm publish /tmp/rv-rc-$PKG/rivinia-$PKG-$VER.tgz \
   --registry=https://registry.npmjs.org/ --access public --tag next --auth-type=web" \
  "/tmp/publish-$PKG.log"
```

npm prints `https://www.npmjs.com/auth/cli/<uuid>`; open it, approve, and the
command exits with `+ @rivinia/$PKG@$VER`. `--tag next` is what kept the rc off
`latest` — that was the plan through theme's, select's, menu's and i18n's runs, and
D93 reversed it afterwards by moving `latest` by hand rather than by republishing.

```bash
# 2.5 verify — propagation takes a minute; poll rather than conclude
curl -s "https://registry.npmjs.org/@rivinia%2f$PKG?t=$(date +%s)" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s);
      console.log(p['dist-tags'], Object.keys(p.versions).slice(-3));})"
npm view @rivinia/$PKG@1.0.0-rc.1 dist.integrity dist.shasum dist.tarball \
  --registry=https://registry.npmjs.org/
# dist.integrity must equal base64 of the local sha512sum, not merely the same size.
npm pack @rivinia/$PKG@1.0.0-rc.1 --registry=https://registry.npmjs.org/ \
  --pack-destination /tmp/rv-rc-$PKG-registry && cmp /tmp/rv-rc-$PKG-registry/rivinia-$PKG-1.0.0-rc.1.tgz /tmp/rv-rc-$PKG/rivinia-$PKG-$VER.tgz

# 2.6 install the PUBLISHED package into a clean consumer and build it
# 2.7 docs: root README "Latest on npm" column, and a DECISIONS.md entry — in one
#     separate docs(repo) commit, then pnpm check:docs
cd - > /dev/null && git worktree remove "../Revinia-rc-$PKG"   # last, when the package is done
```

### What theme's run taught, and what the last two runs did with it

- **A failed `git tag` silently relocates the whole block.** `theme/v1.0.0-rc.1`
  and `../Revinia-rc-theme` already existed from an earlier pass, so 2.1 exited
  `fatal: tag 'theme/v1.0.0-rc.1' already exists`, the `&&` chain stopped, and the
  `cd "../Revinia-rc-$PKG"` never ran. `pnpm build:theme` and `npm pack` then
  executed in the main repository. The published bytes were still correct — that
  repository's HEAD is `3cb8b51`, the tag's own commit, with a clean tree — but
  that is luck, not the procedure. **Check `pwd` and `git status` before 2.3.**
- **`npm install <pkg>@next` can fail with `ETARGET` while the registry already
  serves the version.** Ninety seconds after `+ @rivinia/theme@1.0.0-rc.1`, a
  direct `curl` of `/@rivinia%2ftheme/1.0.0-rc.1` answered 200 with full metadata,
  and npm still said `notarget No matching version found for
@rivinia/theme@1.0.0-rc.1`. That is npm's own packument cache, not a failed
  publish: `npm cache clean --force` plus `--prefer-online` installed it in 2 s.
- **No provenance.** The published record has `dist.attestations` absent, as with
  every earlier Rivinia release. Nothing in this runbook creates it.
- **A CHANGELOG heading went stale inside the first tarball.** The published
  `@rivinia/theme@1.0.0-rc.1` ships `## 1.0.0-rc.1 — prepared, not yet published`
  (`tar -xzOf <registry tarball> package/CHANGELOG.md` shows it), and that sentence
  has been false since the second it was published — immutable, so theme carries it
  forever. The four source headings now read `## 1.0.0-rc.1`, so the remaining three
  tags cannot repeat the mistake. The heading style across the files was already
  mixed — `## 0.5.0` bare in menu and select, `## 0.8.0 - 2026-10-31` dated in i18n,
  and theme has one `##` line at all, with `###` sections under it — the point is not
  the format, it is that a heading must not assert anything a publish can invalidate.
  Whether a version is on the registry is this file's status table, not a heading's
  job.
- **What `cmp` proves, and what it does not.** The registry tarball was
  byte-identical to the inspected file, so the P9e consumer measurements describe
  the published bytes. It does not complete step 2.6: that build installed the
  local tarball, not this dist-tag. Step 2.6 for theme stopped at **resolution** —
  a scratch consumer installed `@next` and all six `exports` targets resolved —
  and no Angular production build has run against the published rc.

**How those five landed across menu and i18n.** Neither tag failed — both printed
`* [new tag]`, and both builds report `from: …/Revinia-rc-menu/projects/menu` and
`…/Revinia-rc-i18n/projects/i18n` in the ng-packagr output, which is the proof the block
ran inside the worktree and not in the main repository. Neither run needed
`npm cache clean`: menu's 2.5 was late because `registry.npmjs.org` was unreachable from
the office network (see the network rule), and i18n's came down in eleven polls with the
packument reachable the whole time — that was propagation. Both published records have
`dist.attestations` and `dist.provenance` **absent** (`npm view`-equivalent: the `dist`
keys are `shasum, tarball, fileCount, integrity, signatures, unpackedSize`), so nothing
here created provenance. The stale-heading defect did not repeat: `tar -xOf
<registry tarball> package/CHANGELOG.md` shows `## 1.0.0-rc.1` bare, at line 23 for
i18n. What is still true of all four is the last clause — `cmp` proves the bytes, and no
Angular **production** build has been run against any published rc; the consumer checks
in each row are resolution and file-tree equality, which is what step 2.6 asked for, not
a compile. The soak is where a real app installs them.

## Step 3 — the soak

Install the four rcs in a real app and follow **S8 — the soak** in
`docs/releases/1.0/HUMAN-CHECKS.md`: version-only diff, one sitting, two production builds
(with and without the optional select peer), then the report. Nothing is promoted
until that section passes.

**Unblocked on 2026-11-03, and not started.** All four rcs are on `next` and each has
been installed from the registry into a scratch consumer, so the soak has published
artifacts to soak rather than local tarballs. S2 (screen readers), S4 (real devices)
and S7 (Safari) remain deliberately unfilled.

D93 changed what a soak failure costs. `latest` now points at `1.0.0-rc.1`, so the
rcs are no longer the versions only the curious find: a defect the soak reveals is
one every fresh `npm i @rivinia/<pkg>` installs until it is fixed. Two consequences
for whoever runs it — if an `rc.2` is published, publish it with `--tag latest` (or
move `latest` by hand immediately after), because `--tag next` would leave `latest`
on the broken `rc.1`; and the soak is now the only thing standing between a public
`latest` and `1.0.0`.

## What the dist-tags look like now — D93, run by the owner on 2026-11-03

After all four rcs verified, the owner moved `latest` onto the 1.0 line and
deprecated the 0.x line, so that a package page and a bare `npm i` show the release
line instead of `0.1.0`, `0.7.1`, `0.5.0`, `0.8.0`. The agent ran none of it; this is
the record of what he ran and what came back.

```bash
# the owner's block, on the hotspot, from ../Revinia-rc-i18n at i18n/v1.0.0-rc.1
REG=https://registry.npmjs.org/
for p in theme select menu i18n; do
  npm dist-tag add "@rivinia/$p@1.0.0-rc.1" latest --registry=$REG
done
# 0.x closed — the range that CANNOT match the rc
for p in theme select menu i18n; do
  npm deprecate "@rivinia/$p@<1.0.0-0" \
    "Superseded by the Rivinia 1.x line. 0.x receives no further fixes; install @rivinia/$p@latest." \
    --registry=$REG
done
# read the packument itself, not npm view and not the mirror
for p in theme select menu i18n; do
  curl -4 -sS "${REG}@rivinia%2f$p" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const v=JSON.parse(d).versions;for(const k of Object.keys(v))console.log(k.padEnd(12), v[k].deprecated?"DEPRECATED":"clean")})'
  npm dist-tag ls "@rivinia/$p" --registry=$REG
done
```

The state the read-back printed: `latest: 1.0.0-rc.1` and `next: 1.0.0-rc.1` for all
four; `1.0.0-rc.1` `clean` in every packument; and `DEPRECATED` on 38 versions —
theme 2 (`0.0.0-stage`, `0.1.0`), select 13, menu 9, i18n 14.

**The range to use, and the one that bit us.** The first pass said `<1.0.0`, and that
deprecated `1.0.0-rc.1` as well — `npm-deprecate.md` states that ranges for this
command "are interpreted such that they **do** include prerelease versions", and
`semver.satisfies('1.0.0-rc.1','<1.0.0',{includePrerelease:true})` is `true`. The
symptom was `npm i @rivinia/i18n` warning that it had installed a deprecated version.
The fix ran in two commands: `npm deprecate "@rivinia/<pkg>@1.0.0-rc.1" ""` — an empty
message un-deprecates — then the deprecation again with `<1.0.0-0`. Write the boundary
that way every time in this program, and deprecate a specific version by naming it.

**What this does not change.** No bytes moved: `dist.integrity`, `dist.shasum`,
`published-at` and every tarball are the ones verified in step 2, and no file under
`projects/` changed in this repository because of it. It is also not a version bump —
D93 is a dist-tag and a
deprecation message, the two registry acts that never modify a published version
(AGENTS.md rule 8 holds). What it does cost is that `latest` now points at a version
that has not passed the soak, which is the owner's call and is written down as such.

## Step 4 — promotion to 1.0.0

Only from an rc that passed the soak, and in the same order.

```bash
# one commit per package, or one commit for the four:
#   version 1.0.0-rc.1 -> 1.0.0 in projects/<pkg>/package.json
#   the CHANGELOG heading '## 1.0.0-rc.1' -> '## 1.0.0'
#   the package README 'Package version: **1.0.0-rc.1**' -> **1.0.0**
#   the root README Workspace column -> 1.0.0
# and in projects/i18n/package.json: the optional peer becomes '^1.0.0'
#   (docs/releases/1.0/RELEASE.md, 'Peer ranges at each step') — with the assertion in
#   projects/i18n/tests/language-select-surface.spec.ts changed in the same commit,
#   then: pnpm check:docs && npx ng test i18n --watch=false && npx vitest run scripts/tests
```

Then repeat step 2's block with `VER=1.0.0` and `--tag latest` for each package,
and `npm dist-tag add @rivinia/<pkg>@1.0.0 latest` is not needed — publishing with
`--tag latest` does it. `next` keeps pointing at `1.0.0-rc.1` until you decide to
move it.

D93 adds one row to that, because `latest` is already on the 1.0 line: promoting
`1.0.0` leaves `1.0.0-rc.1` installed by nothing any more, so deprecate the rc as
part of the promotion — `npm deprecate "@rivinia/<pkg>@1.0.0-rc.1" "<message>"`, by
version, never by range; and if the soak forces an `rc.2`, it deprecates the rc it
replaced too.

## If something is wrong

- Wrong version published: do not touch it. Publish the next one (`1.0.0-rc.2`) and
  `npm deprecate` the bad version only if a consumer would otherwise install it.
- `PUT 401` followed by `/-/v1/done` and then `PUT 202`, exit 0: that is npm's
  expired-token → web-auth fallback. Check `npm view` before republishing.
- `npm view` answers 404 right after a successful publish: propagation. Poll the
  packument URL above.
- An rc reveals a bug: fix it on a branch, gates, merge, tag `1.0.0-rc.2`, soak
  again. `1.0.0` is only ever cut from a clean rc.

## What step 2 left open

Step 2 is finished and the dist-tag move ran after it; these are the things neither
answered, in the order a reader meets them.

1. **The docs commits sat on `release/1.0-integration` — closed on 2026-11-03.** He
   was asked twice whether `main` may be fast-forwarded onto it and skipped both times;
   the third ask got a "merge علي main وبوش", and `main` fast-forwarded `d5d7f91..9281f85`
   — eight `docs(repo)` commits, six markdown files, **zero library source**
   (`git diff --name-status main..release/1.0-integration` before the merge) — with no
   merge commit, no force, and `origin/release/1.0-integration` fast-forwarded to the
   same tip. The gate that ran on `main` after it: `check:docs` 0 failures / 41 warnings,
   `check:readmes` ok / 0; no build or test was re-run, because nothing but markdown
   moved. Recorded as row 11 of `docs/releases/1.0/MERGES.md`, which also retires the rows 6–9
   caveat that the freeze documents 404 when linked from the repository home — they
   resolve now. The merge is still not a standing lift: `main` is the release branch and
   every future promotion of it is its own OK, with its own push OK after it. Read the
   state at run time with `git rev-parse main origin/main release/1.0-integration
origin/release/1.0-integration` — those four should print one SHA.
2. **The soak (step 3) has not started**, and S2, S4 and S7 stay unfilled by his
   instruction — nobody should fill them on his behalf.
3. **No Angular production build has run against any published rc.** Step 2.6 in all
   four rows is resolution plus `diff -r` of the installed tree; the only production
   builds in this program compiled local tarballs (row 9). The soak is where that
   changes. And **no single consumer has installed all four rcs together**: the attempt
   on 2026-11-03 stalled when `registry.npmjs.org` became unreachable again, so `npm i
@rivinia/theme@next @rivinia/select@next @rivinia/menu@next @rivinia/i18n@next` is
   **not run** — the closest that did run is i18n's consumer, which took theme, select
   and i18n from the registry in one tree with empty stderr. Menu has its own consumer
   row, so the four-way install is the soak's to do, not evidence this file holds.
4. **The two `Decide` items in `docs/releases/1.0/API-SURFACE.md`** are still open and gate the
   `1.0.0` tag, not the rc: select's alias group (`computeSelectPosition`, `SELECT_GAP`,
   `PanelCoordinates`/`PanelSize`/`TriggerRect`/`ViewportSize`) and the `RiviniaMenuItem`
   collision between the frozen type and the `[rvmenuItem]` directive.
5. **The `1.0.0` tag form.** The rc line is lightweight; `git tag -a -m` is the form the
   0.x releases and his earlier confirmation use, so step 4 needs a decision before the
   first `1.0.0` tag rather than after it.
6. **Step 4's coupling in one commit:** i18n's optional peer goes `^1.0.0-rc.1` →
   `^1.0.0` **with** the assertion in
   `projects/i18n/tests/language-select-surface.spec.ts` changed in the same commit, or
   the gate suite is red at that tag.
7. **D93's registry state is read once, from his screen.** The `dist-tags` and the
   deprecation read-back came from the owner's terminal on the hotspot; the agent never
   reproduced it, because `registry.npmjs.org` stopped being reachable from this network
   the same afternoon. Re-read it before relying on it — the loop in the D93 section is
   the command — and note that it is the only claim in this file about npm that has no
   second witness. The `next` tag is now the same version as `latest`, which nothing has
   decided what to do with.

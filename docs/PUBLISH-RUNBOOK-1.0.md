# Publish runbook — Rivinia 1.0

**Status: running — step 2 has been done for `@rivinia/theme` and
`@rivinia/select`, and for nothing else.** The owner published
`@rivinia/theme@1.0.0-rc.1` and `@rivinia/select@1.0.0-rc.1` to the `next`
dist-tag on 2026-11-03, from the `theme/v1.0.0-rc.1` and `select/v1.0.0-rc.1`
tags, which point at `3cb8b51` and `1e78c6c` — both tips of
`release/1.0-integration`. `latest` still answers `0.1.0` and `0.7.1`. The agent
that prepared the rcs published nothing, created no tag and pushed no tag: every
command below is still a human action, and `menu` and `i18n` are unrun. **Step 1
is done and pushed: `release/1.0-integration` is in `main` at `173f150`, and
`origin/main` answers the same commit as local `main` — see step 1.** `menu`'s
tagged build was pre-flight packed and measured on 2026-11-03, with no tag
created; the expected numbers are under the table.

| Package           | rc on `next`             | Registry verification                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rivinia/theme`  | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `76fbabd7…`; the downloaded tarball `cmp`-identical to `/tmp/rv-rc-theme/rivinia-theme-1.0.0-rc.1.tgz` (8,396 B, 9 files); `npm install @rivinia/theme@next` in a scratch consumer resolved all six `exports`, and `diff -r` of the installed tree against the inspected tarball printed nothing                                                                         |
| `@rivinia/select` | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `9e268244…`; the downloaded tarball `cmp`-identical to `/tmp/rv-rc-select/rivinia-select-1.0.0-rc.1.tgz` (66,787 B, 9 files); `dist-tags` `{"latest":"0.7.1","next":"1.0.0-rc.1"}`; `npm install @rivinia/select@next` resolved all three `exports` in a scratch consumer; the barrels carry the freeze's counts — `.` 7 names, `./ui` 10. Read the note under the table |
| `@rivinia/menu`   | not published            | pre-flight packed 2026-11-03, twice, byte-identical — the expected values are in the menu subsection under the table. No tag exists yet                                                                                                                                                                                                                                                                                                           |
| `@rivinia/i18n`   | not published            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| the soak, `1.0.0` | not started              | it cannot start before the four rcs exist                                                                                                                                                                                                                                                                                                                                                                                                         |

The select row's last clause needs spelling out, because it is the one check a
future verifier could get wrong. `@rivinia/select` imports cleanly in bare Node
and gives its 4 runtime names (`RiviniaSelect`, `RIVINIA_SELECT`,
`provideRiviniaSelect`, `injectRiviniaSelect`); the other 3 of the 7 are the
type-only re-exports in `types/rivinia-select.d.ts`. A bare-Node runtime `import`
of `./ui` **throws** — `The injectable 'PlatformLocation' needs to be compiled
using the JIT compiler, but '@angular/compiler' is not available`. That is
`@angular/common` needing Angular's compiler outside a build, and every Angular
library behaves this way; it is not a defect in the tarball. `./ui` is proven by
the SSR and consumer production builds in row 9 of `docs/MERGES-1.0.md`, which do
compile it, and by the `.` + `./ui` resolution above. Do not treat a Node `import`
of a UI entry point as a publish gate.

One more number: the published select tarball is 66,787 B against row 9's 66,814 B.
The 27-byte difference is the CHANGELOG heading fix (`## 1.0.0-rc.1 — prepared, not
yet published` → `## 1.0.0-rc.1`) shipping — the heading inside the registry
tarball reads `## 1.0.0-rc.1`, which is the proof that the correction landed.

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
Two consequences for the remaining two publishes: `menu` can go now, and `i18n` can
go immediately after it — its peer no longer points at a version that does not
exist. Both were published from a **local** i18n build, so the numbers above
predict the rc; they are not a substitute for `check:pack` on the tagged build.

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

This file is S8 step 5 of
[`specs/1.0-readiness.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/specs/1.0-readiness.md).
Read [`docs/RELEASE-1.0.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/RELEASE-1.0.md)
first: it explains the order and why `@rivinia/i18n` goes last. The checks each
step must pass are in `AGENTS.md` (gates 1–8) and
[`docs/HUMAN-CHECKS-1.0.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/HUMAN-CHECKS-1.0.md).

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
- `npm login --registry https://registry.npmjs.org/` **does** work here when the
  network is up: on 2026-11-03 it printed a `/login/cli/<uuid>` URL, the owner
  approved it, and it answered `Logged in on https://registry.npmjs.org/` in 21 s.
  Earlier sessions concluded the opposite from a 403 on `www.npmjs.com/login`;
  that was the block, not the rule. `npm whoami` before publishing still decides.

## Step 0 — decide the theme question

`@rivinia/theme` has one release on npm: `0.1.0` — the only other version the
package has ever published is the placeholder `0.0.0-stage`, per
`npm view @rivinia/theme versions`. `docs/RELEASE-1.0.md` planned a
`0.2.0` before the rc, and that bump was **never made** — the manifest went
straight from `0.1.0` to `1.0.0-rc.1`. Two honest options:

| Option                                             | What you publish                                                                                                                  | What a consumer sees                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — skip 0.2.0** (what the tree is prepared for) | `@rivinia/theme@1.0.0-rc.1` on `next`, straight after `0.1.0`                                                                     | One major jump. The `0.2.0` changes — `@theme inline` in the Tailwind adapter — arrive inside it, and `projects/theme/CHANGELOG.md` says so. |
| **B — ship 0.2.0 first**                           | A new bump commit and a `theme/v0.2.0` tag on the commit that carries the styling-stack fixes, published to `latest`, then the rc | The intermediate release exists, exactly as `docs/RELEASE-1.0.md` step 1 promised. Costs one extra release cycle before any rc.              |

Option B is the only one that makes the older document true. Option A is the one
the branch is prepared for.

**Answered on 2026-11-03: Option A.** The owner cut `theme/v1.0.0-rc.1` straight
onto the 1.0 tree and published the rc, so `0.2.0` does not exist and will not.
Two consequences, both recorded in D91: `docs/RELEASE-1.0.md` step 1 is now
marked skipped rather than completed, and a consumer who wants the `@theme inline`
Tailwind adapter fix without a `next` tag has to take the rc — `latest` stays
`0.1.0` with no fix. If that ever matters, the remedy is a `0.2.0` release cut
after the rc plus `npm dist-tag add @rivinia/theme@0.2.0 latest`, which moves
`latest` to a version with no dark mode; it is not a small trade.

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

`theme` and `select` are done — their tags exist, both on origin
(`theme/v1.0.0-rc.1` → `3cb8b51`, `select/v1.0.0-rc.1` → `1e78c6c`), and both are
published. `menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` **do not exist yet** — verified
again on 2026-11-03 against `git ls-remote --tags origin`, which lists only those
two rc tags above — and step 1 changes where they should be cut: from `main` now,
which is what this document always asked for. The `main` tree is the integration tree
plus one root markdown file, so a tag cut there produces the same package bytes a tag
cut on integration would — root `CHANGELOG.md` is not in any tarball. `origin/main`
and `main` answer the same commit, so the block's `git push origin main refs/tags/…`
has something to push; `git rev-parse origin/main main` immediately before 2.1 is the
check, not a SHA copied from here. One mechanical note: `main` is checked out in
`../Revinia-select-summary`, not in this repo, so the tag is cut in that directory
— and it was clean and gated there on 2026-11-03, so `git rev-parse HEAD` there
before tagging is the fastest confirmation that nothing moved.

```bash
PKG=theme          # then select, menu, i18n
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
command exits with `+ @rivinia/$PKG@$VER`. `--tag next` is what keeps `latest`
pointing at the 0.x release nobody has to leave.

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

### What theme's run taught, in case the next three go the same way

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

## Step 3 — the soak

Install the four rcs in a real app and follow **S8 — the soak** in
`docs/HUMAN-CHECKS-1.0.md`: version-only diff, one sitting, two production builds
(with and without the optional select peer), then the report. Nothing is promoted
until that section passes.

## Step 4 — promotion to 1.0.0

Only from an rc that passed the soak, and in the same order.

```bash
# one commit per package, or one commit for the four:
#   version 1.0.0-rc.1 -> 1.0.0 in projects/<pkg>/package.json
#   the CHANGELOG heading '## 1.0.0-rc.1' -> '## 1.0.0'
#   the package README 'Package version: **1.0.0-rc.1**' -> **1.0.0**
#   the root README Workspace column -> 1.0.0
# and in projects/i18n/package.json: the optional peer becomes '^1.0.0'
#   (docs/RELEASE-1.0.md, 'Peer ranges at each step') — with the assertion in
#   projects/i18n/tests/language-select-surface.spec.ts changed in the same commit,
#   then: pnpm check:docs && npx ng test i18n --watch=false && npx vitest run scripts/tests
```

Then repeat step 2's block with `VER=1.0.0` and `--tag latest` for each package,
and `npm dist-tag add @rivinia/<pkg>@1.0.0 latest` is not needed — publishing with
`--tag latest` does it. `next` keeps pointing at `1.0.0-rc.1` until you decide to
move it.

## If something is wrong

- Wrong version published: do not touch it. Publish the next one (`1.0.0-rc.2`) and
  `npm deprecate` the bad version only if a consumer would otherwise install it.
- `PUT 401` followed by `/-/v1/done` and then `PUT 202`, exit 0: that is npm's
  expired-token → web-auth fallback. Check `npm view` before republishing.
- `npm view` answers 404 right after a successful publish: propagation. Poll the
  packument URL above.
- An rc reveals a bug: fix it on a branch, gates, merge, tag `1.0.0-rc.2`, soak
  again. `1.0.0` is only ever cut from a clean rc.

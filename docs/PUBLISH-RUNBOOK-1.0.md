# Publish runbook — Rivinia 1.0

**Status: running — step 2 has been done for `@rivinia/theme`, and for nothing
else.** The owner published `@rivinia/theme@1.0.0-rc.1` to the `next` dist-tag
on 2026-11-03, from the `theme/v1.0.0-rc.1` tag, which points at `3cb8b51` — the
tip of `release/1.0-integration`. `latest` still answers `0.1.0`. The agent that
prepared the rcs published nothing, created no tag and pushed no tag: every
command below is still a human action, and `select`, `menu` and `i18n` are
unrun.

| Package           | rc on `next`             | Registry verification                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rivinia/theme`  | **published** 2026-11-03 | `dist.integrity` equal to base64 of the local `sha512sum`; `dist.shasum` `76fbabd7…`; the downloaded tarball `cmp`-identical to `/tmp/rv-rc-theme/rivinia-theme-1.0.0-rc.1.tgz` (8,396 B, 9 files); `npm install @rivinia/theme@next` in a scratch consumer resolved all six `exports`, and `diff -r` of the installed tree against the inspected tarball printed nothing |
| `@rivinia/select` | not published            | —                                                                                                                                                                                                                                                                                                                                                                         |
| `@rivinia/menu`   | not published            | —                                                                                                                                                                                                                                                                                                                                                                         |
| `@rivinia/i18n`   | not published            | —                                                                                                                                                                                                                                                                                                                                                                         |
| the soak, `1.0.0` | not started              | it cannot start before the four rcs exist                                                                                                                                                                                                                                                                                                                                 |

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

`release/1.0-integration` carries rows 1–9 and has never been merged to `main`; the
program's rule was that the agent never touches `main`. Tags are cut from `main`,
so this step is yours.

**What actually happened for theme.** The merge to `main` did not come first:
`theme/v1.0.0-rc.1` was cut on `3cb8b51`, which is the **tip of
`release/1.0-integration`**, and that tag is now on origin. `main` still answers
`6b51eba`. That did not put unpublished code on the registry, because the two
branches' only content difference is in root files: `git diff --stat
df3a444 refs/heads/main` (the merge-base against `main`) prints **`CHANGELOG.md`
and `README.md`, 2 files** — the integration base already carries the menu 0.5.0
projected-content work, and `main` moved only its publish annotations since.
Two consequences to handle before the next tag: `release/1.0-integration` is 70
commits ahead of `main`, so step 1 is still the step that should happen; and those
two root files disagree with each other now (integration's `CHANGELOG.md` says
`@rivinia/menu 0.5.0`, `main`'s says `0.5.0 (published 2026-10-31)`), which means
the merge will conflict there by construction.

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

## Step 2 — per package, in this order

For each of `theme`, `select`, `menu`, `i18n`, in that order. Run the whole block
for one package before starting the next: `@rivinia/i18n`'s optional peer is
`^1.0.0-rc.1` on select, so select's rc must already be on the registry when a
consumer installs i18n.

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
- **A CHANGELOG heading goes stale inside the tarball.** `projects/theme/CHANGELOG.md:19`
  reads `## 1.0.0-rc.1 — prepared, not yet published`, and the published rc ships
  that sentence: `tar -xzOf <registry tarball> package/CHANGELOG.md` shows it. It is
  false from the moment of publish onward, and `1.0.0-rc.1` is immutable, so theme
  carries it forever. **Fix the other three before their tags:** change the heading
  in `projects/<pkg>/CHANGELOG.md` to `## 1.0.0-rc.1 - 2026-11-03` in a
  `docs(<pkg>)` commit on `release/1.0-integration`, then cut `<pkg>/v1.0.0-rc.1`
  from that commit.
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
#   the CHANGELOG heading '## 1.0.0-rc.1 — prepared, not yet published' -> '## 1.0.0 - <date>'
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

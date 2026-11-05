## 2026-11-04 — D94: `1.0.0-rc.2` is published on annotated tags, the four `next` tags are aligned onto it, and its tarballs ship a CHANGELOG that stops at `rc.1`

**Context.** The owner ran the second release line on 2026-11-03 with a separate
agent driving the branch work: `69af061` "release: 1.0.0-rc.2 (docs and manifests)"
carries nine files — four `package.json`, four `README.md`, `projects/theme/CHANGELOG.md`
— and **zero source or style file**, and `be06a4c` flipped the root README's four
version cells. `f066a32 merge(repo): release 1.0.0-rc.2` is a `--no-ff` merge of the
integration tip into `main` with parents `37617d5` + `be06a4c`, so `main` contains the
whole of rows 1–11 plus the bump. The four `*/v1.0.0-rc.2` tags are **annotated** —
`git cat-file -t refs/tags/<tag>` prints `tag`, not `commit`, and all four peel to the
same commit `69af061` (tag objects `f714cb2`, `1153d47`, `cb99eeb`, `0eac1cc`) — which is
the release form D92 predicted, and it makes the "all rc tags are lightweight" sentence
in the runbook false for the rc.2 line. `git ls-remote --tags origin` answers all four,
so the tags are pushed. `latest` and `next` then diverged: rc.1 went out with
`--tag next`, D93 moved `latest` onto rc.1 by hand, and rc.2 went out with `--tag latest`,
so on the morning of 2026-11-04 `select` and `menu` answered `next: 1.0.0-rc.1` while
`latest` answered `1.0.0-rc.2`. That is npm behaving exactly as documented — a publish
moves only the tag it names — not a registry fault and not mirror lag.

**Decision.** The owner moved the two stragglers with `npm dist-tag add
@rivinia/<pkg>@1.0.0-rc.2 next` on 2026-11-04, so all four packages now answer
`{"latest":"1.0.0-rc.2","next":"1.0.0-rc.2"}`. The agent verified the published bytes
the same day, which is the first registry-side check rc.2 ever had: he downloaded the
four rc.2 tarballs and the four packuments from the npmjs mirror, and the local
`shasum` of each tarball equals the `dist.shasum` in its packument **and** its `sha512`
base64-encodes to that packument's `dist.integrity` — `8,419 B / 9 files /
24,247 B unpacked` (theme, `a91c52bff3…`), `66,818 / 9 / 271,414` (select,
`3369111706…`), `36,887 / 9 / 131,018` (menu, `6e76ab582a…`), `93,265 / 20 / 347,400`
(i18n, `20d0b7085a…`). Those four prefixes are the numbers the owner read off npmjs and
pasted, so the cache is serving npmjs's bytes and this table is the evidence, not a
parallel artifact. Publishing timestamps from the packument: theme
`2026-11-03T13:12:18.981Z`, menu `13:17:41.716Z`, select `13:17:44.931Z`, i18n
`15:30:36.695Z`; the `time.modified` values `2026-11-04T10:01:36.820Z` (menu) and
`10:01:37.959Z` (select) are the dist-tag moves, which is what rules out lag. Opening
the tarballs found the defect this entry exists for: **inside every rc.2 artifact
`package.json` says `1.0.0-rc.2` and the README says `Package version:
**1.0.0-rc.2**`, while `CHANGELOG.md`'s newest heading is `## 1.0.0-rc.1`** — no rc.2
heading was written in any of the four. A published version is immutable, so the fix is
a new version, which is what `1.0.0-rc.3` is for.

**The gate that would have caught it landed one release late.** The governance work
merged after the rc.2 promotion — `34a52c9 chore(repo): add governance verification
gates` — added `scripts/check-versioned-doc-links.mjs`, whose first assertion is
`CHANGELOG.md must contain a heading for <version>`, and which additionally requires
every repository link inside a shipped README to be pinned to the immutable release tag
(`<pkg>/v<version>/…`) rather than to `main`. Run on 2026-11-04 against the four
**published** rc.2 tarballs it reports **12 issues (theme), 14 (select), 12 (menu), 17
(i18n)**; the same command against the working tree reports the same counts, because the
tree has not converted its links either. One of the twelve is the missing heading. So
`1.0.0-rc.3` carries two things, not one: the changelog entries rc.2 should have had,
and the tag-pinned links the new gate demands — without the second there is no honest
way to run step 2 for a third time.

**Rejected.** Leaving `next` on rc.1 for two of four — a split line is worse than a
redundant one, and `docs/releases/1.0/HUMAN-CHECKS.md` installs `@next` for all four in one command, so
the soak would have tested two rc generations in the same `node_modules`. Retiring
`next` with `npm dist-tag rm` instead of aligning it — honest for the registry state,
but it would break every `@next` install line in the 1.0 documents, which is a docs
change the owner has not asked for. Moving the i18n optional peer to `^1.0.0` now: the
published `1.0.0-rc.2` artifact still declares `@rivinia/select: ^1.0.0-rc.1`, which
`semver.satisfies` (the repository's 7.8.5) confirms admits rc.1, rc.2, rc.3 **and**
`1.0.0`, so nothing is broken today — and a caret on `1.0.0` would exclude every rc, so
that flip waits for the stable release. Deprecating rc.1 as part of this entry: still
owed, not done, and it is the owner's command to run.

**Impact.** The runbook's status header described rc.1 and said every rc tag was
lightweight; both sentences are corrected there. `docs/releases/1.0/MERGES.md` gains row 12.
The publish chain gains a rule that would have prevented the split: **a new rc is
published `--tag next` for all four, and only then is `latest` moved, for all four** —
one tag per command, every time, because a publish touches exactly one pointer.
The next release to run is `1.0.0-rc.3` on `release/1.0-rc3`, whose payload is the four
missing `## 1.0.0-rc.2` headings, the rc.3 entry, and the tag-pinned repository links
`check:versioned-doc-links` requires of a shipped README; if the owner decides the
changelog gap does not justify a version, the alternative is to fix the headings and let
them first ship inside `1.0.0`, and say so here rather than silently. Step 3's soak is now a
test of rc.2, and any soak defect ships as rc.4.

**What this does not prove.** The agent did not publish, tag, push a tag or move a
dist-tag; every registry mutation in this entry is the owner's, and a second agent's.
The packument and tarball reads came from `registry.npmmirror.com`, because
`registry.npmjs.org` is not reachable from this network — the shasum agreement with the
owner's npmjs numbers is what makes that acceptable as evidence of the published bytes,
and it is still a cache rather than the source. No production build, no
`check:pack`-style FESM inspection and no consumer install has run against any rc.2
artifact: the numbers above prove the bytes are what the registry says they are, not
that they work in an app. `git log --oneline 69af061..main` shows the governance work
that landed after the merge, so the tagged commit is an ancestor of `main` rather than
the tip it was promoted from — rc.2's tags were cut from the integration tip before
`f066a32` merged it, which is legal but is the opposite of the order D92 recorded.

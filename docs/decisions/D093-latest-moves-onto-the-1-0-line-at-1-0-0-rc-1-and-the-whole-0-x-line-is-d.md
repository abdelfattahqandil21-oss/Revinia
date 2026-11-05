## 2026-11-03 — D93: `latest` moves onto the 1.0 line at `1.0.0-rc.1`, and the whole 0.x line is deprecated

**Context.** The fourth rc was published and verified the same morning, and the
owner then looked at the package pages: `@rivinia/i18n` advertises `0.8.0`, and an
rc appears only if you open the Versions tab — "اللي هيجي يكتب npm i المكتبة مش
هيشوف الاخير انا علي npm مش بتظهر غير لما اخش علي versions tab". Everything this
program had decided until that minute argued the opposite: D85 and D91 kept the rc
on `next` so that `latest` stayed on the last 0.x and no consumer was ever pointed
at a prerelease. He reversed it over four messages — "لا ماحنا محتاجين نرفع latest
لفعلي لاول major ثم بعدين يكون @next", then "يلا نحرك التلاتة عشاان يظهرو", then the
premise that makes it safe: "هو لسه مفيش مستخدمين ده … اول major هو اللي الناس
تستخدمه اعلان تام اي نسخة قبله deprecated". With no consumers, the compatibility
argument protects nobody, and the page header is the only visibility npm gives.

**Decision.** For each of `@rivinia/theme`, `@rivinia/select`, `@rivinia/menu` and
`@rivinia/i18n`: `latest` points at `1.0.0-rc.1`, and every version below the 1.x
line carries the deprecation message `Superseded by the Rivinia 1.x line. 0.x
receives no further fixes; install @rivinia/<pkg>@latest.` The owner ran the
`npm dist-tag add` and `npm deprecate` commands himself, from the tagged i18n
worktree, on the hotspot — the agent created no tag, moved no dist-tag and
deprecated nothing. The read-back in his transcript is the record: for all four,
`latest: 1.0.0-rc.1` and `next: 1.0.0-rc.1`, and of the versions each packument
lists every one prints `DEPRECATED` except `1.0.0-rc.1`, which prints `clean`. The
deprecation counts are theme 2 (`0.0.0-stage`, `0.1.0`), select 13, menu 9, i18n 14
— 38 versions, `0.0.0-stage` included. Those same lists are a full statement of
what exists: `@rivinia/i18n` runs `0.6.0` → `0.7.1`, so `0.7.0` never reached the
registry.

**The range bug in the first block, and the npm behavior behind it.** The block I
handed him deprecated `@rivinia/<pkg>@<1.0.0`, and it deprecated `1.0.0-rc.1` too.
That is documented, not a guess: `npm-deprecate.md` in the installed npm 11.19.0
says ranges passed to the command "are interpreted such that they **do** include
prerelease versions", and in this repository's own `semver@7.8.5`,
`satisfies('1.0.0-rc.1', '<1.0.0', {includePrerelease: true})` is `true`. For a
minute the state was that `npm i @rivinia/i18n` printed a deprecation warning about
the very version it had just installed. He ran the correction: `npm deprecate
"@rivinia/<pkg>@1.0.0-rc.1" ""` — an empty message un-deprecates, per the same doc —
and then the same deprecation with `<1.0.0-0`, the range that cannot match a
prerelease of its own boundary version. The read-back above is post-correction. The
rule this leaves for the rest of the program: **a "everything before this release"
range is written `<X.Y.Z-0`, and a specific version is deprecated by naming it, not
by a range.**

**Rejected.** Keeping `latest` on 0.x until `1.0.0` ships — the D85/D91 position,
reversed here on the owner's explicit judgement. Deprecating with the message that
named the rc ("currently 1.0.0-rc.1") — the second run uses `@latest` instead, so
the string survives the next dist-tag move and needs no rewrite. Leaving the rc
deprecated and telling consumers to ignore the warning — the warning would attach
to the only version worth installing.

**Impact.**
- Every "`latest` unmoved" sentence in `docs/PUBLISH-RUNBOOK-1.0.md`,
  `docs/RELEASE-1.0.md` and the D85/D91 entries is now history, not state. Same
  correction as D92 made to D91's tense. D91's Option A trade — "`latest` gets
  `0.1.0`, which has **no dark values at all**" — no longer describes the registry:
  `latest` is the rc, and the rc has dark values.
- Step 4 keeps its shape and gains one action. Publishing `1.0.0` with `--tag
  latest` still moves `latest` by itself, so no `dist-tag add` is needed; what is
  new is that promotion should deprecate the rc it replaces — `npm deprecate
  "@rivinia/<pkg>@1.0.0-rc.1" "…"`, by version, never by range.
- The soak's failure mode is now public. A defect found in the soak no longer sits
  on `next` where only the curious reach it: `npm i @rivinia/<pkg>` serves an rc
  while the bug is known. And if that fix ships as `1.0.0-rc.2` with `--tag next`,
  `latest` **stays on `rc.1`** — an rc-line fix either publishes with `--tag latest`
  or moves the tag by hand. Recorded in the runbook's step 3 and step 4.
- Real blast radius: fresh installs and the npmjs page header only. An existing app
  on `^0.8.0` does not move — a semver range never jumps a major, which is why a
  dist-tag move is a smaller act than it sounds, and why deprecation is the honest
  way to mark 0.x closed rather than a `latest` that no range can reach.

**What this does not prove.** The agent did not read the packument: both transcripts
were run on his hotspot, and `registry.npmjs.org` is not reachable from this network
afterwards. The evidence is the owner's transcripts, and the read-back in the second
is a direct `curl -4` of the packument plus `npm dist-tag ls` against npmjs — registry
data, but read once and by his hand, not reproduced here. No production build has run
against a tree resolved from `latest`; every step 2.6 consumer pinned `@next`, which
today resolves to the same bytes. Nothing was done about `next`: it still points at
`1.0.0-rc.1`, which makes it redundant with `latest` until `1.0.0-rc.2` or `1.0.0` is
published onto it.

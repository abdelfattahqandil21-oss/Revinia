## 2026-11-03 — D91: theme's `1.0.0-rc.1` publishes to `next` straight after `0.1.0`; the planned `0.2.0` never exists

- Context: D88 fixed the release shape, and `docs/RELEASE-1.0.md` step 1 promised a
  `@rivinia/theme@0.2.0` on `latest` carrying SPEC-0.1.1 (the `@theme inline`
  Tailwind adapter) before any 1.0 work. That bump was never made — the manifest
  went `0.1.0` → `1.0.0-rc.1` inside the 1.0 branch, so the published rc either
  silently absorbs a promised release or the tree gets a `0.2.0` after the fact.
  `docs/PUBLISH-RUNBOOK-1.0.md` step 0 laid the two honest options in front of the
  owner rather than picking one in a commit message.
- Decision: **Option A — skip `0.2.0`**, executed by the owner on 2026-11-03.
  `theme/v1.0.0-rc.1` was cut at `3cb8b51` (the tip of `release/1.0-integration`)
  and pushed, then `@rivinia/theme@1.0.0-rc.1` published with `--tag next --access
  public --registry=https://registry.npmjs.org/` and no OTP, authenticated through
  npm's web-auth URL. Verified against the registry rather than the publish log:
  `dist.integrity` `sha512-3Ks5wRdr3AGCeXKpG9YDjPPylRivyG2vMuZ9cn/TtyVVqTZCKmX+b/MK81Hq/HPQpexSi8ruCvKLumLcfOdUoQ==`
  equals base64 of the local `sha512sum` (`dcab39c1…754a1`) character for
  character; `dist.shasum` `76fbabd7…a46e`; the downloaded tarball `cmp`-identical
  to the inspected 8,396 B / 9-file artifact; `diff -r` of the tree installed by
  `npm install @rivinia/theme@next` against that same tarball empty; all six
  `exports` targets resolving through `createRequire`; and `dist-tags` reading
  `{latest: 0.1.0, next: 1.0.0-rc.1}` — `latest` unmoved, so nobody is forced off
  the library by an upgrade.
- Rejected: **Option B**, a `0.2.0` + `theme/v0.2.0` + a `latest` publish before the
  rc — it makes the older document true and costs a whole release cycle, and it
  delays the only build that carries dark mode. Rejected too: publishing the rc to
  `latest`, which would make a prerelease the default install for every consumer,
  and re-tagging or overwriting `1.0.0-rc.1` to fix the wording problem below —
  versions are immutable, which is the rule this release exists to demonstrate.
- Impact: four documents moved with the fact, in this commit — the runbook's header
  became a status table (`theme` published, `select`/`menu`/`i18n` not),
  `docs/RELEASE-1.0.md` step 1 reads **Skipped** and step 2 **Done**, its stale
  "nothing here has been published" line and its claim that the two S8 documents
  do not exist are corrected, and `docs/API-SURFACE-1.0.md` no longer says the
  runbook is unrun. The root README's **Latest on npm** column keeps theme at
  `0.1.0`, because that column is `latest` and `latest` did not move.
- Impact, the three things this publish taught: `git tag` exiting
  `fatal: tag … already exists` stopped the `&&` chain, so the build and pack ran
  in the main repository instead of the tag's worktree (right bytes this time —
  that repository's HEAD **is** the tag's commit — wrong procedure);
  `npm install <pkg>@next` returned `ETARGET notarget` ninety seconds after a
  successful publish while a direct `curl` of the version endpoint already answered
  200, which is npm's own packument cache and not a failed publish; and
  `projects/theme/CHANGELOG.md:19` still reads `## 1.0.0-rc.1 — prepared, not yet
  published` **inside the published tarball**, immutably false from the moment of
  publish, so the other three CHANGELOG headings must be corrected before their
  tags are cut.
- **What this does not prove:** step 2.6 stopped at resolution — no Angular
  production build has run against the published `next` tag, only against the local
  tarball; `dist.attestations` is absent, so there is no provenance, as with every
  earlier Rivinia release; the tag sits on a commit `main` does not contain
  (`git diff --stat df3a444 refs/heads/main` — the merge-base against `main` —
  prints only root `CHANGELOG.md` and `README.md`, so no library code is missing
  from what shipped, but the merge will conflict in exactly those two files);
  the soak cannot begin before the other three rcs exist; and the `Decide` verdicts
  in `docs/API-SURFACE-1.0.md` — five rows, which are really two decisions: the
  `@rivinia/select/ui` alias group (`computeSelectPosition`, `SELECT_GAP` and the
  four aliased types), and the `RiviniaMenuItem` type-versus-directive collision —
  are still the owner's to settle before any `1.0.0` tag.

### D91 addendum — the same day, the heading claim was removed from all four CHANGELOGs

D91 above says the remaining three headings must be corrected before their tags.
They were, and so was theme's in the repository: each `## 1.0.0-rc.1 — prepared, not
yet published` became `## 1.0.0-rc.1`, in four per-package `docs(<pkg>)` commits.
No version heading in this ecosystem now asserts a registry state, because a publish
is exactly the event that would invalidate it — and the published theme rc keeps the
old line forever, which is the proof the rule needed.

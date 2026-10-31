# Rivinia 1.0 readiness — S0 pre-flight audit (2026-10-31)

Read-only. No package code was changed. Sources: each `projects/<pkg>/package.json`,
`npm view @rivinia/<pkg> version`, `projects/theme/SPEC-0.1.1.md`,
`projects/theme/CHANGELOG.md`, and `git log`/`git branch --merged main`.
Claims about the registry were checked on 2026-10-31.

## 1. Package inventory (10 publishable packages)

| Package | Local | Registry | Internal edge | Angular peers | `repository` | `engines` | CHANGELOG | 1.0 scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `@rivinia/datepicker` | 0.1.0 | 0.1.0 | — | core, forms | no | no | no | stay 0.x |
| `@rivinia/env` | 0.3.4 | 0.3.3 | — | devkit | no | no | no | stay 0.x |
| `@rivinia/http` | 0.5.4 | 0.5.3 | — | common, core, devkit, rxjs; runtime dep `tslib ^2.3.0` | no | no | no | stay 0.x |
| `@rivinia/i18n` | 0.8.0 | 0.8.0 | peer `@rivinia/select ^0.7.0` (optional) | core, devkit | **yes** | **yes** | **yes** | **1.0** |
| `@rivinia/menu` | 0.5.0 | 0.5.0 | — | core | no | no | no | **1.0** |
| `@rivinia/modal` | 0.6.2 | 0.6.1 | — | common, core, devkit | no | no | no | stay 0.x |
| `@rivinia/select` | 0.7.1 | 0.7.1 | — | common, core, forms | no | no | no | **1.0** |
| `@rivinia/table` | 0.1.0 | 0.1.0 | — | common, core | no | no | no | stay 0.x |
| `@rivinia/theme` | 0.1.0 | 0.1.0 | none (CSS-only, no peers) | none | no | no | **yes** | **1.0** |
| `@rivinia/toast` | 0.5.2 | 0.5.1 | — | core, devkit | no | no | no | stay 0.x |

`i18n-e2e` and `menu-e2e` are apps, not packages, and are excluded.

Two facts the first plan did not have:

- **Four packages have local version bumps that are not on the registry**:
  env 0.3.4 > 0.3.3, http 0.5.4 > 0.5.3, modal 0.6.2 > 0.6.1, toast 0.5.2 > 0.5.1.
  These are unpublished releases, not 1.0 work. They need an owner decision:
  publish them on the 0.x line, or leave them until their own specs run.
- **`@rivinia/theme` is consumed only as a stylesheet.** Nothing in
  `projects/` imports `@rivinia/theme`; components read `--rv-*` with
  hard-coded fallbacks instead (occurrences under `projects/*/ui`: select 192,
  menu 50, i18n 26, table 102). A theme release therefore cannot cause a peer
  ERESOLVE; only select → i18n can.

## 2. Internal edges

- Exactly one internal peer edge exists: `@rivinia/i18n` → `@rivinia/select ^0.7.0`,
  optional via `peerDependenciesMeta`. Under pre-1.0 caret semantics that range
  is `>=0.7.0 <0.8.0`, so select 1.0.0 breaks an i18n consumer's install until
  i18n is republished. This is S1, and it fixes itself once i18n peers on
  `^1.0.0`.
- No package lists an `@rivinia/*` entry in `dependencies` or
  `devDependencies`. The only runtime dependency in any package is `tslib` in
  `@rivinia/http`.
- `table/ui` is the only UI entry that already reads `--rv-accent` (8 uses,
  each with a `light-dark()` fallback) and the only one with a
  `@media (forced-colors: active)` block. It is a useful reference for S5b,
  but it is not in the 1.0 scope.

## 3. Proposed 1.0 scope

**Go to 1.0:** theme, select, menu, i18n — the four packages this spec audits
end to end, and the only ones with a frozen-surface review (S8), an ARIA pass
(S2) and a theme/token contract (S5).

**Stay 0.x:** datepicker, env, http, modal, table, toast.

Reasons:

- A 1.0 freezes exported API, `--rv-*` names and ARIA roles. Freezing the six
  now would enshrine surfaces that never had the S8 export review.
- Nothing in the monorepo consumes the six through npm, so their version line
  does not constrain the 1.0 order.
- The four local-ahead patches (env, http, modal, toast) are small and
  independent; publishing them is an owner call, not a 1.0 prerequisite.
- select must reach 1.0 first (D85 changes roles, which is public contract);
  i18n follows with `^1.0.0`. menu and theme have no internal consumers, so
  their order between select and i18n is free; D88 keeps theme → select → menu
  → i18n for a simple story.

## 4. `@rivinia/theme` SPEC-0.1.1 — status and content

**Status.** THM-01…THM-07 are implemented and merged on `main`; branch
`pkg/theme/stack-fixes` is an ancestor of `main` and has no commits ahead.
`projects/theme/package.json` is still 0.1.0 (the registry version),
`CHANGELOG.md` still says "Unreleased", and there is no tag or publish. The
owner answer recorded in the spec is **0.2.0**.

**Content.**

- THM-01: the Tailwind adapter's `--color-rv-*` block becomes `@theme inline`,
  so a subtree `--rv-bg` override reaches `bg-rv-bg` / `text-rv-*` again.
  Breaking for consumers who override `--color-rv-*` on an element; this is why
  the release is 0.2.0, not a patch.
- THM-02: `scripts/check-theme-package.mjs` + `pnpm check:theme`: fails on a
  missing/dangling `exports["."].style`, any missing export target, a file list
  other than the expected nine, or `--rv-bg` no longer inside
  `@layer rivinia-theme`.
- THM-03…07: README corrections (Less, Sass CLI, override locations, adapter
  replacement), `_index.scss` comment, and `sideEffects` text matching the
  manifest.

## 5. SPEC-0.1.1 vs S5 (dark, forced-colors, accent)

- **File conflict:** none in `styles/theme.css`. SPEC-0.1.1 touches
  `tailwind.css`, `_index.scss`, README and the packaging check. S5a adds dark
  values and tokens to `theme.css`.
- **Textual conflict:** both edit `projects/theme/README.md` and
  `projects/theme/CHANGELOG.md`. Rebase order: SPEC-0.1.1 first.
- **Invariants S5a must keep:** everything stays inside `@layer
  rivinia-theme`; the packed file list stays at nine files; `--rv-bg` stays
  declared inside the layer. `check:theme` enforces all three.
- **Interaction is complementary:** `@theme inline` makes Tailwind utilities
  resolve `var(--rv-bg)` at the use site, which is exactly what dark mode needs
  when the scheme flips on the root.

## 6. Where SPEC-0.1.1 fits in the D88 order

Recommended, as a pre-step before the rc line:

1. Release `@rivinia/theme` **0.2.0** with the merged SPEC-0.1.1 work, after
   re-running its gates 1–6 on `main` and the owner's explicit release OK.
2. S5a then ships in `@rivinia/theme` **1.0.0-rc.1** (dark, forced-colors,
   accent wiring, contrast script, token list).
3. select → menu → i18n follow as in D88.

Do not fold SPEC-0.1.1 into the rc: its version (0.2.0) is already decided and
it carries a documented breaking Tailwind change that should be released and
soaked on its own before the 1.0 freeze.

## 7. Consequences for the next branches

- `pkg/repo/1-0-packaging` (S1 + S6 + S9 tooling): add `repository`/`homepage`/
  `bugs` to all nine packages missing them, add `engines` (Angular's exact
  range) to the nine missing it, add `CHANGELOG.md` to the eight missing it,
  and extend the pack gate to require `repository`, `README.md` and
  `CHANGELOG.md` while printing the file list.
- i18n stays the only package that declares the select peer; its 1.0 manifest
  change is `^0.7.0` → `^1.0.0`, still optional.
- The four unpublished patch bumps are out of scope for every 1.0 branch; they
  need a separate owner decision.

## 8. Not verified in this audit

- The SPEC-0.1.1 gates were last run by its own session; they were not re-run
  here (read-only task).
- Tarball contents for the six 0.x packages were not inspected.
- Whether the four local-ahead patch bumps are intentional pending releases is
  an owner decision, not something the tree records.

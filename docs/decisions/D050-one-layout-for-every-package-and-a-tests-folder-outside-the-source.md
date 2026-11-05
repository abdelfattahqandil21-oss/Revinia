## 2026-10-20 — D50: one layout for every package, and a `tests/` folder outside the source

- Context: `@rivinia/select/ui` and `@rivinia/menu/ui` had been organised into
  `components/ models/ services/ utils/` (D40), while every other package —
  and every CORE entry point — kept its types, its controller, its helpers, its
  provider and its pipe side by side in one flat `src/lib/`. The UI entry
  points of `@rivinia/modal` and `@rivinia/toast` also carried their template
  and their CSS inline, while select and menu used `.html` / `.css` files. A
  reader who knew one package did not know the others, and the specs of a
  package were scattered across `src/lib/`, `src/ui/` and `ui/src/`.
- Decision: **every package follows the same layers**, and **the specs live in
  a `tests/` folder outside the source the package ships**:

  ```
  src/lib/models/       the types and the contracts — no behaviour
  src/lib/services/     the classes that DO something (the headless controller,
                        a loader, a strategy, a view-transition helper)
  src/lib/utils/        pure functions and pure math
  src/lib/providers/    provide*() and inject*()
  src/lib/pipes/        the pipes
  ui/src/lib/components/<name>/   the .ts, the .html and the .css together
  tests/                the specs
  ```

  - The classification rule is by BEHAVIOUR, not by file name: an interface or
    a type is a model; a class that does something is a service; a function
    with no state is a utility.
  - The specs moved OUT of `src/` on purpose: `src/` now holds only what the
    package ships, which is what makes the boundary reviewable. The unit-test
    builder globs from the project's `sourceRoot`, so the test target's
    `include` in `angular.json` now points at `../tests/**/*.spec.ts` — the
    glob has to leave the source root to reach them. The `tsconfig.spec.json`
    compiles them.
  - `@rivinia/modal` and `@rivinia/toast` moved their inline template and CSS
    into `templateUrl` / `styleUrl`, matching select and menu. The content
    moved VERBATIM: the extracted blocks were diffed against the originals
    before the change.
- **The public API is unchanged.** The same symbols are exported from the same
  entry points; the `exports` map only ever exposed `.` and `./package.json`,
  so no consumer could reach an internal path. Verified by comparing the
  exported symbol sets of every `public-api.ts` against `HEAD`: identical for
  all eleven entry points.
- Alternatives rejected: leaving the specs beside their subject (the Angular
  default) — it would have kept test code inside the shipped tree; splitting
  a file across layers (e.g. `i18n-config.ts` holds both a config type and a
  DI token) — the churn would have bought nothing; renaming the files to match
  their layer — a move alone already gives the structure, and renames would
  have doubled the diff.
- Also removed: the workspace root referenced two `proof-*` projects that no
  longer exist. The dangling references broke the build of every package that
  loaded the root tsconfig, and the error named a file that was not there.
- Verified: 8/8 packages build; http 39 · i18n 52 · modal 53 · toast 35 ·
  menu 40 · select 71 tests pass, the same counts as before the move; the
  schematic suite passes; the packed tarballs and a clean consumer are
  verified separately.
- **A trap worth recording:** `git checkout <commit> -- <path>` ADDS the
  files of that path and never removes the ones the path no longer holds. The
  per-package branches were built with it, so the old flat files came back
  with the merge and every package carried two copies of the same module.
  The bundle was never affected — the duplicates are unreachable from the
  entry point, so the tree-shaker dropped them — and the packed tarballs came
  out byte-identical before and after the cleanup. Only the source tree was
  wrong, and only a human reading the tree could tell. A move must be done
  with `git mv`, or with an explicit `git rm` of the old path.

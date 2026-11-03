# Environment package instructions

These rules supplement `projects/AGENTS.md` for `@rivinia/env`.

- Treat `schematics/` as protected package source and generated installer artifacts. Do not edit its source, TypeScript configuration or generated `.cjs` files without explicit owner approval.
- Before approved schematic changes, capture `git status` and the package tarball file list. Build output must not overwrite authored source unintentionally.
- After an approved schematic change, run schematic tests, build/pack inspection, and a clean consumer install; compare the packaged files with the baseline.
- Root `AGENTS.md` and `projects/AGENTS.md` remain in force.

# Shared browser suites

These rules apply to suites under `e2e/`; root `AGENTS.md` remains authoritative.

- `e2e/menu`, `e2e/select` and `e2e/popup` exercise public behavior through the `projects/menu-e2e` harness. They are browser contracts, not unit tests.
- Build the package outputs and the exact harness into the active worktree before running Playwright. Never trust leftover `dist/` from another task or worktree.
- Keep assertions intact. A mutation gate must establish a green clean control before mutating source, and must state exactly which built app it serves.
- Changes to shared popup contracts require review by affected package owners and targeted browser verification; run cross-browser gates when browser support claims are affected.
- Keep the i18n app and its browser/SSR suites under `projects/i18n/testing/`; the Angular application remains an independent `i18n-e2e` project. The shared Menu/Select/popup harness stays separate. See `docs/engineering/TESTING-ARCHITECTURE.md`.

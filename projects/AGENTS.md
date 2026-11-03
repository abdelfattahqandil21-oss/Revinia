# Publishable package instructions

These rules apply to `projects/<library>/`. Root `AGENTS.md` remains authoritative.

- Keep each library's source, entry points, unit tests, manifest, README and CHANGELOG within its package boundary. Add public cross-package dependencies only through documented package exports and declared peers.
- Treat package exports, peer ranges, side-effect metadata and packed file lists as public contracts. Verify exact public import paths from a clean packed consumer.
- Add user-visible changes to that package's CHANGELOG only when they correspond to an actual release; see `docs/engineering/CHANGELOG-POLICY.md`.
- `*-e2e` projects are harness applications, not publishable packages. Their build and suite ownership is described in `docs/engineering/TESTING-ARCHITECTURE.md`.
- `env/schematics/` is protected: get explicit owner approval before modifying its source, config or generated `.cjs` files. Prefer inspection and report the required decision.

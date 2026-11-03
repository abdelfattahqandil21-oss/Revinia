# Documentation map

Start here when you need a Rivinia document. Package APIs and setup instructions remain beside each package in `projects/<package>/README.md`.

## Find by task

| I need to… | Start here |
| --- | --- |
| Understand package boundaries and architecture | [Engineering governance](engineering/README.md), then the append-only [decision log](DECISIONS.md) |
| Find a feature design, proposal, or implementation contract | [Specifications and design records](specifications/README.md) |
| Use a package feature | The package README under `projects/<package>/`, then its topic guide under `docs/<package>/` when available |
| Run tests or diagnose browser results | [Testing architecture](engineering/TESTING-ARCHITECTURE.md), [shared browser-suite instructions](../e2e/AGENTS.md), and the root README's work section |
| Prepare or understand a release | [Versioning](engineering/VERSIONING.md), [versioned documentation](engineering/VERSIONED-DOCUMENTATION.md), and the [1.0 publish runbook](PUBLISH-RUNBOOK-1.0.md) |
| Find a repository skill or choose one | [Skills inventory](engineering/SKILLS-INVENTORY.md) and [routing guide](engineering/SKILLS-ROUTING.md) |
| Review the repository architecture work history | [Architecture audit and reports](repository-architecture/) |

## Browse by collection

- `docs/i18n/`, `docs/menu/`, `docs/select/`, and `docs/theme/` contain topic guides linked from package documentation.
- `docs/engineering/` contains active repository policies and workflows; its README is the detailed index.
- `docs/specifications/` contains feature specifications and design briefs. The status at the top of each file distinguishes proposals from implemented work.
- `docs/repository-architecture/` contains dated audits, migration decisions, and verification reports.
- The append-only [decision log](DECISIONS.md) and release records stay at their established paths. The 1.0 set includes the [API surface](API-SURFACE-1.0.md), [human checks](HUMAN-CHECKS-1.0.md), [release order](RELEASE-1.0.md), and [merge record](MERGES-1.0.md).

Use `package.json` as the source of truth for runnable command names; this index routes to the relevant procedures instead of copying command lists.

# Documentation guide

Use the package README in `projects/<package>/` for its public setup and API. This guide routes to shared engineering material without copying release history or package examples.

## Find by responsibility

| Need | Canonical location | Status and ownership |
| --- | --- | --- |
| Package APIs and consumer guidance | `projects/<package>/README.md`, `docs/{i18n,menu,select,theme}/` | Current; maintained with the package |
| Architecture policy and workflows | [`engineering/README.md`](engineering/README.md) | Current policy and procedures |
| Durable architecture decisions | [Decision index](decisions/README.md); stable entry point [`DECISIONS.md`](DECISIONS.md) | Append-only records, one file per decision |
| Feature specifications and designs | `projects/<package>/specifications/` plus the [cross-library index](specifications/README.md) | Package-owned records stay with their owners; each record states its status |
| Testing and browser evidence | [`testing/README.md`](testing/README.md) | Testing procedures plus dated verification evidence |
| Release history | [`releases/1.0/README.md`](releases/1.0/README.md) | Historical 1.0 RC records; refresh against current source before operational use |
| Planned 1.1 release | [`releases/1.1/README.md`](releases/1.1/README.md) | Five-package release runbook; planned only, owner decisions remain |
| Research | [`research/theme-stacks.md`](research/theme-stacks.md) | Dated investigation, not normative API guidance |
| Repository architecture history | [`repository-architecture/README.md`](repository-architecture/README.md) | Index to archived audits and task reports |
| Historical audits, proofs, and reports | [`archive/README.md`](archive/README.md) | Dated evidence snapshots, not current policy |
| Skills and agent workflows | [`engineering/SKILLS-INVENTORY.md`](engineering/SKILLS-INVENTORY.md), [`engineering/SKILLS-ROUTING.md`](engineering/SKILLS-ROUTING.md) | Current routing; version-specific claims follow `engineering/AI-SKILLS.md` |
| Task and package README templates | `docs/engineering/templates/`, [`releases/1.0/README-TEMPLATE.md`](releases/1.0/README-TEMPLATE.md) | Reusable process templates and historical S9 package template |

The dated JSON baselines in [`a11y-snapshots/`](a11y-snapshots/) are retained test evidence linked by the accessibility guide and decision history.

## Former paths

Use the canonical locations in the table above. Former root paths were removed
after active repository links were updated; historical path mentions in the
append-only decision log describe the records as they existed at the time.

Use root `package.json` as the source of truth for command names. Do not infer current registry state from a historical release record; inspect the registry and exact tag when preparing a release.

# Documentation guide

Use the package README in `projects/<package>/` for its public setup and API. This guide routes to shared engineering material without copying release history or package examples.

## Find by responsibility

| Need | Canonical location | Status and ownership |
| --- | --- | --- |
| Package APIs and consumer guidance | `projects/<package>/README.md`, `docs/{i18n,menu,select,theme}/` | Current; maintained with the package |
| Architecture policy and workflows | [`engineering/README.md`](engineering/README.md) | Current policy and procedures |
| Durable architecture decisions | [`DECISIONS.md`](DECISIONS.md) | Append-only decision history; never rewrite old entries |
| Feature specifications and designs | `projects/<package>/specifications/` plus the [cross-library index](specifications/README.md) | Package-owned records stay with their owners; each record states its status |
| Testing and browser evidence | [`testing/README.md`](testing/README.md) | Testing procedures plus dated verification evidence |
| Release history | [`releases/1.0/README.md`](releases/1.0/README.md) | Historical 1.0 RC records; refresh against current source before operational use |
| Research | [`research/theme-stacks.md`](research/theme-stacks.md) | Dated investigation, not normative API guidance |
| Repository audits and migration history | [`repository-architecture/README.md`](repository-architecture/README.md) | Historical snapshots; root policy and engineering docs remain authoritative |
| Skills and agent workflows | [`engineering/SKILLS-INVENTORY.md`](engineering/SKILLS-INVENTORY.md), [`engineering/SKILLS-ROUTING.md`](engineering/SKILLS-ROUTING.md) | Current routing; version-specific claims follow `engineering/AI-SKILLS.md` |
| Task and package README templates | `docs/engineering/templates/`, [`releases/1.0/README-TEMPLATE.md`](releases/1.0/README-TEMPLATE.md) | Reusable process templates and historical S9 package template |

The dated JSON baselines in [`a11y-snapshots/`](a11y-snapshots/) are retained test evidence linked by the accessibility guide and decision history.

## Compatibility paths

Short pointer files remain at selected former root paths so package docs,
append-only decisions, and existing external links keep resolving. Use the
canonical locations in the table above for new links; the pointer files do not
duplicate the documents.

Use root `package.json` as the source of truth for command names. Do not infer current registry state from a historical release record; inspect the registry and exact tag when preparing a release.

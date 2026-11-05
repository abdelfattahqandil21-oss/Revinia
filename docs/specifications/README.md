# Specifications and design records

These documents describe proposed or implemented behavior. Their status lines are authoritative for whether work is approved, pending, or complete. Accepted durable architecture decisions belong in [`../DECISIONS.md`](../DECISIONS.md); this collection does not replace that append-only log.

| Record | Scope | Status |
| --- | --- | --- |
| [i18n select entry point](../../projects/i18n/specifications/i18n-select.md) | `@rivinia/i18n/select` package boundary | Approved for implementation |
| [Menu projected content](../../projects/menu/specifications/menu-projected-content.md) | Menu panel projection contract | Implemented |
| [Menu usage and display](../../projects/menu/specifications/menu-usage-display.md) | Menu usage/display behavior | Implemented |
| [Select multi-summary](../../projects/select/specifications/select-multi-summary.md) | Summary and width contract | Final review pending |
| [Select ownership](../../projects/select/specifications/select-ownership.md) | Controller ownership and shared instances | Implemented |
| [Select variants](../../projects/select/specifications/select-variants.md) | `simple` and `premium` appearance | Approved for implementation |
| [Table design](../../projects/table/specifications/table-design.md) | Table package design proposal | Proposal; no package or source implementation |
| [Table spans and size](../../projects/table/specifications/table-spans-and-size.md) | Span behavior and size measurements | Design companion to table proposal |

Package-owned specifications live with their libraries under `projects/<package>/specifications/`. This index is a cross-library map.

The [`1.0 readiness record`](1.0-readiness.md) tracks release preparation rather than a package feature specification.

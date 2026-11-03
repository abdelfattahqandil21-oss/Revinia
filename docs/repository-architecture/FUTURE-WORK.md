# Future Work

## Before changing repository structure

- Review `REPOSITORY-AUDIT.md` and the newer `docs/engineering/RFC-ENGINEERING-GOVERNANCE.md`; settle its open policy decisions before structural migration.
- Make popup mutation control build its demo prerequisite before the clean baseline, then run the complete mutation suite from empty and stale `dist` states.
- Move schematic compilation output out of tracked source in a separately reviewed change, preserving exact package contents.
- Convert package documentation links from `main` to exact release-tag references in the next unpublished package versions; legacy rc.2 artifacts remain immutable.

## Follow-up architecture work

- Add reviewed API snapshots for packages outside the four-package 1.0 scope.
- Decide whether root release documentation follows npm `latest` or workspace versions; if registry-following, add a read-only drift report.
- Select an authoritative CI environment and mirror the required local gates there.
- Run a production Angular build in a disposable clean consumer using the exact packed tarballs.
- Add E2E coverage for datepicker and table only if product behavior and browser support requirements justify it.

## Product decisions

- Select alias group and menu item type/directive naming remain **REQUIRES PRODUCT DECISION** per the release runbook.
- Explicitly decide the four pnpm build-script approvals; do not infer these from successful local builds.

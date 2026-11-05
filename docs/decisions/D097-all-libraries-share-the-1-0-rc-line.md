## 2026-11-05 — D97: all Rivinia libraries share the 1.0 RC line

**Status:** Owner-approved for local RC preparation  
**Date:** 2026-11-05  
**Area:** Release / Packages

## Decision

Prepare one synchronized `rivinia-1.0` release candidate containing all eleven publishable packages at `1.0.0-rc.5`: popup, theme, select, menu, i18n, datepicker, env, http, toast, modal and table. This is a local candidate only. It does not authorize npm publication, tags, push or merge.

## Rationale and package boundaries

The original dependency chain remains explicit: select and menu have a regular runtime dependency on popup; i18n has an optional select peer; theme is independent. The remaining six packages do not acquire runtime dependencies on each other. The owner approved synchronizing them anyway so one clean tarball consumer lab, one RC compatibility matrix and one coordinated rollback point exercise the complete library ecosystem together. Membership does not erase package ownership or imply new source imports.

## Compatibility and ranges

The five existing 1.0 packages advance together from `1.0.0-rc.4` to `1.0.0-rc.5`. The former 0.x packages enter the 1.0 prerelease line as the coordinated candidate; no 0.x compatibility promise is retained by this decision. Select and menu retain `@rivinia/popup` as a regular dependency at `^1.0.0-rc.5`. i18n retains select as an optional peer with a range that accepts the 1.0 RC line.

## Gates and rollback

Admission requires package builds and unit tests, the exact packed archive and versioned documentation check for every package, `check:pack`, theme package checks, all documented public imports in a clean consumer, production browser and SSR builds, and the external lab's Playwright route/guard/table checks. A package that misses a gate blocks the whole synchronized candidate. A candidate is corrected locally before approval; after any future publication, immutable versions are fixed forward with a new version and bad versions may be deprecated.

## Owner approval

The owner explicitly requested that every library join the RC group after the all-library audit and supplied the strict `getRowId` identity contract for table. This record captures that approval. Registry access, exact npm publish approval and tags remain separate release actions.

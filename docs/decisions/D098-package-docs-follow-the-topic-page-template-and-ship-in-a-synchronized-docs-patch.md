## 2026-11-06 — D98: package consumer docs follow the topic-page template; docs ship in a synchronized patch

**Status:** Owner-approved for local 1.0.1 preparation; publication, tags, push, and merge remain unauthorized  
**Date:** 2026-11-06  
**Area:** Documentation / Release

## Decision

The six packages that lacked consumer topic folders (`datepicker`, `env`, `http`, `modal`, `table`, and `toast`) follow the README structure in the 1.0 S9 template. Their READMEs stay under 200 lines, retain a working usage example, and link to consumer-focused pages under `docs/<package>/`. `@rivinia/env` keeps its concise selected-environment and public-API guidance in the README; detailed schematic setup lives in `docs/env/scaffolding.md`.

Every new topic page has a short purpose statement and a link back to its package README. Each README's “Go further” table uses absolute GitHub links pinned to that package's `v1.0.1` tag. Theme guidance remains shared under `docs/theme/`; package docs retain their own token reference when present and link to the shared theme guide.

This is the first stable documentation correction. New READMEs and topic pages contain no 0.x migration or upgrade guides. Historical package `CHANGELOG.md` entries remain unchanged. Pre-1.0 version scope and unpublished-status statements are rewritten as timeless scope and limits, without adding feature claims.

All eleven packages in `rivinia-1.0` advance together from `1.0.0` to a docs-only `1.0.1`. The published `1.0.0` archives remain immutable; no version is altered after publication. This decision authorizes only local candidate preparation. It does not authorize merging to `main`, pushing, creating tags, changing npm dist-tags, or publishing.

## Consequences

- All eleven package READMEs use the shared 200-line hard cap.
- Package ownership remains unchanged; code and package boundaries are not affected.
- Select and Menu continue to depend on Popup at `^1.0.0`, which accepts Popup `1.0.1`; i18n's optional Select peer must also accept `1.0.1`. `check:governance` validates these compatibility ranges against the synchronized package version.
- Release candidates must pass the package build, unit, docs, governance, pack, exact-tarball, and clean-consumer gates before owner approval.
- Human review must open each new page on GitHub once to verify rendering. Existing screen-reader, real-device, and native Safari checks remain tracked by the stable release checklist.

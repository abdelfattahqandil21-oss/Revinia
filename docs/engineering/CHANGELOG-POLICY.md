# Changelog policy

**Owner:** Package maintainers and repository maintainers
**Purpose:** keep consumer release history distinct from engineering and agent activity.
**Status:** active for new changes; historical entries remain intact.

## Three records

### Package CHANGELOG

`projects/<package>/CHANGELOG.md` records only user-visible changes shipped in that package version: Added, Changed, Fixed, Deprecated, Removed, and Security where relevant. An entry names the actual release and is backed by that release's tests/artifact. Do not write an entry for a planned or unreleased behavior as if shipped. Do not rewrite a published version's changelog artifact; add a later release entry instead.

### Repository engineering changelog

`docs/engineering/CHANGELOG.md` records durable repository architecture, tooling, documentation and developer workflow outcomes. It is not semver history for an npm package. Link its RFC/decision and verification evidence. Use actual dates; avoid copying private task steps.

### Agent task journal

Detailed changed paths, decisions, commands/results, blockers and handoffs belong in the private task record under `$HOME/.local/share/rivinia/tasks/`. Only sanitized public-safe summaries may be committed. Never put secrets, personal information, internal logs or credentials in public records.

## Release process

For each candidate, prepare the package changelog alongside the reviewed change, run the package's relevant gates, and have a maintainer approve wording/version. Before publishing, verify the changelog file is in the exact packed tarball and the entry matches the tested API/artifact. For every member of the synchronized release group in `release-groups.json`, consider its changelog for the same shared release; record “no consumer-visible change” when appropriate rather than inventing one. Release finalization updates changelog, version, README version line and release evidence together in a reviewed change. Publishing/tagging remains separately approved.

The current rc.2 artifacts predate this policy and do not all have an rc.2 heading. Treat that as historical release-process debt; do not edit already-published artifacts. Future new releases should follow this policy.

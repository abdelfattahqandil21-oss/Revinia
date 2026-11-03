# Version-aware AI skills

**Owner:** Rivinia maintainers
**Purpose:** keep consumer and maintainer instructions aligned with package APIs actually available.
**Status:** schema and local metadata validation implemented; no consumer-facing package skill is currently shipped.

## Roles

- **Consumer skill:** identify the exact installed package version first, then load only instructions whose declared compatibility range includes it. If installed version is missing, ambiguous, or unsupported, request/resolve package context before suggesting package APIs.
- **Maintainer skill:** identify owned packages, release-group membership, current support claims, exact verified versions, public API/compatibility rules, package tests, docs/changelog duties and release gates. It must distinguish a policy claim from an executed verification.
- **General-purpose skill:** no package compatibility claim. It does not need package/version metadata; the validator classifies a skill without a `role` as general, or accepts explicit `metadata.role: general`.

## Metadata contract

Package-aware skills declare an adjacent `.opencode/skills/<skill>/compatibility.json`
or `.agents/skills/<skill>/compatibility.json`. The existing `SKILL.md`
frontmatter uses `metadata.role` and, for maintainers, `metadata.package_scope`.
Optional `supported_ranges_ref`, `documentation_refs`, and `verification_refs`
values are repository-relative file paths and are checked for existence.
Consumer skills require the sidecar; repository-wide maintainer skills do not
unless they make package-specific claims. General-purpose skills do not need a
sidecar.

```json
{
  "role": "consumer",
  "packages": [{
    "name": "@rivinia/menu",
    "release_group": "rivinia-1.0",
    "supported_ranges": ["^1.0.0"],
    "verified_versions": ["1.0.0"],
    "compatibility_boundary": { "major": 1 },
    "documentation": {
      "canonical_source": "projects/menu/README.md",
      "release_references": { "1.0.0": "menu/v1.0.0" }
    },
    "evidence": [{ "version": "1.0.0", "ref": "docs/engineering/TESTING-ARCHITECTURE.md" }],
    "capabilities": [{
      "name": "exampleCapability",
      "introduced": "1.0.0",
      "verified_versions": ["1.0.0"]
    }]
  }]
}
```

`check:skills` validates package identity, strict exact SemVer, supported range
syntax (`*` and partial versions are intentionally unsupported), verified
versions inside declared ranges, release-group identity, major compatibility
boundaries, tag-shaped documentation references, existing canonical/evidence
files, optional skill-frontmatter references to versioning/documentation/
verification policy files, and feature introduction versions. It does not
check that a referenced Git tag exists or that an evidence file proves a gate
passed. Supported range operators are exact, `^`, `~`, `<`, `<=`, `>`, `>=`,
whitespace intersection, and `||` union. `check:governance` runs the same
check. Never treat `supported_ranges` and `verified_versions` as synonyms.
Feature availability is keyed by introduction version, not only major.

Metadata validation checks declarations and traceability only. It does not prove that package APIs or examples work. To verify examples against a published version, build the package, install that exact published tarball into a clean Angular consumer, compile the documented public imports, and run a production consumer build. Run browser examples in the stated real browser and report those gates separately. Record the exact package version, toolchain and artifact hash in the evidence record. Do not infer semantic compatibility from a passing metadata check.

## Consumer version selection procedure

1. Identify package names from the task/imports.
2. Read the consumer lockfile and `npm ls <package> --json` (or the active manager's equivalent) to find the exact installed version. Do not infer it from package README, a version range, root `latest`, or the workspace manifest.
3. Match that exact version against the skill's approved support range. If no range matches, stop before presenting APIs as compatible; use package docs from the exact release tag or report that guidance is unavailable.
4. Filter capabilities by `introduced` version and the exact versions actually verified. Label unverified inferences as such.
5. Link to the exact-version docs reference, not `main`.

Use existing package-manager and Node tooling; do not add a semver dependency solely for skill selection. When exact range matching cannot be verified from available tooling, ask a maintainer or state the uncertainty rather than guessing.

## Maintainer checklist

Before package changes, read ownership and API boundaries. For a member of the unified group, check all four package manifests and coordinate the shared version. For an independent package, preserve independent versioning. Compare public API snapshots; test package source, browser/integration contracts, packed tarball and clean consumer; update exact-version docs and package changelog; record command outputs and hashes. A release action remains separately owner-approved.

## Runtime discovery

The repository stores its two Rivinia skills under `.agents/skills/`. Codex discovers repository skills in this path; OpenCode also searches it as an agent-compatible project path. Both read `SKILL.md` metadata for discovery and load the body on demand. Explicitly invoke with `$rivinia-playbook` in Codex or the native OpenCode `skill` tool using ID `rivinia-playbook`. The release skill is explicit-only in both runtimes; invoke it by the same method with ID `rivinia-release`. Do not duplicate skill bodies under `.opencode/skills/`; see the [inventory](SKILLS-INVENTORY.md), [matrix](SKILLS-REFERENCE-MATRIX.md), and [routing guide](SKILLS-ROUTING.md).

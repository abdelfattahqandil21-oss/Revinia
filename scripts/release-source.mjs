const releaseProcedurePaths = new Set([
  '.github/workflows/publish.yml',
  'docs/releases/1.0/GITHUB-PUBLISHING.md',
  'scripts/prepare-release.mjs',
  'scripts/publish-release.mjs',
  'scripts/publish-registry-verification.mjs',
  'scripts/release-source.mjs',
  'scripts/tests/publish-registry-verification.spec.ts',
  'scripts/tests/release-source.spec.ts',
]);

/** Keep a release's package tree pinned to its tags while allowing release-tool fixes on main. */
export function assertReleaseSource({ headCommit, tagCommits, changedPaths, isAncestor }) {
  if (tagCommits.length === 0 || new Set(tagCommits).size !== 1) {
    throw new Error('All package release tags must resolve to the same source commit');
  }
  const sourceCommit = tagCommits[0];
  if (!isAncestor) throw new Error(`Release source ${sourceCommit} must be an ancestor of main ${headCommit}`);
  const unexpected = changedPaths.filter((path) => !releaseProcedurePaths.has(path));
  if (unexpected.length) {
    throw new Error(`Package/build inputs changed after the release tags: ${unexpected.join(', ')}`);
  }
  return sourceCommit;
}

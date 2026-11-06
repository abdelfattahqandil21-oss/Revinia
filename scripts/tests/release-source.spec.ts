import { describe, expect, it } from 'vitest';
import { assertReleaseSource } from '../release-source.mjs';

describe('release source validation', () => {
  const source = 'release-commit';
  const head = 'main-commit';

  it('allows release tooling updates on main when all tags remain on one ancestor', () => {
    expect(assertReleaseSource({
      headCommit: head,
      tagCommits: [source, source],
      changedPaths: ['scripts/publish-release.mjs'],
      isAncestor: true,
    })).toBe(source);
  });

  it('rejects tags that disagree or do not resolve to main history', () => {
    expect(() => assertReleaseSource({ headCommit: head, tagCommits: [source, 'other'], changedPaths: [], isAncestor: true }))
      .toThrow('All package release tags must resolve to the same source commit');
    expect(() => assertReleaseSource({ headCommit: head, tagCommits: [source], changedPaths: [], isAncestor: false }))
      .toThrow('must be an ancestor of main');
  });

  it('rejects any package or build input changed after tagging', () => {
    expect(() => assertReleaseSource({
      headCommit: head,
      tagCommits: [source],
      changedPaths: ['projects/popup/package.json'],
      isAncestor: true,
    })).toThrow('Package/build inputs changed after the release tags');
  });
});

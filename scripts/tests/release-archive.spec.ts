import { describe, expect, it } from 'vitest';
import { isAllowedRuntimeImport } from '../release-archive.mjs';

describe('release archive runtime imports', () => {
  const packageName = '@rivinia/select';
  const dependencies = new Set(['@angular/core', '@rivinia/popup']);

  it('allows self-imports used between a package and its secondary entry points', () => {
    expect(isAllowedRuntimeImport(packageName, packageName, dependencies)).toBe(true);
    expect(isAllowedRuntimeImport(`${packageName}/ui`, packageName, dependencies)).toBe(true);
  });

  it('allows declared dependencies and their subpaths', () => {
    expect(isAllowedRuntimeImport('@angular/core', packageName, dependencies)).toBe(true);
    expect(isAllowedRuntimeImport('@rivinia/popup/core', packageName, dependencies)).toBe(true);
  });

  it('rejects undeclared dependencies and tslib', () => {
    expect(isAllowedRuntimeImport('not-declared', packageName, dependencies)).toBe(false);
    expect(isAllowedRuntimeImport('tslib', packageName, dependencies)).toBe(false);
    expect(isAllowedRuntimeImport('tslib/helpers', packageName, dependencies)).toBe(false);
  });
});

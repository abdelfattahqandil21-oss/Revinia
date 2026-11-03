import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkReadme, LINE_BUDGET, readManifest } from '../check-readmes.mjs';

/**
 * Two README rules are mechanical and fail the build:
 *  1. a package README must stay within the line budget (temporary per-package
 *     allowances exist until the content move lands);
 *  2. a version claim about the package must equal its manifest version.
 * Relative links must resolve inside the repository so shipped READMEs do not
 * point consumers at missing docs.
 */

const MANIFEST = { name: '@rivinia/select', version: '0.7.1' };

function readme(text: string, allowOverBudget = false) {
  return checkReadme({
    pkg: 'select',
    text,
    manifest: MANIFEST,
    allowOverBudget,
    fileExists: (path: string) => path === '/repo/docs/api.md',
  });
}

const lines = (count: number) => Array.from({ length: count }, () => 'text').join('\n');

describe('line budget', () => {
  it(`fails a README longer than ${LINE_BUDGET} lines`, () => {
    const report = readme(lines(LINE_BUDGET + 1));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(new RegExp(`${LINE_BUDGET + 1} lines`));
  });

  it('passes a README at the budget', () => {
    expect(readme(lines(LINE_BUDGET)).problems).toEqual([]);
  });

  it('lets an allowlisted package exceed the budget, with a warning', () => {
    const report = readme(lines(LINE_BUDGET + 40), true);
    expect(report.problems).toEqual([]);
    expect(report.warnings.join('\n')).toMatch(/allow/);
  });
});

describe('version claims', () => {
  it('fails when the package version line disagrees with the manifest', () => {
    const report = readme('# select\n\n- Package version: **0.6.0**\n');
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(/0\.6\.0.*0\.7\.1|0\.7\.1.*0\.6\.0/);
  });

  it('passes when the version line matches', () => {
    expect(readme('- Package version: **0.7.1**\n').problems).toEqual([]);
  });

  it('checks a shields badge version', () => {
    const report = readme(
      '[![v](https://img.shields.io/badge/version-0.6.0-blue)](https://example.test)\n',
    );
    expect(report.problems.join('\n')).toMatch(/0\.6\.0/);
  });

  it('ignores Angular and tool versions in prose', () => {
    const report = readme('Requires Angular `^22.0.0`; built with TypeScript 6.0.3.\n');
    expect(report.problems).toEqual([]);
  });

  // The 1.0 rc steps ship `1.0.0-rc.1`, so a pattern that stops at the patch
  // number would fail an ACCURATE README and pass a stale one.
  const prerelease = (text: string) =>
    checkReadme({
      pkg: 'theme',
      text,
      manifest: { name: '@rivinia/theme', version: '1.0.0-rc.1' },
      allowOverBudget: true,
    });

  it('accepts a prerelease version line that matches the manifest', () => {
    expect(prerelease('- Package version: **1.0.0-rc.1**\n').problems).toEqual([]);
  });

  it('accepts the shields double-hyphen form of a prerelease', () => {
    const text =
      '[![v](https://img.shields.io/badge/version-1.0.0--rc.1-blue)](https://example.test)\n';
    expect(prerelease(text).problems).toEqual([]);
  });

  it('fails when a prerelease claim disagrees with the manifest', () => {
    const report = prerelease('- Package version: **1.0.0-rc.2**\n');
    expect(report.problems.join('\n')).toMatch(/1\.0\.0-rc\.2/);
  });

  // A stale final version must not slip past a prerelease manifest.
  it('fails when a final version is claimed against a prerelease manifest', () => {
    const report = prerelease('- Package version: **1.0.0**\n');
    expect(report.problems.join('\n')).toMatch(/claims version 1\.0\.0\b/);
  });

  // No colour token means the trailing `rc` belongs to the version; a
  // heuristic that drops any alphabetic tail turns this accurate badge red.
  it('does not eat a prerelease suffix as a badge colour', () => {
    const report = checkReadme({
      pkg: 'theme',
      text: '[![v](https://img.shields.io/badge/version-1.0.0--rc)](x)\n',
      manifest: { name: '@rivinia/theme', version: '1.0.0-rc' },
      allowOverBudget: true,
    });
    expect(report.problems).toEqual([]);
  });

  it('accepts a badge that prefixes the version with v', () => {
    const text = '[![v](https://img.shields.io/badge/npm-v1.0.0--rc.1-blue)](x)\n';
    expect(prerelease(text).problems).toEqual([]);
  });
});

describe('link report', () => {
  it('fails when a relative link target is missing', () => {
    const report = readme('See [api](./docs/api.md) and [forms](./docs/forms.md).\n');
    expect(report.problems.join('\n')).toMatch(/docs\/forms\.md/);
    expect(report.warnings).toEqual([]);
  });

  it('resolves a link that exists', () => {
    const report = checkReadme({
      pkg: 'select',
      text: 'See [api](/repo/docs/api.md).\n',
      manifest: MANIFEST,
      allowOverBudget: false,
      fileExists: (path: string) => path === '/repo/docs/api.md',
    });
    expect(report.warnings).toEqual([]);
  });

  it('ignores absolute, anchor and mail links', () => {
    const report = readme(
      '[npm](https://www.npmjs.com/package/@rivinia/select) [top](#install) [mail](mailto:a@b.c)\n',
    );
    expect(report.warnings).toEqual([]);
  });
});

describe('readManifest', () => {
  // A gate that dies with a SyntaxError hides which file is broken.
  it('names a manifest that is not valid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rv-readme-'));
    try {
      const path = join(dir, 'package.json');
      writeFileSync(path, '{ "version": ');
      expect(readManifest(path).error).toMatch(/not valid JSON/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a manifest without a version string', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rv-readme-'));
    try {
      const path = join(dir, 'package.json');
      writeFileSync(path, '{"name":"@rivinia/probe"}');
      expect(readManifest(path).error).toMatch(/no version/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns a well-formed manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rv-readme-'));
    try {
      const path = join(dir, 'package.json');
      writeFileSync(path, '{"name":"@rivinia/probe","version":"1.0.0-rc.1"}');
      expect(readManifest(path)).toEqual({ name: '@rivinia/probe', version: '1.0.0-rc.1' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { describe, expect, it } from 'vitest';
import { checkReadme, LINE_BUDGET } from '../check-readmes.mjs';

/**
 * Two README rules are mechanical and fail the build:
 *  1. a package README must stay within the line budget (temporary per-package
 *     allowances exist until the content move lands);
 *  2. a version claim about the package must equal its manifest version.
 * Relative links are reported, not enforced: the docs move is still in flight.
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
});

describe('link report', () => {
  it('warns, but does not fail, when a relative link target is missing', () => {
    const report = readme('See [api](./docs/api.md) and [forms](./docs/forms.md).\n');
    expect(report.problems).toEqual([]);
    expect(report.warnings.join('\n')).toMatch(/docs\/forms\.md/);
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

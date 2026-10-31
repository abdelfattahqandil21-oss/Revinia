import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { auditPackage, checkPackage, packDryRun } from '../check-pack.mjs';

/**
 * The pack gate answers one question: does the tarball a consumer installs
 * still carry the metadata npm and the README rely on? Each case is a
 * synthetic packed file list, so a unit test never needs a build.
 */

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix = 'rv-pack-'): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

const MANIFEST = {
  name: '@rivinia/select',
  version: '0.7.1',
  repository: {
    type: 'git',
    url: 'git+https://github.com/abdelfattahqandil21-oss/Revinia.git',
    directory: 'projects/select',
  },
  homepage: 'https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/projects/select#readme',
  bugs: { url: 'https://github.com/abdelfattahqandil21-oss/Revinia/issues' },
  engines: { node: '^22.22.3 || ^24.15.0 || >=26.0.0' },
  exports: {
    './package.json': { default: './package.json' },
    '.': { types: './types/rivinia-select.d.ts', default: './fesm2022/rivinia-select.mjs' },
    './ui': { types: './types/rivinia-select-ui.d.ts', default: './fesm2022/rivinia-select-ui.mjs' },
  },
};

const FILES = [
  'CHANGELOG.md',
  'README.md',
  'fesm2022/rivinia-select.mjs',
  'fesm2022/rivinia-select-ui.mjs',
  'package.json',
  'types/rivinia-select-ui.d.ts',
  'types/rivinia-select.d.ts',
];

function audit(overrides: {
  manifest?: unknown;
  files?: string[];
  dir?: string;
  expectedEngines?: string | null;
} = {}) {
  return auditPackage({
    dir: overrides.dir ?? join('/repo', 'dist', 'select'),
    manifest: 'manifest' in overrides ? overrides.manifest : MANIFEST,
    files: overrides.files ?? FILES,
    expectedEngines: overrides.expectedEngines,
  });
}

describe('auditPackage', () => {
  it('passes a complete package', () => {
    const report = audit();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.files).toEqual(FILES);
  });

  it('fails when README.md is not shipped', () => {
    const report = audit({ files: FILES.filter((file) => file !== 'README.md') });
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(/README\.md/);
  });

  it('fails when CHANGELOG.md is not shipped', () => {
    const report = audit({ files: FILES.filter((file) => file !== 'CHANGELOG.md') });
    expect(report.problems.join('\n')).toMatch(/CHANGELOG\.md/);
  });

  it('fails when repository is missing', () => {
    const { repository, ...rest } = MANIFEST;
    const report = audit({ manifest: rest });
    expect(report.problems.join('\n')).toMatch(/repository/);
  });

  it('fails when repository.directory does not match the package location', () => {
    const report = audit({
      manifest: { ...MANIFEST, repository: { ...MANIFEST.repository, directory: 'projects/menu' } },
    });
    expect(report.problems.join('\n')).toMatch(/repository\.directory is "projects\/menu"/);
  });

  // npm accepts the string form, but it carries no `directory`, so a tarball
  // built from it links to the monorepo root instead of the package page.
  it('fails when repository is written as a bare string', () => {
    const report = audit({
      manifest: { ...MANIFEST, repository: 'git+https://github.com/o/r.git' },
    });
    expect(report.problems.join('\n')).toMatch(/repository.*directory/);
  });

  it('fails when homepage or bugs is missing', () => {
    const { homepage, bugs, ...rest } = MANIFEST;
    expect(audit({ manifest: rest }).problems.join('\n')).toMatch(/homepage/);
    expect(audit({ manifest: { ...MANIFEST, bugs: undefined } }).problems.join('\n')).toMatch(/bugs/);
  });

  it('fails when engines.node is missing', () => {
    const { engines, ...rest } = MANIFEST;
    expect(audit({ manifest: rest }).problems.join('\n')).toMatch(/engines\.node/);
  });

  // Presence alone lets a loosened range through, while RELEASE-1.0.md says
  // `engines.node` mirrors Angular 22 exactly. Compare when told what to expect.
  it('fails when engines.node does not mirror @angular/core', () => {
    const report = audit({ expectedEngines: '^22.22.3 || ^24.15.0 || >=26.0.0' });
    expect(report.problems).toEqual([]);

    const loosened = audit({
      manifest: { ...MANIFEST, engines: { node: '>=18' } },
      expectedEngines: '^22.22.3 || ^24.15.0 || >=26.0.0',
    });
    expect(loosened.problems.join('\n')).toMatch(/engines\.node is ">=18"/);
  });

  it('fails when an export target is not in the tarball', () => {
    const report = audit({ files: FILES.filter((file) => file !== 'fesm2022/rivinia-select-ui.mjs') });
    expect(report.problems.join('\n')).toMatch(/rivinia-select-ui\.mjs/);
  });

  it('fails when package.json is absent from the packed files', () => {
    const report = audit({ files: FILES.filter((file) => file !== 'package.json') });
    expect(report.problems.join('\n')).toMatch(/package\.json/);
  });
});

describe('checkPackage', () => {
  // A malformed manifest used to surface as a pile of "repository is missing"
  // problems; the real cause was the parse error, which nobody saw.
  it('reports a package.json that is not valid JSON', () => {
    const dir = tempDir('rv-pack-json-');
    writeFileSync(join(dir, 'package.json'), '{ "name": ');
    const report = checkPackage(dir);
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(/not valid JSON/);
  });

  it('reports a directory without a package.json', () => {
    const report = checkPackage(tempDir('rv-pack-empty-'));
    expect(report.problems.join('\n')).toMatch(/does not exist/);
  });
});

describe('packDryRun', () => {
  it('returns the files npm would ship, README included', () => {
    const dir = tempDir('rv-pack-real-');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@rivinia/probe', version: '0.0.0' }));
    writeFileSync(join(dir, '.npmignore'), 'ignored.txt\n');
    writeFileSync(join(dir, 'README.md'), '# probe\n');
    writeFileSync(join(dir, 'ignored.txt'), 'not shipped\n');
    mkdirSync(join(dir, 'lib'));
    writeFileSync(join(dir, 'lib', 'index.js'), 'export {};\n');

    const { files } = packDryRun(dir);
    expect(files).toContain('README.md');
    expect(files).toContain('lib/index.js');
    expect(files).not.toContain('ignored.txt');
  }, 30000);

  it('refuses to inspect a directory that does not exist', () => {
    expect(() => packDryRun(join(tempDir(), 'missing'))).toThrow(/does not exist/);
  });
});

describe('check-pack CLI', () => {
  it('exits 1 and prints one FAIL line per problem', () => {
    const dir = tempDir('rv-pack-cli-');
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@rivinia/probe', version: '0.0.0' }));
    writeFileSync(join(dir, 'README.md'), '# probe\n');
    const result = spawnSync(process.execPath, ['scripts/check-pack.mjs', dir], {
      cwd: new URL('../../', import.meta.url).pathname,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/FAIL/);
    expect(result.stdout).toMatch(/README\.md/);
  }, 30000);
});

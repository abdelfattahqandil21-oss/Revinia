import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { checkThemePackage, EXPECTED_FILES } from '../../../scripts/check-theme-package.mjs';

/**
 * The check runs against SYNTHETIC packages, not `dist/theme`: a unit test must
 * not depend on a build, and each negative case needs a package that the real
 * build would never produce. `pnpm check:theme dist/theme` asserts the real
 * artifact after the build (release gate 3).
 */
const temps: string[] = [];

const ROOT = new URL('../../../', import.meta.url).pathname;

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rv-theme-'));
  temps.push(dir);
  return dir;
}

interface ManifestOptions {
  style?: string | null;
  tailwind?: string | null;
  extraExport?: string | null;
}

function manifest({
  style = './styles/theme.css',
  tailwind = './styles/tailwind.css',
  extraExport = null,
}: ManifestOptions = {}): Record<string, unknown> {
  const root: Record<string, string> = {
    types: './types/rivinia-theme.d.ts',
    default: './fesm2022/rivinia-theme.mjs',
  };
  if (style !== null) root['style'] = style;

  const exportsField: Record<string, unknown> = {
    './package.json': { default: './package.json' },
    '.': root,
    './theme.css': './styles/theme.css',
    ...(tailwind === null ? {} : { './tailwind.css': tailwind }),
    './bootstrap.css': './styles/bootstrap.css',
    './scss': './styles/_index.scss',
  };
  if (extraExport !== null) exportsField['./missing.css'] = extraExport;

  return {
    name: '@rivinia/theme',
    version: '0.1.0',
    type: 'module',
    sideEffects: ['**/*.css', '**/*.scss'],
    exports: exportsField,
  };
}

const LAYERED_CSS = `@layer rivinia-theme {
  :root {
    --rv-bg: #ffffff;
  }
}
`;

function packageFiles(options: ManifestOptions = {}): Record<string, string> {
  const manifestJson = JSON.stringify(manifest(options), null, 2);
  return {
    'package.json': manifestJson,
    'README.md': '# @rivinia/theme\n',
    'CHANGELOG.md': '# @rivinia/theme\n\n## Unreleased\n',
    'styles/theme.css': LAYERED_CSS,
    'styles/tailwind.css': "@import './theme.css';\n",
    'styles/bootstrap.css': "@import './theme.css';\n",
    'styles/_index.scss': "@use './theme.css';\n",
    'fesm2022/rivinia-theme.mjs': 'export {};\n',
    'types/rivinia-theme.d.ts': 'export {};\n',
  };
}

function makePackage(files: Record<string, string> = packageFiles()): string {
  const dir = tempDir();
  for (const [rel, content] of Object.entries(files)) {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return dir;
}

function makeTarball(files: Record<string, string> = packageFiles()): string {
  const staging = tempDir();
  for (const [rel, content] of Object.entries(files)) {
    const file = join(staging, 'package', rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  const tarball = join(tempDir(), 'rivinia-theme-0.1.0.tgz');
  const tar = spawnSync('tar', ['-czf', tarball, '-C', staging, 'package'], { encoding: 'utf8' });
  expect(tar.status, tar.stderr).toBe(0);
  return tarball;
}

function messages(report: { problems: readonly string[] }): string {
  return report.problems.join('\n');
}

describe('check-theme-package', () => {
  it('accepts a package that matches the contract', () => {
    const report = checkThemePackage(makePackage());
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.files).toEqual([...EXPECTED_FILES].sort());
  });

  it('fails when exports["."].style is removed', () => {
    const report = checkThemePackage(makePackage(packageFiles({ style: null })));
    expect(report.ok).toBe(false);
    expect(messages(report)).toContain('exports["."].style');
  });

  it('fails once when exports["."].style points at a file the package does not contain', () => {
    const report = checkThemePackage(
      makePackage(packageFiles({ style: './styles/not-there.css' })),
    );
    expect(report.ok).toBe(false);
    expect(report.problems).toHaveLength(1);
    expect(messages(report)).toContain('./styles/not-there.css');
  });

  it('fails when any other exports target is absent from the package', () => {
    const files = packageFiles();
    delete files['styles/tailwind.css'];
    const report = checkThemePackage(makePackage(files));
    expect(report.ok).toBe(false);
    expect(messages(report)).toContain('./styles/tailwind.css');
  });

  it('fails when an exports key points at a path the package does not contain', () => {
    const report = checkThemePackage(
      makePackage(packageFiles({ extraExport: './styles/missing.css' })),
    );
    expect(report.ok).toBe(false);
    expect(messages(report)).toContain('./styles/missing.css');
  });

  it('fails when the file list is not exactly the expected set', () => {
    const files = packageFiles();
    delete files['CHANGELOG.md'];
    files['styles/leftover.css'] = ':root {}\n';
    const report = checkThemePackage(makePackage(files));
    expect(report.ok).toBe(false);
    expect(messages(report)).toContain('CHANGELOG.md');
    expect(messages(report)).toContain('styles/leftover.css');
  });

  it('fails when --rv-bg is not declared inside @layer rivinia-theme', () => {
    const files = packageFiles();
    files['styles/theme.css'] = `:root {
  --rv-bg: #ffffff;
}
@layer rivinia-theme {
  :root {
    --rv-fg: #111111;
  }
}
`;
    const report = checkThemePackage(makePackage(files));
    expect(report.ok).toBe(false);
    expect(messages(report)).toMatch(/--rv-bg[\s\S]*@layer rivinia-theme/);
  });

  it('inspects a tarball, prefix and all', () => {
    const report = checkThemePackage(makeTarball());
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('checks the tarball the package script is given', () => {
    const tarball = makeTarball();
    const run = spawnSync('pnpm', ['check:theme', tarball], { cwd: ROOT, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain(`check:theme — ${tarball}`);

    const broken = spawnSync('pnpm', ['check:theme', makeTarball(packageFiles({ style: null }))], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(broken.status).toBe(1);
  });

  it('reports a missing target instead of throwing', () => {
    const report = checkThemePackage(join(tempDir(), 'no-such-dist'));
    expect(report.ok).toBe(false);
    expect(report.files).toEqual([]);
    expect(messages(report)).toContain('does not exist');
  });

  it('exits 0 on a good package and 1 on a broken one', () => {
    const script = new URL('../../../scripts/check-theme-package.mjs', import.meta.url).pathname;
    const good = spawnSync(process.execPath, [script, makePackage()], { encoding: 'utf8' });
    expect(good.status, good.stderr).toBe(0);
    expect(good.stdout).toContain('check:theme — ok');

    const broken = spawnSync(
      process.execPath,
      [script, makePackage(packageFiles({ style: null }))],
      {
        encoding: 'utf8',
      },
    );
    expect(broken.status).toBe(1);
    expect(broken.stderr).toContain('FAIL');
  });
});

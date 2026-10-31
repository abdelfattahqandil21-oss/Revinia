import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The packaging contract for `@rivinia/i18n/select`: the entry point exists,
 * the core stays free of the optional peer, and the published metadata says
 * so. The built FESM proof runs after `pnpm build:i18n`; these checks run in
 * the ordinary unit suite and fail at the source level first.
 */
const ROOT = process.cwd();
const I18N = resolve(ROOT, 'projects/i18n');
const SELECT_SRC = join(I18N, 'select/src');
const SELECT_PUBLIC_API = join(SELECT_SRC, 'public-api.ts');
const README = join(I18N, 'README.md');

function exportedNames(source: string): string[] {
  const names: string[] = [];
  for (const block of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const raw of block[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '');
      if (name.length > 0) {
        names.push(name);
      }
    }
  }
  return names;
}

function typescriptFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...typescriptFiles(path));
    } else if (entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

/** Remove `import type … from '…'` and `export type … from '…'` statements. */
function stripTypeOnly(source: string): string {
  return source
    .replace(/import\s+type\b[^;]*?from\s*['"][^'"]+['"]\s*;/g, '')
    .replace(/export\s+type\b[^;]*?from\s*['"][^'"]+['"]\s*;/g, '');
}

describe('@rivinia/i18n/select — public surface', () => {
  it('exports the component, the mapper and the shared types', () => {
    const names = exportedNames(readFileSync(SELECT_PUBLIC_API, 'utf8'));

    expect(names).toEqual(
      expect.arrayContaining([
        'RiviniaLanguageSelect',
        'languageSelectOptions',
        'LanguageSelectOption',
        'LanguageLike',
        'RiviniaLanguageManager',
      ]),
    );
  });

  it('lists every select export in a README table row that names /select', () => {
    const names = exportedNames(readFileSync(SELECT_PUBLIC_API, 'utf8'));
    // The entry point sits in the table's *second* cell, so the row as a whole
    // is what must name `/select`.
    const rows = readFileSync(README, 'utf8')
      .split('\n')
      .filter((line) => line.trimStart().startsWith('|') && line.includes('`/select`'));

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const listed = rows.some((row) => new RegExp(`\`[^\`]*\\b${name}\\b[^\`]*\``).test(row));
      expect(listed, `${name} has no README row that names /select`).toBe(true);
    }
  });

  it('keeps the core and /ui sources free of @rivinia/select', () => {
    const offenders: string[] = [];
    for (const dir of [join(I18N, 'src'), join(I18N, 'ui/src')]) {
      for (const file of typescriptFiles(dir)) {
        if (/@rivinia\/select/.test(readFileSync(file, 'utf8'))) {
          offenders.push(file);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('imports @rivinia/i18n only as types inside the select entry point', () => {
    const offenders: string[] = [];
    for (const file of typescriptFiles(SELECT_SRC)) {
      const runtime = stripTypeOnly(readFileSync(file, 'utf8'));
      if (/(?:from|import)\s*\(?\s*['"]@rivinia\/i18n(?:\/ui)?['"]/.test(runtime)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('is the only i18n source that imports @rivinia/select/ui at runtime', () => {
    const offenders: string[] = [];
    for (const file of typescriptFiles(SELECT_SRC)) {
      const runtime = stripTypeOnly(readFileSync(file, 'utf8'));
      if (/@rivinia\/select\/ui/.test(runtime) && !file.endsWith('language-select.ts')) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('@rivinia/i18n/select — packaging', () => {
  it('declares @rivinia/select as an optional peer, never a runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(join(I18N, 'package.json'), 'utf8')) as {
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
      dependencies?: Record<string, string>;
    };

    expect(pkg.peerDependencies?.['@rivinia/select']).toBe('^0.7.0');
    expect(pkg.peerDependenciesMeta?.['@rivinia/select']?.optional).toBe(true);
    expect(pkg.dependencies?.['@rivinia/select']).toBeUndefined();
  });

  it('ships a secondary ng-package whose entry file is src/public-api.ts', () => {
    const ngPackage = JSON.parse(readFileSync(join(I18N, 'select/ng-package.json'), 'utf8')) as {
      lib?: { entryFile?: string };
      dest?: string;
    };

    expect(ngPackage.lib?.entryFile).toBe('src/public-api.ts');
    expect(ngPackage.dest).toBeUndefined();
  });

  it('maps @rivinia/i18n/select in the workspace tsconfig', () => {
    const tsconfig = readFileSync(resolve(ROOT, 'tsconfig.json'), 'utf8');

    expect(tsconfig).toMatch(
      /"@rivinia\/i18n\/select"\s*:\s*\[\s*"\.\/dist\/i18n\/select"\s*\]/,
    );
  });

  it('builds select before i18n so the entry point resolves from dist', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['build:i18n']).toContain('build:select');
  });
});

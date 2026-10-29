import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * `import.meta.url` is not a `file:` URL under the Angular unit-test builder, so
 * both files are resolved from the workspace root, where `ng test` runs.
 */
const UI_SRC = resolve(process.cwd(), 'projects/i18n/ui/src');
const PUBLIC_API = join(UI_SRC, 'public-api.ts');
const README = resolve(process.cwd(), 'projects/i18n/README.md');

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

describe('@rivinia/i18n/ui — public surface', () => {
  it('lists every public export in the README tier table', () => {
    const names = exportedNames(readFileSync(PUBLIC_API, 'utf8'));
    const readme = readFileSync(README, 'utf8');

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(readme.includes(name), `${name} is missing from the README tier table`).toBe(true);
    }
  });

  it('imports only types from @rivinia/i18n', () => {
    const offenders: string[] = [];
    for (const file of typescriptFiles(UI_SRC)) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line.includes("from '@rivinia/i18n'")) {
          continue;
        }
        if (!/^\s*import\s+type\b/.test(line)) {
          offenders.push(`${file}: ${line.trim()}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

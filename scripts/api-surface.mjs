/**
 * The published name lists of the four 1.0 packages.
 *
 * S8 freezes the API surface, and a freeze is only real if a later change to it
 * shows up as a diff someone has to explain. `scripts/tests/api-surface.spec.ts`
 * compares what the entry points export today against
 * `scripts/api-surface.snapshot.json`, committed with the freeze.
 *
 * Only the eight `public-api.ts` files are read. They use explicit
 * `export { … }` lists — `grep -c "export \*"` returns 0 for every one of them —
 * so the list below is the whole surface rather than a sample of it. A package
 * that added a star export would have to teach this file what that star means
 * before the snapshot could be trusted, which is the point of the test.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** npm specifier -> the file that publishes it. */
export const ENTRY_POINTS = Object.freeze([
  ['@rivinia/theme', 'projects/theme/src/public-api.ts'],
  ['@rivinia/select', 'projects/select/src/public-api.ts'],
  ['@rivinia/select/ui', 'projects/select/ui/src/public-api.ts'],
  ['@rivinia/menu', 'projects/menu/src/public-api.ts'],
  ['@rivinia/menu/ui', 'projects/menu/ui/src/public-api.ts'],
  ['@rivinia/i18n', 'projects/i18n/src/public-api.ts'],
  ['@rivinia/i18n/ui', 'projects/i18n/ui/src/public-api.ts'],
  ['@rivinia/i18n/select', 'projects/i18n/select/src/public-api.ts'],
]);

export const SNAPSHOT_FILE = join(ROOT, 'scripts', 'api-surface.snapshot.json');

/** `//` and `/* … *​/` comments never publish a name. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * The name a consumer writes when importing this entry point: for
 * `export { computeSelectPopupPosition as computeSelectPosition }` that is the
 * alias, not the internal name.
 *
 * @param {string} source contents of one `public-api.ts`
 * @returns {string[]} published names, sorted and deduplicated
 */
export function publishedNames(source) {
  const names = new Set();
  const src = withoutComments(source);

  for (const block of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const raw of block[1].split(',')) {
      const part = raw.replace(/^\s*type\s+/, '').trim();
      if (!part) continue;
      const published = part
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(published)) names.add(published);
    }
  }

  for (const direct of src.matchAll(
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:default\s+)?(?:const|let|class|function|enum|interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
  )) {
    names.add(direct[1]);
  }

  return [...names].sort();
}

/**
 * @returns {{ [specifier: string]: string[] }} published names per entry point
 */
export function currentSurface(root = ROOT) {
  const surface = {};
  for (const [specifier, relative] of ENTRY_POINTS) {
    surface[specifier] = publishedNames(readFileSync(resolve(root, relative), 'utf8'));
  }
  return surface;
}

export function committedSnapshot(path = SNAPSHOT_FILE) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** A rename, an addition or a deletion, phrased for a person reading a failure. */
export function diffSurface(committed, current) {
  const problems = [];
  for (const specifier of Object.keys(current)) {
    const before = new Set(committed[specifier] ?? []);
    const after = new Set(current[specifier]);
    for (const name of after)
      if (!before.has(name)) problems.push(`${specifier}: new published name ${name}`);
    for (const name of before)
      if (!after.has(name)) problems.push(`${specifier}: removed published name ${name}`);
  }
  for (const specifier of Object.keys(committed))
    if (!(specifier in current)) problems.push(`${specifier}: the entry point is no longer listed`);
  return problems;
}

/**
 * pnpm check:theme — plain node, zero dependencies.
 *
 * `@rivinia/theme` is a CSS package: the manifest's `exports["."].style`
 * condition is the ONLY thing that makes `@import '@rivinia/theme'` resolve to
 * a stylesheet. Remove it and every build still succeeds — Angular emits a
 * 188-byte empty stylesheet and prints no warning (measured, 2026-10-29).
 * Nothing in a normal build reports the loss, so this script does.
 *
 * Fails (exit 1, one FAIL line per problem) when any of these is false:
 *  1. `exports["."].style` exists and points at a file in the package;
 *  2. every other `exports` target exists in the package;
 *  3. the file list equals EXPECTED_FILES exactly;
 *  4. `styles/theme.css` declares `--rv-bg` inside `@layer rivinia-theme`.
 *
 * Usage: node scripts/check-theme-package.mjs [dist/theme | *.tgz]
 * With no argument it inspects `dist/theme` (run `pnpm build:theme` first).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_TARGET = join(ROOT, 'dist', 'theme');

export const EXPECTED_FILES = Object.freeze([
  'CHANGELOG.md',
  'README.md',
  'fesm2022/rivinia-theme.mjs',
  'package.json',
  'styles/_index.scss',
  'styles/bootstrap.css',
  'styles/tailwind.css',
  'styles/theme.css',
  'types/rivinia-theme.d.ts',
]);

/**
 * @param {string} [target] directory or .tgz
 * @returns {{ ok: boolean, problems: string[], files: string[] }}
 */
export function checkThemePackage(target = DEFAULT_TARGET) {
  const resolved = target ?? DEFAULT_TARGET;
  const files = load(resolved);
  if (typeof files === 'string') {
    return { ok: false, problems: [files], files: [] };
  }

  const problems = [];
  const names = [...files.keys()].sort();
  const read = (rel) => files.get(rel)?.toString('utf8');

  const manifestJson = read('package.json');
  /** @type {any} */
  let manifest = null;
  if (manifestJson === undefined) {
    problems.push('package.json is not in the package');
  } else {
    try {
      manifest = JSON.parse(manifestJson);
    } catch (error) {
      problems.push(`package.json is not valid JSON: ${error.message}`);
    }
  }

  if (manifest) {
    const exportsField = manifest.exports ?? {};
    const rootEntry = exportsField['.'];
    const styleTarget = rootEntry && typeof rootEntry === 'object' ? rootEntry.style : undefined;
    const reportedTargets = new Set();
    if (typeof styleTarget !== 'string') {
      problems.push(
        'exports["."].style is missing — `@import \'@rivinia/theme\'` resolves to nothing and the theme silently disappears',
      );
    } else if (!files.has(stripDot(styleTarget))) {
      reportedTargets.add(stripDot(styleTarget));
      problems.push(`exports["."].style points at ${styleTarget}, which is not in the package`);
    }

    for (const exportTarget of collectTargets(exportsField)) {
      const relative = stripDot(exportTarget);
      if (files.has(relative) || reportedTargets.has(relative)) continue;
      reportedTargets.add(relative);
      problems.push(`exports target ${exportTarget} is not in the package`);
    }
  }

  const expected = new Set(EXPECTED_FILES);
  const missing = EXPECTED_FILES.filter((name) => !files.has(name));
  if (missing.length > 0) {
    problems.push(
      `missing from the package: ${missing.join(', ')} (expected ${EXPECTED_FILES.length} files)`,
    );
  }
  const unexpected = names.filter((name) => !expected.has(name));
  if (unexpected.length > 0) {
    problems.push(`not in the expected file list: ${unexpected.join(', ')}`);
  }

  const themeCss = read('styles/theme.css');
  if (themeCss !== undefined && !layerDeclares(themeCss, 'rivinia-theme', '--rv-bg')) {
    problems.push('styles/theme.css does not declare --rv-bg inside @layer rivinia-theme');
  }

  return { ok: problems.length === 0, problems, files: names };
}

/** @returns {Map<string, Buffer> | string} files, or a problem message */
function load(target) {
  if (!existsSync(target)) {
    return `${target} does not exist — run \`pnpm build:theme\`, or pass a dist directory or .tgz`;
  }
  if (statSync(target).isDirectory()) {
    const files = new Map();
    walk(target, '', files);
    return files;
  }
  if (!/\.(tgz|tar\.gz)$/i.test(target)) {
    return `${target} is neither a directory nor a .tgz`;
  }
  try {
    return normalizeTarball(untar(readFileSync(target)));
  } catch (error) {
    return `${target} could not be read as a tarball: ${error.message}`;
  }
}

function walk(dir, prefix, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(join(dir, entry.name), rel, files);
    else if (entry.isFile()) files.set(rel, readFileSync(join(dir, entry.name)));
  }
}

function untar(buffer) {
  const data = buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer) : buffer;
  const files = new Map();
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = cString(header, 0, 100);
    const prefix = cString(header, 345, 155);
    const size = parseInt(cString(header, 124, 12).trim() || '0', 8) || 0;
    const type = String.fromCharCode(header[156] || 48);
    const path = prefix ? `${prefix}/${name}` : name;
    offset += 512;
    if (type === '0' || type === '\0') {
      files.set(path, data.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

/** `npm pack` roots every entry under `package/`; strip it when it is uniform. */
function normalizeTarball(files) {
  const paths = [...files.keys()];
  if (paths.length === 0) return files;
  const [first] = paths;
  const root = first.split('/')[0];
  if (first === root || !paths.every((path) => path.startsWith(`${root}/`))) return files;
  return new Map(paths.map((path) => [path.slice(root.length + 1), files.get(path)]));
}

function cString(buffer, start, length) {
  const field = buffer.subarray(start, start + length);
  const end = field.indexOf(0);
  return field.subarray(0, end === -1 ? field.length : end).toString('utf8');
}

function collectTargets(exportsField) {
  const targets = [];
  const visit = (value) => {
    if (typeof value === 'string') {
      if (value.startsWith('./')) targets.push(value);
    } else if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) visit(nested);
    }
  };
  visit(exportsField);
  return targets;
}

const stripDot = (target) => target.replace(/^\.\//, '');

/** The text inside `@layer <name> { … }`, or null when the layer is absent. */
function layerBody(css, name) {
  const opener = new RegExp(`@layer\\s+${name}\\s*\\{`).exec(css);
  if (!opener) return null;
  const start = opener.index + opener[0].length;
  let depth = 1;
  for (let index = start; index < css.length; index++) {
    if (css[index] === '{') depth++;
    else if (css[index] === '}' && --depth === 0) return css.slice(start, index);
  }
  return css.slice(start);
}

function layerDeclares(css, name, property) {
  const body = layerBody(css, name);
  return body !== null && new RegExp(`${property}\\s*:`).test(body);
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ?? DEFAULT_TARGET;
  const report = checkThemePackage(target);
  console.log(`check:theme — ${target} (${report.files.length} file(s))`);
  for (const problem of report.problems) console.error(`FAIL ${problem}`);
  if (!report.ok) {
    console.error(`check:theme — ${report.problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('check:theme — ok');
}

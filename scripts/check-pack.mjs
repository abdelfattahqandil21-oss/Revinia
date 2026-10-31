/**
 * pnpm check:pack — plain node, zero dependencies.
 *
 * A tarball can build, pass every unit test and still be wrong for a
 * consumer: npm needs `repository`/`homepage`/`bugs` to link the package back
 * to the monorepo, and the README and CHANGELOG are the only documentation a
 * registry page shows. Both can vanish without any build error, so this gate
 * inspects what `npm pack --dry-run` would actually ship.
 *
 * Fails (exit 1, one FAIL line per problem) when any of these is false:
 *  1. `README.md` and `CHANGELOG.md` are in the packed file list;
 *  2. `repository` exists, has a url and points at `projects/<pkg>`;
 *  3. `homepage` and `bugs.url` exist;
 *  4. `engines.node` exists (documented as "same as Angular 22");
 *  5. every `exports` target is in the packed file list.
 *
 * Usage: node scripts/check-pack.mjs [pkg ... | directory ...]
 * With no argument it checks the four 1.0 packages in `dist/`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PACKAGES = Object.freeze(['theme', 'select', 'menu', 'i18n']);

/**
 * The files npm would publish from `dir` (respects `files` and `.npmignore`).
 * @param {string} dir
 * @returns {{ files: string[], size: number, unpackedSize: number }}
 */
export function packDryRun(dir) {
  if (!existsSync(dir)) {
    throw new Error(`${dir} does not exist — run the package build first`);
  }
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const [entry] = JSON.parse(output);
  return {
    files: (entry.files ?? []).map((file) => file.path).sort(),
    size: entry.size ?? 0,
    unpackedSize: entry.unpackedSize ?? 0,
  };
}

/**
 * @param {{ dir: string, manifest: any, files: string[] }} input
 * @returns {{ ok: boolean, problems: string[], files: string[] }}
 */
export function auditPackage({ dir, manifest, files }) {
  const problems = [];
  const pkg = basename(dir);
  const packed = new Set(files);

  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, problems: ['package.json is missing or not an object'], files };
  }

  if (!packed.has('package.json')) problems.push('package.json is not in the packed file list');
  if (!packed.has('README.md')) problems.push('README.md is not in the packed file list');
  if (!packed.has('CHANGELOG.md')) problems.push('CHANGELOG.md is not in the packed file list');

  const repository = manifest.repository;
  const repositoryUrl = typeof repository === 'string' ? repository : repository?.url;
  if (typeof repositoryUrl !== 'string' || repositoryUrl.length === 0) {
    problems.push('package.json has no repository.url');
  } else if (typeof repository === 'object' && repository.directory !== `projects/${pkg}`) {
    problems.push(
      `repository.directory is ${JSON.stringify(repository.directory)}, expected "projects/${pkg}"`,
    );
  }

  if (typeof manifest.homepage !== 'string' || manifest.homepage.length === 0) {
    problems.push('package.json has no homepage');
  }

  const bugsUrl = typeof manifest.bugs === 'string' ? manifest.bugs : manifest.bugs?.url;
  if (typeof bugsUrl !== 'string' || bugsUrl.length === 0) {
    problems.push('package.json has no bugs.url');
  }

  if (typeof manifest.engines?.node !== 'string' || manifest.engines.node.length === 0) {
    problems.push('package.json has no engines.node');
  }

  for (const target of collectTargets(manifest.exports ?? {})) {
    const relative = target.replace(/^\.\//, '');
    if (!packed.has(relative)) problems.push(`exports target ${target} is not in the packed files`);
  }

  return { ok: problems.length === 0, problems, files };
}

/**
 * @param {string} dir a built package directory
 * @returns {{ ok: boolean, problems: string[], files: string[], size: number }}
 */
export function checkPackage(dir) {
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) {
    return { ok: false, problems: [`${manifestPath} does not exist`], files: [], size: 0 };
  }
  const manifest = readJson(manifestPath);
  const packed = packDryRun(dir);
  const report = auditPackage({ dir, manifest, files: packed.files });
  return { ...report, size: packed.size };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { __error: error.message };
  }
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

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const targets =
    args.length > 0
      ? args.map((arg) => (arg.includes('/') ? resolve(arg) : join(ROOT, 'dist', arg)))
      : PACKAGES.map((pkg) => join(ROOT, 'dist', pkg));

  let failures = 0;
  for (const dir of targets) {
    let report;
    try {
      report = checkPackage(dir);
    } catch (error) {
      console.error(`FAIL ${dir}: ${error.message}`);
      failures++;
      continue;
    }
    console.log(`check:pack — ${dir} (${report.files.length} file(s))`);
    for (const file of report.files) console.log(`  ${file}`);
    for (const problem of report.problems) {
      console.error(`FAIL ${problem}`);
      failures++;
    }
  }
  if (failures > 0) {
    console.error(`check:pack — ${failures} problem(s)`);
    process.exit(1);
  }
  console.log('check:pack — ok');
}

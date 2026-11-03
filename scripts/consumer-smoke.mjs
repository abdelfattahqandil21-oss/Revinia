#!/usr/bin/env node
/**
 * Install exact npm tarballs in an isolated Angular consumer and run its
 * production build. The fixture is a tracked template; every generated app is
 * created under the system temp directory and removed in `finally`.
 *
 * Example:
 *   node scripts/consumer-smoke.mjs \
 *     --tarball /tmp/rivinia-menu.tgz --specifier @rivinia/menu \
 *     --specifier @rivinia/menu/ui --absent-package @rivinia/select
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_FIXTURE = join(ROOT, 'scripts', 'fixtures', 'consumer-smoke');

export function parseConsumerSmokeArgs(args) {
  const values = { tarballs: [], specifiers: [], styles: [], absentPackages: [], fixture: DEFAULT_FIXTURE };
  const errors = [];
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (flag === '--tarball' || flag === '--specifier' || flag === '--style' || flag === '--absent-package' || flag === '--fixture') {
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        errors.push(`${flag} requires a value`);
        continue;
      }
      i += 1;
      if (flag === '--tarball') values.tarballs.push(value);
      else if (flag === '--specifier') values.specifiers.push(value);
      else if (flag === '--style') values.styles.push(value);
      else if (flag === '--absent-package') values.absentPackages.push(value);
      else values.fixture = value;
    } else if (flag === '--help' || flag === '-h') {
      values.help = true;
    } else {
      errors.push(`unknown option ${flag}`);
    }
  }
  if (!values.help && values.tarballs.length === 0) errors.push('at least one --tarball is required');
  if (!values.help && values.specifiers.length === 0 && values.styles.length === 0) {
    errors.push('at least one --specifier or --style is required');
  }
  return { ...values, errors };
}

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function runNpm(args, cwd, spawn) {
  const result = spawn('npm', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    const detail = output ? `\n${output}` : '';
    throw new Error(`npm ${args[0]} failed${result.status == null ? '' : ` (exit ${result.status})`}${detail}`);
  }
  return result.stdout?.trim() ?? '';
}

function fileSha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function installedTarballs(tempRoot, tarballs, absentPackages) {
  const lockPath = join(tempRoot, 'package-lock.json');
  if (!existsSync(lockPath)) throw new Error('npm install did not produce package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const packagePaths = Object.keys(lock.packages ?? {});
  for (const name of absentPackages) {
    const expectedPath = `node_modules/${name}`;
    const foundPath = packagePaths.find((item) => item === expectedPath || item.endsWith(`/${expectedPath}`));
    if (foundPath) throw new Error(`${name} must be absent but was installed at ${foundPath}`);
  }
  const installed = Object.entries(lock.packages ?? {}).flatMap(([key, pkg]) => {
    if (!pkg.resolved?.startsWith('file:')) return [];
    let filePath;
    try {
      const raw = decodeURIComponent(pkg.resolved.slice('file:'.length));
      filePath = resolve(tempRoot, raw);
    } catch {
      return [];
    }
    const requested = tarballs.find((tarball) => resolve(tarball) === filePath);
    return requested ? [{ name: key.replace(/^node_modules\//, ''), version: pkg.version, tarball: requested }] : [];
  });
  if (installed.length !== tarballs.length) {
    throw new Error(`consumer lockfile resolves ${installed.length}/${tarballs.length} requested tarballs from their exact files`);
  }
  return installed;
}

/**
 * @param {{root?:string, fixture?:string, tempBase?:string, tarballs:string[], specifiers?:string[], styles?:string[], spawn?:Function, write?:(line:string)=>void}} options
 */
export function runConsumerSmoke({
  root = ROOT,
  fixture = DEFAULT_FIXTURE,
  tempBase = tmpdir(),
  tarballs,
  specifiers = [],
  styles = [],
  absentPackages = [],
  spawn = spawnSync,
  write = console.log,
}) {
  const repoRoot = realpathSync(root);
  const fixturePath = realpathSync(isAbsolute(fixture) ? fixture : resolve(repoRoot, fixture));
  if (!inside(repoRoot, fixturePath) || fixturePath === repoRoot) {
    throw new Error('consumer fixture must be a tracked directory inside the repository');
  }
  if (!statSync(fixturePath).isDirectory()) throw new Error(`consumer fixture is not a directory: ${fixturePath}`);
  if (!Array.isArray(tarballs) || tarballs.length === 0) throw new Error('at least one tarball is required');
  if (specifiers.length === 0 && styles.length === 0) throw new Error('at least one import specifier or stylesheet is required');

  const packageJsonPath = join(fixturePath, 'package.json');
  if (!existsSync(packageJsonPath)) throw new Error('consumer fixture must include package.json');
  const consumerPackage = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!consumerPackage.scripts?.build) throw new Error('consumer fixture must define a production build script');
  const fixtureDependencies = { ...consumerPackage.dependencies, ...consumerPackage.devDependencies };
  const workspaceLinks = Object.keys(fixtureDependencies).filter((name) => name.startsWith('@rivinia/'));
  if (workspaceLinks.length) {
    throw new Error(`consumer fixture must not predeclare Rivinia packages; exact tarballs are installed by the runner: ${workspaceLinks.join(', ')}`);
  }

  const requestedTarballs = tarballs.map((path) => resolve(path));
  for (const tarball of requestedTarballs) {
    if (!existsSync(tarball) || !statSync(tarball).isFile()) throw new Error(`tarball does not exist: ${tarball}`);
  }

  mkdirSync(tempBase, { recursive: true });
  let tempRoot;
  try {
    tempRoot = mkdtempSync(join(tempBase, 'rivinia-consumer-'));
    if (inside(repoRoot, realpathSync(tempRoot))) {
      throw new Error('consumer temp directory must be outside the repository');
    }
    cpSync(fixturePath, tempRoot, { recursive: true, dereference: false });

    const imports = specifiers.map((specifier, index) => `import * as Rivinia${index} from ${JSON.stringify(specifier)};`).join('\n');
    const references = specifiers.map((_, index) => `void Rivinia${index};`).join('\n');
    mkdirSync(join(tempRoot, 'src'), { recursive: true });
    writeFileSync(join(tempRoot, 'src', 'consumer-imports.ts'), `${imports}\n${references}\nexport {};\n`);

    if (styles.length) {
      writeFileSync(join(tempRoot, 'src', 'consumer-package-styles.css'), styles.map((style) => `@import ${JSON.stringify(style)};`).join('\n') + '\n');
      const angularPath = join(tempRoot, 'angular.json');
      const workspace = JSON.parse(readFileSync(angularPath, 'utf8'));
      const buildOptions = workspace.projects.consumer.architect.build.options;
      buildOptions.styles = [...new Set([...(buildOptions.styles ?? []), 'src/consumer-package-styles.css'])];
      writeFileSync(angularPath, `${JSON.stringify(workspace, null, 2)}\n`);
    }

    const npmVersion = runNpm(['--version'], tempRoot, spawn);
    runNpm(['install', '--registry=https://registry.npmjs.org/', '--no-audit', '--no-fund', '--save-exact', ...requestedTarballs], tempRoot, spawn);
    const installed = installedTarballs(tempRoot, requestedTarballs, absentPackages);
    runNpm(['run', 'build'], tempRoot, spawn);

    write(`consumer production build passed (${process.version}; npm ${npmVersion || 'version unavailable'})`);
    for (const item of installed) {
      write(`installed ${item.name}@${item.version} from ${basename(item.tarball)} sha256:${fileSha256(item.tarball)}`);
    }
    write(`public imports checked: ${specifiers.join(', ') || '(none; stylesheet-only consumer)'}`);
    if (styles.length) write(`package styles checked: ${styles.join(', ')}`);
    if (absentPackages.length) write(`optional packages confirmed absent: ${absentPackages.join(', ')}`);
    return { installed, specifiers: [...specifiers], styles: [...styles] };
  } finally {
    if (tempRoot && existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const parsed = parseConsumerSmokeArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log('Usage: node scripts/consumer-smoke.mjs --tarball FILE [--tarball FILE] (--specifier PACKAGE [--specifier PACKAGE] | --style CSS [--style CSS]) [--absent-package PACKAGE] [--fixture DIR]');
  } else if (parsed.errors.length) {
    console.error(parsed.errors.join('\n'));
    process.exitCode = 2;
  } else {
    try {
      runConsumerSmoke(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}

#!/usr/bin/env node
/** Build and inspect the exact immutable tag set before an OIDC publish job. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isAllowedRuntimeImport } from './release-archive.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packages = [
  'popup', 'theme', 'select', 'menu', 'i18n', 'datepicker', 'env', 'http', 'toast', 'modal', 'table',
];
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1]]);
  return pairs;
}, []));
const version = args.version;
const distTag = args['dist-tag'];
const artifactDir = resolve(args['artifact-dir'] ?? '');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '') || !['latest', 'next'].includes(distTag) || !args['artifact-dir']) {
  throw new Error('Usage: prepare-release.mjs --version X.Y.Z[-pre] --dist-tag latest|next --artifact-dir DIR');
}
if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Release preparation must run from a workflow dispatch on main');

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} failed:\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function inspectArchive(tarball, packedFiles, expectedName, expectedVersion) {
  const included = new Set(packedFiles.map((file) => file.path));
  for (const required of ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE']) {
    if (!included.has(required)) throw new Error(`${expectedName}: exact archive is missing ${required}`);
  }
  for (const file of packedFiles) {
    if (/(^|\/)(?:node_modules|dist|pack)(\/|$)/.test(file.path) || /(?:^|\/)(?:\.npmrc|\.env(?:\.|$))/.test(file.path)) {
      throw new Error(`${expectedName}: forbidden file in release archive: ${file.path}`);
    }
  }
  const archiveManifest = JSON.parse(run('tar', ['-xOf', tarball, 'package/package.json']));
  if (archiveManifest.name !== expectedName || archiveManifest.version !== expectedVersion) {
    throw new Error(`${expectedName}: tarball manifest does not match ${expectedVersion}`);
  }
  for (const [subpath, target] of Object.entries(archiveManifest.exports ?? {})) {
    const paths = [];
    const collect = (value) => {
      if (typeof value === 'string' && value.startsWith('./')) paths.push(value.slice(2));
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(target);
    for (const path of paths) if (!included.has(path)) throw new Error(`${expectedName}: export ${subpath} points to missing archive file ${path}`);
  }
  const declared = new Set([
    ...Object.keys(archiveManifest.dependencies ?? {}),
    ...Object.keys(archiveManifest.peerDependencies ?? {}),
  ]);
  const imports = new Set();
  for (const file of packedFiles.filter((item) => /^fesm\d+\/.+\.mjs$/.test(item.path))) {
    const code = run('tar', ['-xOf', tarball, `package/${file.path}`]);
    for (const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(|))['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      imports.add(specifier);
      if (!isAllowedRuntimeImport(specifier, expectedName, declared)) {
        throw new Error(`${expectedName}: undeclared or forbidden FESM runtime import ${specifier}`);
      }
    }
  }
  return [...imports].sort();
}

const releaseGroup = JSON.parse(readFileSync(join(root, 'release-groups.json'), 'utf8')).groups.find((group) => group.id === 'rivinia-1.0');
if (releaseGroup?.packages?.length !== packages.length) throw new Error('Expected exactly eleven synchronized release packages');
const head = run('git', ['rev-parse', 'HEAD']);
for (const name of packages) {
  const pkg = `@rivinia/${name}`;
  if (!releaseGroup.packages.includes(pkg)) throw new Error(`${pkg} is not in release-groups.json`);
  const manifest = JSON.parse(readFileSync(join(root, 'projects', name, 'package.json'), 'utf8'));
  if (manifest.name !== pkg || manifest.version !== version) throw new Error(`${pkg} manifest does not match release ${version}`);
  const tag = `${name}/v${version}`;
  if (run('git', ['rev-parse', `${tag}^{commit}`]) !== head) throw new Error(`${tag} must resolve to the workflow HEAD ${head}`);
}

run('pnpm', ['check:governance']);
run('pnpm', ['check:readmes']);
run('pnpm', ['check:docs']);
run('pnpm', ['check:pack']);
run('pnpm', ['check:theme']);
mkdirSync(artifactDir, { recursive: true });
const records = [];
const specifiers = [];
const styles = [];
for (const name of packages) {
  const pkg = `@rivinia/${name}`;
  const dist = join(root, 'dist', name);
  const packed = JSON.parse(run('npm', ['pack', dist, '--pack-destination', artifactDir, '--json', '--registry=https://registry.npmjs.org/']))[0];
  if (!packed?.filename?.endsWith('.tgz') || typeof packed.integrity !== 'string' || !Array.isArray(packed.files)) {
    throw new Error(`${pkg}: npm pack did not return the expected archive metadata`);
  }
  const tarball = join(artifactDir, `${name}.tgz`);
  renameSync(join(artifactDir, packed.filename), tarball);
  run('node', ['scripts/check-versioned-doc-links.mjs', pkg, version, `--tarball=${tarball}`, '--verify-tag-snapshot', '--require-tag']);
  if (name === 'theme') run('node', ['scripts/check-theme-package.mjs', tarball]);
  const bytes = readFileSync(tarball);
  const manifest = JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8'));
  if (manifest.name !== pkg || manifest.version !== version) throw new Error(`${pkg} dist manifest mismatch`);
  const runtimeImports = inspectArchive(tarball, packed.files, pkg, version);
  records.push({ name: pkg, version, file: `${name}.tgz`, integrity: packed.integrity, sha256: createHash('sha256').update(bytes).digest('hex'), files: packed.files.map((file) => file.path), runtimeImports });
  for (const subpath of Object.keys(manifest.exports ?? {})) {
    if (subpath === './package.json') continue;
    const specifier = subpath === '.' ? pkg : `${pkg}/${subpath.replace(/^\.\//, '')}`;
    const target = manifest.exports[subpath];
    if (typeof target === 'string' && target.endsWith('.css')) styles.push(specifier);
    else if (target && typeof target === 'object' && typeof target.default === 'string' && !target.default.endsWith('.css')) specifiers.push(specifier);
  }
}
const consumerArgs = ['scripts/consumer-smoke.mjs'];
for (const item of records) consumerArgs.push('--tarball', join(artifactDir, item.file));
for (const item of specifiers) consumerArgs.push('--specifier', item);
for (const item of styles) consumerArgs.push('--style', item);
run('node', consumerArgs);
run('node', [
  'scripts/consumer-smoke.mjs',
  '--tarball', join(artifactDir, 'i18n.tgz'),
  '--specifier', '@rivinia/i18n',
  '--specifier', '@rivinia/i18n/ui',
  '--absent-package', '@rivinia/select',
]);
writeFileSync(join(artifactDir, 'release-manifest.json'), `${JSON.stringify({ version, distTag, sourceCommit: head, packages: records }, null, 2)}\n`);
console.log(`Prepared ${records.length} inspected tarballs for ${version} (${distTag}) from ${head}.`);

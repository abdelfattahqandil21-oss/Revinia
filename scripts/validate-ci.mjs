#!/usr/bin/env node
/** Reproduce required pull-request validation in one local command. */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const groupConfig = JSON.parse(readFileSync(join(ROOT, 'release-groups.json'), 'utf8'));
const group = groupConfig.groups.find((item) => item.id === 'rivinia-1.0');
const packageNames = group?.packages ?? [];
const packageByName = new Map();

for (const name of packageNames) {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'projects', name.split('/').at(-1), 'package.json'), 'utf8'));
  if (manifest.name !== name) throw new Error(`${name}: package manifest name mismatch`);
  packageByName.set(name, manifest);
}

function buildOrder() {
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`release-group build dependency cycle at ${name}`);
    visiting.add(name);
    const manifest = packageByName.get(name);
    const dependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    for (const dependency of dependencies) if (packageByName.has(dependency)) visit(dependency);
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
  }

  for (const name of packageNames) visit(name);
  return ordered;
}

function run(label, args) {
  console.log(`\n==> ${label}: pnpm ${args.join(' ')}`);
  const result = spawnSync('pnpm', args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const [label, args] of [
  ['Documentation', ['check:docs']],
  ['README limits and links', ['check:readmes']],
  ['Governance and release group', ['check:governance']],
  ['Maintainer skill compatibility', ['check:skills']],
  ['Tooling tests', ['test:scripts']],
]) {
  run(label, args);
}

for (const name of packageNames) {
  const packageName = name.split('/').at(-1);
  const manifest = packageByName.get(name);
  run(`${name} README and exact-tag links`, [
    'check:versioned-doc-links',
    name,
    manifest.version,
    `--package-dir=projects/${packageName}`,
  ]);
}

for (const name of buildOrder()) {
  const packageName = name.split('/').at(-1);
  const script = `build:${packageName}`;
  const rootManifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  run(`${name} production build`, rootManifest.scripts[script] ? [script] : ['exec', 'ng', 'build', packageName]);
}

run('Package metadata and packed files', ['check:pack']);
run('Theme package contract', ['check:theme']);

for (const name of packageNames) {
  const packageName = name.split('/').at(-1);
  run(`${name} unit tests`, packageName === 'theme'
    ? ['test:theme']
    : ['exec', 'ng', 'test', packageName, '--watch=false']);
}

run('Schematics tests', ['test:schematics']);
run('Menu and Select browser harness build', ['exec', 'ng', 'build', 'menu-e2e']);
run('Chromium browser installation', process.env.CI
  ? ['exec', 'playwright', 'install', '--with-deps', 'chromium']
  : ['exec', 'playwright', 'install', 'chromium']);
run('Menu, Select, and Popup browser tests', ['exec', 'playwright', 'test', '--project=chromium']);
console.log('\nRequired CI validation passed.');

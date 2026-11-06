#!/usr/bin/env node
/** Publish only verified tarballs, with idempotent integrity-based resume. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), values[index + 1]]);
  return pairs;
}, []));
const version = args.version;
const distTag = args['dist-tag'];
const artifactDir = resolve(args['artifact-dir'] ?? '');
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '') || !['latest', 'next'].includes(distTag) || !args['artifact-dir']) {
  throw new Error('Usage: publish-release.mjs --version X.Y.Z[-pre] --dist-tag latest|next --artifact-dir DIR');
}
if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Publishing must run from a workflow dispatch on main');
const manifest = JSON.parse(readFileSync(join(artifactDir, 'release-manifest.json'), 'utf8'));
if (manifest.version !== version || manifest.distTag !== distTag || manifest.packages.length !== 11) throw new Error('Artifact release manifest does not match dispatch inputs');
const expectedNames = ['popup', 'theme', 'select', 'menu', 'i18n', 'datepicker', 'env', 'http', 'toast', 'modal', 'table'].map((name) => `@rivinia/${name}`);
if (manifest.packages.map((item) => item.name).join('\n') !== expectedNames.join('\n')) throw new Error('Artifact manifest must contain the exact synchronized package set in release order');
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
if (head.status !== 0 || head.stdout.trim() !== manifest.sourceCommit) throw new Error('Publisher checkout does not match the verified artifact commit');
for (const item of manifest.packages) {
  const short = item.name.slice('@rivinia/'.length);
  const tag = spawnSync('git', ['rev-parse', `${short}/v${version}^{commit}`], { cwd: root, encoding: 'utf8' });
  if (tag.status !== 0 || tag.stdout.trim() !== manifest.sourceCommit) throw new Error(`${short}/v${version} no longer resolves to the verified commit`);
}

function npm(args, allowMissing = false) {
  const result = spawnSync('npm', [...args, '--registry=https://registry.npmjs.org/'], { cwd: root, encoding: 'utf8' });
  if (allowMissing && result.status !== 0 && /E404|404 Not Found|is not in this registry|No match found/i.test(`${result.stdout}\n${result.stderr}`)) return null;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  const output = result.stdout.trim();
  try { return JSON.parse(output); } catch { return output; }
}

const pending = [];
for (const item of manifest.packages) {
  if (item.version !== version || !item.name.startsWith('@rivinia/')) throw new Error('Unexpected package record in release manifest');
  const tarball = join(artifactDir, item.file);
  const bytes = readFileSync(tarball);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== item.sha256) throw new Error(`${item.name}: downloaded artifact hash mismatch`);
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (integrity !== item.integrity) throw new Error(`${item.name}: artifact integrity does not match pack manifest`);
  if (item.file !== `${item.name.slice('@rivinia/'.length)}.tgz`) throw new Error(`${item.name}: unexpected artifact filename`);
  const sourceManifest = JSON.parse(readFileSync(join(root, 'projects', item.name.slice('@rivinia/'.length), 'package.json'), 'utf8'));
  if (sourceManifest.version !== version || sourceManifest.name !== item.name) throw new Error(`${item.name}: source manifest mismatch`);
  const published = npm(['view', `${item.name}@${version}`, 'dist.integrity', '--json'], true);
  if (published && published !== item.integrity) throw new Error(`${item.name}@${version} already exists with different integrity; immutable version collision`);
  if (published) console.log(`${item.name}@${version} already has matching integrity; skipping (safe resume).`);
  else pending.push({ item, tarball });
}

for (const { item, tarball } of pending) {
  npm(['publish', tarball, '--access', 'public', '--tag', distTag]);
  const published = npm(['view', `${item.name}@${version}`, 'dist.integrity', '--json']);
  if (published !== item.integrity) throw new Error(`${item.name}@${version}: registry integrity did not match inspected tarball after publish`);
  console.log(`Published and verified ${item.name}@${version} (${item.integrity}).`);
}
console.log(`Release ${version} completed for ${manifest.packages.length} packages with dist-tag ${distTag}.`);

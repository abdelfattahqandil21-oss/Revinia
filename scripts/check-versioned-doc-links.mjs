#!/usr/bin/env node
/** Validate a candidate package README against its exact package version and immutable tag. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoSlug = 'abdelfattahqandil21-oss/Rivinia';

function isExactSemver(version) {
  if (typeof version !== 'string') return false;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) return false;
  return !match[4] || match[4].split('.').every((identifier) => !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0'));
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function gitShow(root, reference) {
  return execFileSync('git', ['show', reference], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function readTarballFiles(tarballPath) {
  const tar = gunzipSync(readFileSync(tarballPath));
  const files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const path = prefix ? `${prefix}/${name}` : name;
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) {
      throw new Error(`invalid tar entry size for ${path}`);
    }
    const type = String.fromCharCode(header[156] || 48);
    if ((type === '0' || type === '\0') && ['package/package.json', 'package/README.md', 'package/CHANGELOG.md'].includes(path)) {
      files.set(path.slice('package/'.length), tar.subarray(offset + 512, offset + 512 + size).toString('utf8'));
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

export function validateVersionedDocLinks({
  root = repositoryRoot,
  packageName,
  version,
  packageDir,
  tarballPath,
  requireTag = false,
  verifyTagSnapshot = false,
}) {
  const errors = [];
  if (typeof packageName !== 'string' || !/^@rivinia\/[a-z][a-z0-9-]*$/.test(packageName)) {
    return [`invalid package name: ${String(packageName)}`];
  }
  if (!isExactSemver(version)) return [`release version must be valid exact SemVer, got ${String(version)}`];

  const short = packageName.slice('@rivinia/'.length);
  const candidateDir = packageDir
    ? (isAbsolute(packageDir) ? packageDir : resolve(root, packageDir))
    : resolve(root, 'projects', short);
  let manifest;
  let readme;
  let changelog;
  if (tarballPath) {
    try {
      const files = readTarballFiles(isAbsolute(tarballPath) ? tarballPath : resolve(root, tarballPath));
      if (!['package.json', 'README.md', 'CHANGELOG.md'].every((name) => files.has(name))) {
        return ['candidate tarball must contain package/package.json, package/README.md and package/CHANGELOG.md'];
      }
      manifest = JSON.parse(files.get('package.json'));
      readme = files.get('README.md');
      changelog = files.get('CHANGELOG.md');
    } catch (error) {
      return [`candidate tarball could not be read: ${error.message}`];
    }
  } else {
    const candidateRel = relative(root, candidateDir);
    if (candidateRel === '..' || candidateRel.startsWith(`..${sep}`) || isAbsolute(candidateRel)) {
      return [`candidate package directory must stay inside the repository: ${candidateDir}`];
    }
    const manifestPath = resolve(candidateDir, 'package.json');
    const readmePath = resolve(candidateDir, 'README.md');
    const changelogPath = resolve(candidateDir, 'CHANGELOG.md');
    if (![manifestPath, readmePath, changelogPath].every(existsSync)) {
      return [`candidate package directory must contain package.json, README.md and CHANGELOG.md: ${candidateDir}`];
    }
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      return [`candidate package.json is not valid JSON: ${error.message}`];
    }
    readme = readFileSync(readmePath, 'utf8');
    changelog = readFileSync(changelogPath, 'utf8');
  }
  const expectedTag = `${short}/v${version}`;
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (manifest.name !== packageName) errors.push(`manifest name is ${String(manifest.name)}, expected ${packageName}`);
  if (manifest.version !== version) errors.push(`manifest version is ${String(manifest.version)}, expected ${version}`);
  if (!new RegExp(`Package version:\\s*\\*\\*${escapedVersion}\\*\\*`).test(readme)) {
    errors.push(`README must state Package version: **${version}**`);
  }
  if (!new RegExp(`^##\\s+${escapedVersion}(?:\\s|$)`, 'm').test(changelog)) {
    errors.push(`CHANGELOG.md must contain a heading for ${version}`);
  }

  let checkedDocs = 0;
  const linkedPaths = new Set();
  const escapedRepoSlug = repoSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const repoUrlPattern = new RegExp(`https://(?:github\\.com/${escapedRepoSlug}|raw\\.githubusercontent\\.com/${escapedRepoSlug})/[A-Za-z0-9._~!$&'*+,;=:@%/-]+`, 'gi');
  for (const match of readme.matchAll(repoUrlPattern)) {
    const raw = match[0].replace(/[.,;]+$/, '');
    const url = new URL(raw);
    let ref;
    let pathInRepo;
    if (url.hostname === 'raw.githubusercontent.com') {
      const remainder = url.pathname.slice(`/${repoSlug}/`.length);
      const tagPrefix = `${expectedTag}/`;
      if (!remainder.startsWith(tagPrefix)) {
        errors.push(`repository asset links must use ${expectedTag}: ${raw}`);
        continue;
      }
      pathInRepo = remainder.slice(tagPrefix.length);
      ref = expectedTag;
    } else {
      const path = url.pathname;
      const marker = ['/blob/', '/tree/', '/raw/'].find((candidate) => path.includes(candidate));
      if (!marker) continue; // Issues, releases and repository overview links are not file references.
      const remainder = path.slice(path.indexOf(marker) + marker.length);
      const tagPrefix = `${expectedTag}/`;
      if (!remainder.startsWith(tagPrefix)) {
        errors.push(`repository file links must use ${expectedTag}: ${raw}`);
        continue;
      }
      pathInRepo = remainder.slice(tagPrefix.length);
      ref = expectedTag;
    }
    if (ref !== expectedTag) {
      errors.push(`repository file links must use ${expectedTag}, found ref ${ref}: ${raw}`);
      continue;
    }
    if (!pathInRepo) {
      errors.push(`versioned repository link has no target path: ${raw}`);
      continue;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(pathInRepo);
    } catch {
      errors.push(`repository link contains invalid path encoding: ${raw}`);
      continue;
    }
    const target = resolve(root, decoded);
    const rel = relative(root, target);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      errors.push(`repository link escapes the candidate source tree: ${raw}`);
      continue;
    }
    if (!existsSync(target)) errors.push(`linked file is absent from candidate source tree: ${decoded}`);
    linkedPaths.add(decoded);
    if (decoded.startsWith('docs/')) checkedDocs += 1;
  }
  if (checkedDocs === 0) errors.push('README must link at least one canonical docs page through the repository release tag');

  if (verifyTagSnapshot) {
    try {
      git(root, ['rev-parse', '--verify', `refs/tags/${expectedTag}^{commit}`]);
      const tagManifest = JSON.parse(gitShow(root, `${expectedTag}:projects/${short}/package.json`));
      if (tagManifest.name !== packageName || tagManifest.version !== version) {
        errors.push(`release tag ${expectedTag} package manifest does not match ${packageName}@${version}`);
      }
      const snapshotReadme = gitShow(root, `${expectedTag}:projects/${short}/README.md`);
      const snapshotChangelog = gitShow(root, `${expectedTag}:projects/${short}/CHANGELOG.md`);
      if (snapshotReadme !== readme) errors.push(`packed README does not match documentation snapshot ${expectedTag}`);
      if (snapshotChangelog !== changelog) errors.push(`packed CHANGELOG.md does not match release snapshot ${expectedTag}`);
      for (const path of linkedPaths) {
        try { git(root, ['cat-file', '-e', `${expectedTag}:${path}`]); }
        catch { errors.push(`linked file is absent from release snapshot ${expectedTag}: ${path}`); }
      }
    } catch (error) {
      errors.push(`release snapshot ${expectedTag} is missing or invalid: ${error.message}`);
    }
  }

  if (requireTag) {
    try {
      const tagCommit = git(root, ['rev-parse', '--verify', `refs/tags/${expectedTag}^{commit}`]);
      const head = git(root, ['rev-parse', 'HEAD']);
      if (tagCommit !== head) errors.push(`release tag ${expectedTag} resolves to ${tagCommit}, not candidate HEAD ${head}`);
      if (git(root, ['status', '--porcelain'])) errors.push('tag verification requires a clean worktree');
    } catch (error) {
      errors.push(`release tag ${expectedTag} is missing or cannot be resolved: ${error.message}`);
    }
  }
  return errors;
}

export function parseVersionedDocLinkOptions(options) {
  const errors = [];
  const allowedFlags = new Set(['--verify-tag-snapshot', '--require-tag']);
  const values = { packageDir: undefined, tarballPath: undefined, requireTag: false, verifyTagSnapshot: false };
  for (const option of options) {
    if (option.startsWith('--package-dir=')) {
      if (values.packageDir !== undefined) errors.push('option --package-dir may be specified only once');
      values.packageDir = option.slice('--package-dir='.length);
      if (!values.packageDir) errors.push('option --package-dir requires a path');
    } else if (option.startsWith('--tarball=')) {
      if (values.tarballPath !== undefined) errors.push('option --tarball may be specified only once');
      values.tarballPath = option.slice('--tarball='.length);
      if (!values.tarballPath) errors.push('option --tarball requires a path');
    } else if (allowedFlags.has(option)) {
      if (option === '--require-tag') values.requireTag = true;
      if (option === '--verify-tag-snapshot') values.verifyTagSnapshot = true;
    } else errors.push(`unknown option ${option}`);
  }
  if (values.packageDir && values.tarballPath) errors.push('choose either --package-dir or --tarball, not both');
  return { ...values, errors };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const [packageName, version, ...options] = process.argv.slice(2);
  if (!packageName || !version) {
    console.error('usage: node scripts/check-versioned-doc-links.mjs <package> <exact-version> [--package-dir=dist/<pkg> | --tarball=<file.tgz>] [--verify-tag-snapshot] [--require-tag]');
    process.exit(2);
  }
  const parsed = parseVersionedDocLinkOptions(options);
  if (parsed.errors.length) {
    console.error(parsed.errors.join('\n'));
    process.exit(2);
  }
  const { packageDir, tarballPath, requireTag, verifyTagSnapshot } = parsed;
  const errors = validateVersionedDocLinks({ packageName, version, packageDir, tarballPath, requireTag, verifyTagSnapshot });
  if (errors.length) {
    console.error(`versioned docs check failed for ${packageName}@${version} (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const snapshot = verifyTagSnapshot ? ' and immutable release snapshot' : '';
    console.log(`versioned docs check passed: ${packageName}@${version}, ${packageName.slice('@rivinia/'.length)}/v${version}; source links, release metadata${snapshot} verified.`);
  }
}

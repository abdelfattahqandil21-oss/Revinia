#!/usr/bin/env node
/** Validate version metadata only for skills that declare package compatibility. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagePattern = /^@rivinia\/[a-z][a-z0-9-]*$/;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const skillMetadataPathFields = ['supported_ranges_ref', 'documentation_refs', 'verification_refs'];

function parseVersion(value) {
  if (typeof value !== 'string') return undefined;
  const match = semverPattern.exec(value);
  if (!match) return undefined;
  const prerelease = match[4]?.split('.') ?? [];
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease, build: value.split('+')[1] ?? '' };
}

function compareVersions(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1;
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    if (left.prerelease.length === right.prerelease.length) return 0;
    return left.prerelease.length ? -1 : 1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    if (left.prerelease[i] === undefined) return -1;
    if (right.prerelease[i] === undefined) return 1;
    const a = left.prerelease[i];
    const b = right.prerelease[i];
    if (a === b) continue;
    const an = /^\d+$/.test(a);
    const bn = /^\d+$/.test(b);
    if (an && bn) return Number(a) < Number(b) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

function upperFor(operator, version) {
  if (operator === '~') return { ...version, minor: version.minor + 1, patch: 0, prerelease: [] };
  if (version.major > 0) return { ...version, major: version.major + 1, minor: 0, patch: 0, prerelease: [] };
  if (version.minor > 0) return { ...version, minor: version.minor + 1, patch: 0, prerelease: [] };
  return { ...version, patch: version.patch + 1, prerelease: [] };
}

function parseRange(range) {
  if (typeof range !== 'string' || !range.trim()) return undefined;
  const branches = range.split('||').map((part) => part.trim());
  const parsed = [];
  for (const branch of branches) {
    const terms = branch.split(/\s+/).filter(Boolean);
    if (!terms.length) return undefined;
    const comparators = [];
    for (const term of terms) {
      const match = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(term);
      const version = parseVersion(match?.[2]);
      if (!match || !version) return undefined;
      const operator = match[1] ?? '=';
      if (operator === '^' || operator === '~') {
        comparators.push({ operator: '>=', version }, { operator: '<', version: upperFor(operator, version) });
      } else comparators.push({ operator, version });
    }
    parsed.push(comparators);
  }
  return parsed;
}

function rangeContains(parsedRange, versionText) {
  const version = parseVersion(versionText);
  if (!version) return false;
  return parsedRange.some((branch) => {
    if (version.prerelease.length && !branch.some((comparator) => (
      comparator.version.prerelease.length
      && comparator.version.major === version.major
      && comparator.version.minor === version.minor
      && comparator.version.patch === version.patch
    ))) return false;
    return branch.every(({ operator, version: bound }) => {
      const compared = compareVersions(version, bound);
      if (operator === '=') return compared === 0;
      if (operator === '>') return compared > 0;
      if (operator === '>=') return compared >= 0;
      if (operator === '<') return compared < 0;
      return compared <= 0;
    });
  });
}

function rangeFitsMajor(parsedRange, major) {
  return parsedRange.every((branch) => {
    const versionsStayInBoundary = branch.every(({ operator, version }) => (
      version.major === major
      || (operator === '<' && version.major === major + 1 && version.minor === 0 && version.patch === 0 && !version.prerelease.length)
    ));
    const hasLowerBound = branch.some(({ operator, version }) => (
      ['=', '>', '>='].includes(operator) && version.major === major
    ));
    const hasUpperBound = branch.some(({ operator, version }) => (
      (['<', '<='].includes(operator) && version.major === major)
      || (operator === '<' && version.major === major + 1 && version.minor === 0 && version.patch === 0 && !version.prerelease.length)
    ));
    return versionsStayInBoundary && hasLowerBound && hasUpperBound;
  });
}

function readSkillRole(skillPath) {
  const text = readFileSync(skillPath, 'utf8');
  const frontmatter = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)?.[1] ?? '';
  const metadataLine = /^metadata:(.*)$/m.exec(frontmatter);
  const metadata = /^metadata:\s*\r?\n((?:[ \t]+.*\r?\n?)*)/m.exec(frontmatter)?.[1] ?? '';
  const role = /^\s+role:\s*['"]?([^\s'"#]+)['"]?\s*$/m.exec(metadata)?.[1]
    ?? /^role:\s*['"]?([^\s'"#]+)['"]?\s*$/m.exec(frontmatter)?.[1]
    ?? 'general';
  const packageScope = /^\s+package_scope:\s*['"]?([^\s'"#]+)['"]?\s*$/m.exec(metadata)?.[1] ?? '';
  const metadataPathRefs = Object.fromEntries(skillMetadataPathFields.flatMap((field) => {
    const value = new RegExp(`^\\s+${field}:\\s*(.*?)\\s*$`, 'm').exec(metadata)?.[1];
    if (value === undefined) return [];
    return [[field, value.replace(/^(['"])(.*)\1$/, '$2')]];
  }));
  const malformedMetadata = Boolean(metadataLine && (metadataLine[1].trim() !== '' || !/^\s+role:\s*['"]?(?:consumer|maintainer|general)['"]?\s*$/m.test(metadata)));
  return { role, packageScope, metadataPathRefs, malformedMetadata };
}

function validateSkillMetadataPaths(root, skillLabel, metadataPathRefs, errors) {
  for (const [field, value] of Object.entries(metadataPathRefs)) {
    const ref = typeof value === 'string' ? value.trim() : '';
    const target = ref ? resolve(root, ref) : '';
    const rel = target ? relative(root, target) : '';
    const insideRepository = rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
    let isFile = false;
    try { isFile = Boolean(target && existsSync(target) && statSync(target).isFile()); } catch { /* report the invalid reference below */ }
    if (!ref || isAbsolute(ref) || !insideRepository || !isFile) {
      errors.push(`${skillLabel}: metadata.${field} must reference an existing repository file`);
    }
  }
}

function readSkillFiles(root, base, errors) {
  const dir = resolve(root, base);
  if (!existsSync(dir)) return [];
  const found = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name === 'SKILL.md') found.push(path);
    }
  };
  try { visit(dir); } catch (error) { errors.push(`${base}: cannot scan skills: ${error.message}`); }
  return found;
}

function validateManifest(root, skillLabel, skillRole, sidecarPath, groups, errors) {
  let metadata;
  try { metadata = JSON.parse(readFileSync(sidecarPath, 'utf8')); }
  catch (error) {
    errors.push(`${skillLabel}: compatibility.json is invalid JSON: ${error.message}`);
    return;
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    errors.push(`${skillLabel}: compatibility metadata must be an object`);
    return;
  }
  if (!['consumer', 'maintainer'].includes(skillRole)) errors.push(`${skillLabel}: only consumer or maintainer skills may declare package compatibility`);
  if (metadata.role !== skillRole) errors.push(`${skillLabel}: compatibility role must match SKILL.md role ${skillRole}`);
  if (!Array.isArray(metadata.packages) || metadata.packages.length === 0) {
    errors.push(`${skillLabel}: package compatibility requires a non-empty packages array`);
    return;
  }
  const seenPackages = new Set();
  for (const item of metadata.packages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${skillLabel}: each package compatibility entry must be an object`);
      continue;
    }
    const name = item.name;
    if (typeof name !== 'string' || !packagePattern.test(name)) {
      errors.push(`${skillLabel}: invalid package identity ${String(name)}`);
      continue;
    }
    if (seenPackages.has(name)) errors.push(`${skillLabel}: duplicate package identity ${name}`);
    seenPackages.add(name);
    const short = name.slice('@rivinia/'.length);
    const manifestPath = resolve(root, 'projects', short, 'package.json');
    if (!existsSync(manifestPath)) {
      errors.push(`${skillLabel}: package manifest does not exist for ${name}`);
      continue;
    }
    let packageManifest;
    try { packageManifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch (error) {
      errors.push(`${skillLabel}: ${name} package manifest is invalid JSON: ${error.message}`);
      continue;
    }
    if (packageManifest.name !== name) errors.push(`${skillLabel}: ${manifestPath} declares ${String(packageManifest.name)}, expected ${name}`);
    if (!parseVersion(packageManifest.version)) errors.push(`${skillLabel}: ${name} manifest version is not valid SemVer`);

    const group = groups.find((candidate) => candidate && Array.isArray(candidate.packages) && candidate.packages.includes(name));
    if (group && item.release_group !== group.id) errors.push(`${skillLabel}: ${name} release_group must be ${group.id}`);
    if (!group && item.release_group !== undefined) errors.push(`${skillLabel}: ${name} is not a member of release group ${String(item.release_group)}`);

    const ranges = Array.isArray(item.supported_ranges) ? item.supported_ranges : [];
    const parsedRanges = [];
    if (!ranges.length) errors.push(`${skillLabel}: ${name} must declare supported_ranges`);
    for (const range of ranges) {
      const parsed = parseRange(range);
      if (!parsed) errors.push(`${skillLabel}: ${name} has invalid supported version range ${String(range)}`);
      else parsedRanges.push(parsed);
    }
    const boundary = item.compatibility_boundary?.major;
    const verified = Array.isArray(item.verified_versions) ? item.verified_versions : [];
    if (!verified.length) errors.push(`${skillLabel}: ${name} must declare verified_versions`);
    for (const version of verified) {
      if (!parseVersion(version)) errors.push(`${skillLabel}: ${name} verified version ${String(version)} is not valid exact SemVer`);
      else if (!parsedRanges.some((range) => rangeContains(range, version) && Number.isSafeInteger(boundary) && rangeFitsMajor(range, boundary))) {
        errors.push(`${skillLabel}: ${name}@${version} is outside its supported ranges or major boundary`);
      }
    }

    if (!Number.isSafeInteger(boundary) || boundary < 0) {
      errors.push(`${skillLabel}: ${name} must declare compatibility_boundary.major`);
    } else {
      for (let i = 0; i < parsedRanges.length; i += 1) {
        if (!rangeFitsMajor(parsedRanges[i], boundary)) errors.push(`${skillLabel}: ${name} supported range ${ranges[i]} crosses declared major boundary ${boundary}`);
      }
      for (const version of verified) {
        const parsed = parseVersion(version);
        if (parsed && parsed.major !== boundary) errors.push(`${skillLabel}: ${name}@${version} does not match major boundary ${boundary}`);
      }
    }

    const documentation = item.documentation;
    if (!documentation || typeof documentation !== 'object') {
      errors.push(`${skillLabel}: ${name} must declare documentation references`);
    } else {
      const canonical = documentation.canonical_source;
      const canonicalPath = typeof canonical === 'string' ? resolve(root, canonical) : '';
      const canonicalRel = canonicalPath ? relative(root, canonicalPath) : '';
      if (!canonical || canonicalRel === '..' || canonicalRel.startsWith(`..${sep}`) || isAbsolute(canonicalRel) || !existsSync(canonicalPath)) {
        errors.push(`${skillLabel}: ${name} canonical documentation source does not exist inside the repository`);
      }
      const refs = documentation.release_references;
      if (!refs || typeof refs !== 'object' || Array.isArray(refs)) {
        errors.push(`${skillLabel}: ${name} must map verified versions to release documentation references`);
      } else {
        for (const version of verified) {
          if (refs[version] !== `${short}/v${version}`) errors.push(`${skillLabel}: ${name}@${version} must reference immutable tag ${short}/v${version}`);
        }
        for (const version of Object.keys(refs)) {
          if (!verified.includes(version)) errors.push(`${skillLabel}: ${name} has a documentation reference for unverified version ${version}`);
        }
      }
    }

    const evidence = Array.isArray(item.evidence) ? item.evidence : [];
    for (const version of verified) {
      const records = evidence.filter((record) => record?.version === version);
      if (!records.length) errors.push(`${skillLabel}: ${name}@${version} requires an evidence reference`);
      for (const record of records) {
        const ref = typeof record.ref === 'string' ? record.ref.split('#')[0] : '';
        const target = ref ? resolve(root, ref) : '';
        const rel = target ? relative(root, target) : '';
        if (!ref || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || !existsSync(target)) {
          errors.push(`${skillLabel}: ${name}@${version} evidence reference does not exist inside the repository`);
        }
      }
    }
    for (const record of evidence) {
      if (!record || !verified.includes(record.version)) errors.push(`${skillLabel}: ${name} evidence must refer to a declared verified version`);
    }

    if (item.capabilities !== undefined && !Array.isArray(item.capabilities)) {
      errors.push(`${skillLabel}: ${name} capabilities must be an array`);
    } else {
      for (const capability of item.capabilities ?? []) {
        if (!capability || typeof capability !== 'object' || typeof capability.name !== 'string' || !capability.name.trim()) {
          errors.push(`${skillLabel}: ${name} capability requires a name`);
          continue;
        }
        const introduced = parseVersion(capability.introduced);
        if (!introduced) errors.push(`${skillLabel}: ${name} capability ${capability.name} has an invalid introduced SemVer`);
        else {
          if (Number.isSafeInteger(boundary) && introduced.major !== boundary) {
            errors.push(`${skillLabel}: ${name} capability ${capability.name} crosses major boundary ${boundary}`);
          }
          if (!parsedRanges.some((range) => rangeContains(range, capability.introduced) && Number.isSafeInteger(boundary) && rangeFitsMajor(range, boundary))) {
            errors.push(`${skillLabel}: ${name} capability ${capability.name} introduction is outside supported ranges`);
          }
        }
        const capabilityVerified = capability.verified_versions;
        if (!Array.isArray(capabilityVerified) || capabilityVerified.length === 0) {
          errors.push(`${skillLabel}: ${name} capability ${capability.name} requires verified_versions`);
          continue;
        }
        for (const version of capabilityVerified) {
          const parsed = parseVersion(version);
          if (!parsed) errors.push(`${skillLabel}: ${name} capability ${capability.name} has invalid verified SemVer ${String(version)}`);
          else if (!verified.includes(version)) errors.push(`${skillLabel}: ${name} capability ${capability.name} version ${version} is not package-verified`);
          else if (introduced && compareVersions(parsed, introduced) < 0) errors.push(`${skillLabel}: ${name} capability ${capability.name} is verified before it was introduced`);
        }
      }
    }
  }
}

export function validateSkillCompatibility({ root = repositoryRoot } = {}) {
  const errors = [];
  const groupPath = resolve(root, 'release-groups.json');
  let groups = [];
  let releaseGroupsAvailable = false;
  if (existsSync(groupPath)) {
    try {
      const config = JSON.parse(readFileSync(groupPath, 'utf8'));
      if (Array.isArray(config.groups)) {
        groups = config.groups;
        releaseGroupsAvailable = true;
      }
      else errors.push('release-groups.json must contain a groups array for skill compatibility validation');
    } catch (error) { errors.push(`release-groups.json is invalid JSON: ${error.message}`); }
  }
  for (const base of ['.opencode/skills', '.agents/skills']) {
    for (const skillPath of readSkillFiles(root, base, errors)) {
      const skillDir = dirname(skillPath);
      const skillLabel = relative(root, skillDir);
      const { role, packageScope, metadataPathRefs, malformedMetadata } = readSkillRole(skillPath);
      if (malformedMetadata) {
        errors.push(`${skillLabel}: metadata must be a mapping with a supported role`);
        continue;
      }
      validateSkillMetadataPaths(root, skillLabel, metadataPathRefs, errors);
      if (!['consumer', 'maintainer', 'general'].includes(role)) {
        errors.push(`${skillLabel}: unsupported skill role ${role}`);
        continue;
      }
      const sidecarPath = resolve(skillDir, 'compatibility.json');
      const hasSidecar = existsSync(sidecarPath);
      const packageAware = role === 'consumer' || (role === 'maintainer' && packageScope !== 'repository-wide');
      if (role === 'consumer' && !hasSidecar) errors.push(`${skillLabel}: consumer skill requires compatibility.json`);
      if (role === 'maintainer' && packageAware && !hasSidecar) errors.push(`${skillLabel}: package-scoped maintainer skill requires compatibility.json`);
      if (role === 'general' && hasSidecar) errors.push(`${skillLabel}: general-purpose skills cannot declare package compatibility`);
      if (hasSidecar && !releaseGroupsAvailable) errors.push(`${skillLabel}: release-groups.json is required to validate package membership`);
      if (hasSidecar) validateManifest(root, skillLabel, role, sidecarPath, groups, errors);
    }
  }
  return errors;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const errors = validateSkillCompatibility();
  if (errors.length) {
    console.error(`skill compatibility check failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log('skill compatibility check passed: skill roles and any package-scoped version metadata are consistent.');
}

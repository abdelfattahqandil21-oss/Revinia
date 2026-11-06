#!/usr/bin/env node
/** Validate required governance docs and the approved synchronized package groups. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSkillCompatibility } from './check-skill-compatibility.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredDocs = [
  'docs/engineering/README.md',
  'docs/engineering/RFC-ENGINEERING-GOVERNANCE.md',
  'docs/engineering/VERSIONING.md',
  'docs/engineering/VERSIONED-DOCUMENTATION.md',
  'docs/engineering/AI-SKILLS.md',
  'docs/engineering/TESTING-ARCHITECTURE.md',
  'docs/engineering/TASK-MEMORY.md',
  'docs/engineering/WORKTREES.md',
  'docs/engineering/CHANGELOG-POLICY.md',
  'docs/engineering/MIGRATION-PLAN.md',
  'docs/engineering/CHANGELOG.md',
  'docs/engineering/templates/task-record.md',
  'docs/engineering/templates/handoff.md',
];
const approvedMembers = ['@rivinia/menu', '@rivinia/select', '@rivinia/theme', '@rivinia/i18n', '@rivinia/popup', '@rivinia/datepicker', '@rivinia/env', '@rivinia/http', '@rivinia/modal', '@rivinia/table', '@rivinia/toast'];
const coreAdmissionDecision = 'D97';

function isExactSemver(version) {
  if (typeof version !== 'string') return false;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) return false;
  return !match[4] || match[4].split('.').every((identifier) => !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0'));
}

export function validateGovernance({ root = repositoryRoot } = {}) {
  const problems = [...validateSkillCompatibility({ root })];
  const read = (path) => readFileSync(join(root, path), 'utf8');
  const readJson = (path, label) => {
    try {
      return JSON.parse(read(path));
    } catch (error) {
      problems.push(`${label} is not valid JSON: ${error.message}`);
      return undefined;
    }
  };

  for (const path of requiredDocs) {
    if (!existsSync(join(root, path))) {
      problems.push(`missing required governance file: ${path}`);
      continue;
    }
    const body = read(path);
    if (path.endsWith('.md') && !path.includes('/templates/')) {
      if (!/^\*\*Owner:\*\*/m.test(body)) problems.push(`${path}: add an Owner field`);
      if (!/^\*\*Purpose:\*\*/m.test(body)) problems.push(`${path}: add a Purpose field`);
    }
  }

  const decisionsStubPath = 'docs/DECISIONS.md';
  const decisionsIndexPath = 'docs/decisions/README.md';
  const decisionsDir = join(root, 'docs', 'decisions');
  const decisionIds = new Set();
  if (!existsSync(join(root, decisionsStubPath))) {
    problems.push(`missing stable decision-log entry point: ${decisionsStubPath}`);
  } else if (!/\]\(decisions\/README\.md\)/.test(read(decisionsStubPath))) {
    problems.push(`${decisionsStubPath}: point to ${decisionsIndexPath}`);
  }
  if (!existsSync(join(root, decisionsIndexPath))) {
    problems.push(`missing decision index: ${decisionsIndexPath}`);
  }
  if (!existsSync(decisionsDir)) {
    problems.push('missing decision records directory: docs/decisions/');
  } else {
    const records = readdirSync(decisionsDir).filter((name) => name.endsWith('.md') && name !== 'README.md');
    if (records.length === 0) problems.push('docs/decisions/: no decision records found');
    for (const name of records) {
      const path = `docs/decisions/${name}`;
      const headings = [...read(path).matchAll(/^## \d{4}-\d{2}-\d{2} — (D\d+):/gm)];
      if (headings.length !== 1) {
        problems.push(`${path}: expected exactly one dated decision heading, found ${headings.length}`);
        continue;
      }
      const [, id] = headings[0];
      if (decisionIds.has(id)) problems.push(`${path}: duplicate decision ID ${id}`);
      decisionIds.add(id);
    }
    if (existsSync(join(root, decisionsIndexPath))) {
      const index = read(decisionsIndexPath);
      for (const id of decisionIds) {
        if (!new RegExp(`\\[${id}\\]\\(`).test(index)) {
          problems.push(`${decisionsIndexPath}: missing index row for ${id}`);
        }
      }
    }
  }

  const indexPath = 'docs/engineering/README.md';
  if (existsSync(join(root, indexPath))) {
    const index = read(indexPath);
    for (const [, target] of index.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|#)/.test(target)) continue;
      const local = target.split('#')[0];
      if (local && !existsSync(resolve(root, 'docs/engineering', local))) {
        problems.push(`engineering index link does not exist: ${target}`);
      }
    }
  }

  const config = readJson('release-groups.json', 'release-groups.json');
  const groups = config?.groups;
  if (!Array.isArray(groups)) {
    if (config !== undefined) problems.push('release-groups.json must contain a groups array');
  } else {
    const core = groups.find((group) => group?.id === 'rivinia-1.0');
    if (!core || core.policy !== 'synchronized-version') {
      problems.push('release-groups.json must declare the approved rivinia-1.0 synchronized group');
    }
    const actualCore = Array.isArray(core?.packages) ? core.packages : [];
    if (actualCore.length !== approvedMembers.length || approvedMembers.some((name) => !actualCore.includes(name))) {
      problems.push(`rivinia-1.0 members differ from owner-approved set: ${actualCore.join(', ')}`);
    }
    const popupAdmissionApproved = decisionIds.has(coreAdmissionDecision);
    if (!popupAdmissionApproved) problems.push(`rivinia-1.0 admission decision ${coreAdmissionDecision} is missing from docs/decisions/`);

    const ids = new Set();
    const packageOwners = new Map();
    for (const group of groups) {
      if (!group || typeof group !== 'object' || Array.isArray(group)) {
        problems.push('each release group must be an object');
        continue;
      }
      if (typeof group.id !== 'string' || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(group.id) || ids.has(group.id)) {
        problems.push(`release group id is missing, malformed or duplicated: ${String(group.id)}`);
      }
      ids.add(group.id);
      if (group.policy !== 'synchronized-version') problems.push(`${group.id}: unsupported release policy ${String(group.policy)}`);
      if (group.id !== 'rivinia-1.0') {
        if (typeof group.admissionDecision !== 'string' || !/^docs\/DECISIONS\.md#D\d+$/.test(group.admissionDecision)) {
          problems.push(`${group.id}: future groups require an admissionDecision reference to docs/DECISIONS.md`);
        } else {
          const decisionId = group.admissionDecision.split('#')[1];
          if (!decisionIds.has(decisionId)) {
            problems.push(`${group.id}: admission decision ${decisionId} is missing from docs/decisions/`);
          }
        }
      }
      if (!Array.isArray(group.packages) || group.packages.length === 0) {
        problems.push(`${group.id}: packages must be a non-empty array`);
        continue;
      }
      const versions = [];
      const localMembers = new Set();
      for (const name of group.packages) {
        if (typeof name !== 'string' || !/^@rivinia\/[a-z][a-z0-9-]*$/.test(name)) {
          problems.push(`${group.id}: malformed package name ${String(name)}`);
          continue;
        }
        if (localMembers.has(name)) problems.push(`${group.id}: duplicate package ${name}`);
        localMembers.add(name);
        if (packageOwners.has(name)) problems.push(`${name} belongs to both ${packageOwners.get(name)} and ${group.id}`);
        packageOwners.set(name, group.id);
        const short = name.slice('@rivinia/'.length);
        const manifestPath = `projects/${short}/package.json`;
        if (!existsSync(join(root, manifestPath))) {
          problems.push(`${group.id}: package manifest missing: ${manifestPath}`);
          continue;
        }
        const manifest = readJson(manifestPath, manifestPath);
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
          problems.push(`${manifestPath}: package metadata must be an object`);
          continue;
        }
        if (manifest.name !== name) problems.push(`${manifestPath}: expected package name ${name}, got ${String(manifest.name)}`);
        if (!isExactSemver(manifest.version)) problems.push(`${manifestPath}: version must be a valid SemVer, got ${String(manifest.version)}`);
        if (manifest.private === true) problems.push(`${manifestPath}: release-group packages cannot be private`);
        if (name === '@rivinia/popup' && popupAdmissionApproved && manifest.version === '0.0.0') continue;
        if (isExactSemver(manifest.version)) versions.push(`${name}@${manifest.version}`);
      }
      if (new Set(versions.map((entry) => entry.slice(entry.lastIndexOf('@') + 1))).size > 1) {
        problems.push(`${group.id} versions are not synchronized: ${versions.join(', ')}`);
      }
    }
  }

  const coreGroup = Array.isArray(groups) ? groups.find((group) => group?.id === 'rivinia-1.0') : undefined;
  if (coreGroup && Array.isArray(coreGroup.packages)) {
    const alignedMembers = coreGroup.packages
      .filter((name) => name !== '@rivinia/popup')
      .map((name) => {
        const short = name.slice('@rivinia/'.length);
        return readJson(`projects/${short}/package.json`, `projects/${short}/package.json`);
      })
      .filter(Boolean);
    const groupVersion = alignedMembers[0]?.version;
    if (typeof groupVersion === 'string' && isExactSemver(groupVersion)) {
      for (const name of ['@rivinia/select', '@rivinia/menu']) {
        const short = name.slice('@rivinia/'.length);
        const manifest = readJson(`projects/${short}/package.json`, `projects/${short}/package.json`);
        const actual = manifest?.dependencies?.['@rivinia/popup'];
        const popupVersion = readJson('projects/popup/package.json', 'projects/popup/package.json')?.version;
        const popupRange = typeof actual === 'string' && /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(actual);
        const popupRelease = typeof popupVersion === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(popupVersion);
        const compatible = popupRange && popupRelease
          && popupRange[1] === popupRelease[1]
          && (Number(popupRange[2]) < Number(popupRelease[2])
            || (Number(popupRange[2]) === Number(popupRelease[2]) && Number(popupRange[3]) <= Number(popupRelease[3])));
        if (!compatible) {
          problems.push(`projects/${short}/package.json: @rivinia/popup must be a regular caret dependency that accepts Popup ${String(popupVersion)}, got ${String(actual)}`);
        }
      }
    }
  }

  const versionPolicyPath = 'docs/engineering/VERSIONING.md';
  if (existsSync(join(root, versionPolicyPath))) {
    const versionPolicy = read(versionPolicyPath);
    for (const name of approvedMembers) {
      if (!versionPolicy.includes(`\`${name}\``)) problems.push(`VERSIONING.md does not document ${name}`);
    }
  }
  for (const path of ['AGENTS.md', 'projects/AGENTS.md', 'e2e/AGENTS.md', 'projects/env/AGENTS.md']) {
    if (!existsSync(join(root, path))) problems.push(`missing scoped agent instructions: ${path}`);
  }
  const taskTemplate = 'docs/engineering/templates/task-record.md';
  if (existsSync(join(root, taskTemplate))) {
    for (const field of ['Agent identity', 'Goal and scope', 'Branch / worktree', 'Base SHA', 'Owned paths', 'Verification', 'Next safe action']) {
      if (!read(taskTemplate).includes(`**${field}:**`)) problems.push(`task record template missing field: ${field}`);
    }
  }
  return problems;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const problems = validateGovernance();
  if (problems.length) {
    console.error(`check:governance failed (${problems.length} issue${problems.length === 1 ? '' : 's'}):`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    const config = JSON.parse(readFileSync(join(repositoryRoot, 'release-groups.json'), 'utf8'));
    const core = config.groups.find((group) => group.id === 'rivinia-1.0');
    const versions = core.packages.map((name) => {
      const short = name.slice('@rivinia/'.length);
      const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'projects', short, 'package.json'), 'utf8'));
      return `${name}@${manifest.version}`;
    });
    console.log(`check:governance passed: ${requiredDocs.length} governance files and ${core.packages.length} synchronized release-group packages (${versions.join(', ')}).`);
  }
}

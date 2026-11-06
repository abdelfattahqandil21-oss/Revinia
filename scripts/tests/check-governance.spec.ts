import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateGovernance } from '../check-governance.mjs';

const roots: string[] = [];
const members = [
  '@rivinia/menu', '@rivinia/select', '@rivinia/theme', '@rivinia/i18n', '@rivinia/popup',
  '@rivinia/datepicker', '@rivinia/env', '@rivinia/http', '@rivinia/toast', '@rivinia/modal', '@rivinia/table',
];
const groupVersion = '1.0.0';
const documents = [
  'README.md',
  'RFC-ENGINEERING-GOVERNANCE.md',
  'VERSIONING.md',
  'VERSIONED-DOCUMENTATION.md',
  'AI-SKILLS.md',
  'TESTING-ARCHITECTURE.md',
  'TASK-MEMORY.md',
  'WORKTREES.md',
  'CHANGELOG-POLICY.md',
  'MIGRATION-PLAN.md',
  'CHANGELOG.md',
  'templates/task-record.md',
  'templates/handoff.md',
];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'rv-governance-'));
  roots.push(root);
  for (const file of documents) {
    const path = join(root, 'docs', 'engineering', file);
    mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    const metadata = file.includes('/templates/') ? '' : '**Owner:** Test\n**Purpose:** Test fixture\n';
    const fields = file.endsWith('task-record.md')
      ? ['Agent identity', 'Goal and scope', 'Branch / worktree', 'Base SHA', 'Owned paths', 'Verification', 'Next safe action']
          .map((field) => `**${field}:**`)
          .join('\n')
      : '';
    writeFileSync(path, `${metadata}${fields}\n`);
  }
  writeFileSync(join(root, 'release-groups.json'), JSON.stringify({
    groups: [{ id: 'rivinia-1.0', policy: 'synchronized-version', packages: members }],
  }));
  for (const path of ['AGENTS.md', 'projects/AGENTS.md', 'e2e/AGENTS.md', 'projects/env/AGENTS.md']) {
    mkdirSync(join(root, path.slice(0, path.lastIndexOf('/'))), { recursive: true });
    writeFileSync(join(root, path), '# scoped instructions\n');
  }
  for (const name of members) {
    const short = name.replace('@rivinia/', '');
    mkdirSync(join(root, 'projects', short), { recursive: true });
    writeFileSync(join(root, 'projects', short, 'package.json'), JSON.stringify({ name, version: groupVersion, ...(name === '@rivinia/select' || name === '@rivinia/menu' ? { dependencies: { '@rivinia/popup': `^${groupVersion}` } } : {}) }));
  }
  writeFileSync(
    join(root, 'docs', 'engineering', 'VERSIONING.md'),
    `**Owner:** Test\n**Purpose:** Test fixture\n${members.map((name) => `\`${name}\``).join('\n')}`,
  );
  mkdirSync(join(root, 'docs', 'decisions'), { recursive: true });
  writeFileSync(join(root, 'docs', 'DECISIONS.md'), '[Decision index](decisions/README.md)\n');
  writeFileSync(join(root, 'docs', 'decisions', 'README.md'), '[D123](D123-test-decision.md)\n');
  writeFileSync(join(root, 'docs', 'decisions', 'D123-test-decision.md'), '## 2026-01-01 — D123: test decision\n');
  writeFileSync(join(root, 'docs', 'decisions', 'D095-test-decision.md'), '## 2026-01-01 — D95: popup admission\n');
  writeFileSync(join(root, 'docs', 'decisions', 'D097-test-decision.md'), '## 2026-01-01 — D97: synchronized all-library group\n');
  writeFileSync(join(root, 'docs', 'decisions', 'README.md'), '[D123](D123-test-decision.md)\n[D95](D095-test-decision.md)\n[D97](D097-test-decision.md)\n');
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('governance validation', () => {
  it('accepts the exact approved synchronized group and required documents', () => {
    expect(validateGovernance({ root: fixture() })).toEqual([]);
  });

  it('rejects a workspace version mismatch', () => {
    const root = fixture();
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.0.1' }));
    expect(validateGovernance({ root }).join('\n')).toContain('versions are not synchronized');
  });

  it('allows the approved popup at 0.0.0 during synchronized group development', () => {
    const root = fixture();
    writeFileSync(join(root, 'projects', 'popup', 'package.json'), JSON.stringify({ name: '@rivinia/popup', version: '0.0.0' }));
    for (const short of ['select', 'menu']) {
      const path = join(root, 'projects', short, 'package.json');
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      manifest.dependencies['@rivinia/popup'] = '^0.0.0';
      writeFileSync(path, JSON.stringify(manifest));
    }
    expect(validateGovernance({ root })).toEqual([]);
  });

  it('accepts a compatible Popup caret range and rejects a range that excludes its version', () => {
    const root = fixture();
    const path = join(root, 'projects', 'select', 'package.json');
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    manifest.dependencies['@rivinia/popup'] = '^1.0.0';
    writeFileSync(path, JSON.stringify(manifest));
    expect(validateGovernance({ root })).toEqual([]);
    manifest.dependencies['@rivinia/popup'] = '^2.0.0';
    writeFileSync(path, JSON.stringify(manifest));
    expect(validateGovernance({ root }).join('\n')).toContain('@rivinia/popup must be a regular caret dependency that accepts Popup 1.0.0');
  });

  it('rejects malformed package metadata instead of accepting matching arbitrary strings', () => {
    const root = fixture();
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/wrong', version: 'not-a-semver' }));
    const result = validateGovernance({ root }).join('\n');
    expect(result).toContain('expected package name @rivinia/menu');
    expect(result).toContain('valid SemVer');
  });

  it('reports a missing required governance document without throwing', () => {
    const root = fixture();
    rmSync(join(root, 'docs', 'engineering', 'MIGRATION-PLAN.md'));
    expect(validateGovernance({ root }).join('\n')).toContain('missing required governance file');
  });

  it('rejects malformed release-group structure', () => {
    const root = fixture();
    writeFileSync(join(root, 'release-groups.json'), '{invalid');
    expect(validateGovernance({ root }).join('\n')).toContain('release-groups.json is not valid JSON');
  });

  it('rejects an unsupported release-group policy', () => {
    const root = fixture();
    const config = JSON.parse(readFileSync(join(root, 'release-groups.json'), 'utf8'));
    config.groups[0].policy = 'calendar-major';
    writeFileSync(join(root, 'release-groups.json'), JSON.stringify(config));
    expect(validateGovernance({ root }).join('\n')).toContain('unsupported release policy calendar-major');
  });

  it('rejects package metadata that is not an object', () => {
    const root = fixture();
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify(['@rivinia/menu', groupVersion]));
    expect(validateGovernance({ root }).join('\n')).toContain('package metadata must be an object');
  });

  it('requires a decision record before adding another synchronized group', () => {
    const root = fixture();
    mkdirSync(join(root, 'projects', 'newlib'), { recursive: true });
    writeFileSync(join(root, 'projects', 'newlib', 'package.json'), JSON.stringify({ name: '@rivinia/newlib', version: '0.1.0' }));
    writeFileSync(
      join(root, 'release-groups.json'),
      JSON.stringify({
        groups: [
          { id: 'rivinia-1.0', policy: 'synchronized-version', packages: members },
          { id: 'newlib-sync', policy: 'synchronized-version', packages: ['@rivinia/newlib'] },
        ],
      }),
    );
    expect(validateGovernance({ root }).join('\n')).toContain('future groups require an admissionDecision');
  });

  it('resolves a stable decision-log reference to its split record', () => {
    const root = fixture();
    mkdirSync(join(root, 'projects', 'newlib'), { recursive: true });
    writeFileSync(join(root, 'projects', 'newlib', 'package.json'), JSON.stringify({ name: '@rivinia/newlib', version: '0.1.0' }));
    writeFileSync(
      join(root, 'release-groups.json'),
      JSON.stringify({
        groups: [
          { id: 'rivinia-1.0', policy: 'synchronized-version', packages: members },
          { id: 'newlib-sync', policy: 'synchronized-version', admissionDecision: 'docs/DECISIONS.md#D123', packages: ['@rivinia/newlib'] },
        ],
      }),
    );
    expect(validateGovernance({ root })).toEqual([]);
  });

  it('rejects an admission ID missing from the split decision records', () => {
    const root = fixture();
    mkdirSync(join(root, 'projects', 'newlib'), { recursive: true });
    writeFileSync(join(root, 'projects', 'newlib', 'package.json'), JSON.stringify({ name: '@rivinia/newlib', version: '0.1.0' }));
    writeFileSync(
      join(root, 'release-groups.json'),
      JSON.stringify({
        groups: [
          { id: 'rivinia-1.0', policy: 'synchronized-version', packages: members },
          { id: 'newlib-sync', policy: 'synchronized-version', admissionDecision: 'docs/DECISIONS.md#D999', packages: ['@rivinia/newlib'] },
        ],
      }),
    );
    expect(validateGovernance({ root }).join('\n')).toContain('admission decision D999 is missing from docs/decisions/');
  });
});

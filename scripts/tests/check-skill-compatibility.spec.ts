import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateSkillCompatibility } from '../check-skill-compatibility.mjs';

const roots: string[] = [];
function fixture(role = 'consumer') {
  const root = mkdtempSync(join(tmpdir(), 'rv-skill-compat-'));
  roots.push(root);
  mkdirSync(join(root, '.opencode', 'skills', 'example'), { recursive: true });
  mkdirSync(join(root, 'projects', 'menu'), { recursive: true });
  mkdirSync(join(root, 'docs', 'evidence'), { recursive: true });
  writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.0.0' }));
  writeFileSync(join(root, 'release-groups.json'), JSON.stringify({ groups: [{ id: 'rivinia-1.0', policy: 'synchronized-version', packages: ['@rivinia/menu'] }] }));
  writeFileSync(join(root, 'projects', 'menu', 'README.md'), '# Menu docs');
  writeFileSync(join(root, 'docs', 'evidence', 'menu.md'), '# Verified examples');
  writeFileSync(join(root, '.opencode', 'skills', 'example', 'SKILL.md'), `---\nname: example\nmetadata:\n  role: ${role}\n  package_scope: ${role === 'maintainer' ? 'package-specific' : 'consumer'}\n---\n`);
  const metadata = {
    role,
    packages: [{
      name: '@rivinia/menu',
      release_group: 'rivinia-1.0',
      supported_ranges: ['^1.0.0'],
      verified_versions: ['1.0.0'],
      compatibility_boundary: { major: 1 },
      documentation: {
        canonical_source: 'projects/menu/README.md',
        release_references: { '1.0.0': 'menu/v1.0.0' },
      },
      evidence: [{ version: '1.0.0', ref: 'docs/evidence/menu.md' }],
    }],
  };
  writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
  return { root, metadata };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('version-aware skill compatibility', () => {
  it('accepts package identity, support range, group, docs and evidence for an exact verified version', () => {
    const { root } = fixture();
    expect(validateSkillCompatibility({ root })).toEqual([]);
  });

  it('supports explicit prerelease ranges without treating the stable major range as an RC promise', () => {
    const { root, metadata } = fixture();
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.0.0-rc.2' }));
    metadata.packages[0].supported_ranges = ['>=1.0.0-rc.1 <2.0.0'];
    metadata.packages[0].verified_versions = ['1.0.0-rc.2'];
    metadata.packages[0].documentation.release_references = { '1.0.0-rc.2': 'menu/v1.0.0-rc.2' };
    metadata.packages[0].evidence = [{ version: '1.0.0-rc.2', ref: 'docs/evidence/menu.md' }];
    metadata.packages[0].capabilities = [{ name: 'exampleCapability', introduced: '1.0.0-rc.1', verified_versions: ['1.0.0-rc.2'] }];
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    expect(validateSkillCompatibility({ root })).toEqual([]);
  });

  it('does not require package metadata for general-purpose or repository-wide maintainer skills', () => {
    const root = mkdtempSync(join(tmpdir(), 'rv-skill-general-'));
    roots.push(root);
    mkdirSync(join(root, '.opencode', 'skills', 'general'), { recursive: true });
    writeFileSync(join(root, '.opencode', 'skills', 'general', 'SKILL.md'), '---\nname: general\n---\n');
    mkdirSync(join(root, '.opencode', 'skills', 'maintainer'), { recursive: true });
    writeFileSync(join(root, '.opencode', 'skills', 'maintainer', 'SKILL.md'), '---\nname: release\nmetadata:\n  role: maintainer\n  package_scope: repository-wide\n---\n');
    expect(validateSkillCompatibility({ root })).toEqual([]);
  });

  it('validates declared skill documentation references without requiring package-version metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'rv-skill-doc-refs-'));
    roots.push(root);
    mkdirSync(join(root, '.agents', 'skills', 'release'), { recursive: true });
    mkdirSync(join(root, 'docs', 'engineering'), { recursive: true });
    for (const name of ['VERSIONING.md', 'VERSIONED-DOCUMENTATION.md', 'TESTING-ARCHITECTURE.md']) {
      writeFileSync(join(root, 'docs', 'engineering', name), '# Policy');
    }
    const skillPath = join(root, '.agents', 'skills', 'release', 'SKILL.md');
    writeFileSync(skillPath, `---\nname: release\nmetadata:\n  role: maintainer\n  package_scope: repository-wide\n  supported_ranges_ref: docs/engineering/VERSIONING.md\n  documentation_refs: docs/engineering/VERSIONED-DOCUMENTATION.md\n  verification_refs: docs/engineering/TESTING-ARCHITECTURE.md\n  verified_versions_ref: exact release evidence only\n---\n`);
    expect(validateSkillCompatibility({ root })).toEqual([]);

    writeFileSync(skillPath, `---\nname: release\nmetadata:\n  role: maintainer\n  package_scope: repository-wide\n  supported_ranges_ref: docs/engineering/VERSIONING.md\n  documentation_refs: docs/engineering/VERSIONED-DOCUMENTATION.md\n  verification_refs: docs/engineering/missing.md\n  verified_versions_ref: exact release evidence only\n---\n`);
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('metadata.verification_refs must reference an existing repository file');
  });

  it('requires package metadata for consumer skills', () => {
    const { root } = fixture();
    rmSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'));
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('consumer skill requires compatibility.json');
  });

  it('fails closed when skill metadata is present but malformed instead of treating it as general-purpose', () => {
    const { root } = fixture();
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'SKILL.md'), '---\nname: example\nmetadata: consumer\n---\n');
    rmSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'));
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('metadata must be a mapping with a supported role');
  });

  it('rejects malformed package identity and SemVer declarations', () => {
    const { root, metadata } = fixture();
    metadata.packages[0].name = '@rivinia/MENU';
    metadata.packages[0].verified_versions = ['1.0.00'];
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('invalid package identity');
    metadata.packages[0].name = '@rivinia/menu';
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('valid exact SemVer');
  });

  it('rejects unsupported or malformed ranges and versions outside the declared range', () => {
    const { root, metadata } = fixture();
    metadata.packages[0].supported_ranges = ['^1.x', '>=1.0.0 <3.0.0', '>=1.0.0', '<=1.9.9'];
    metadata.packages[0].verified_versions = ['3.0.0'];
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    const errors = validateSkillCompatibility({ root }).join('\n');
    expect(errors).toContain('invalid supported version range');
    expect(errors).toContain('outside its supported ranges');
    expect(errors).toContain('crosses declared major boundary 1');
  });

  it('requires the correct release group and exact documentation tag per verified version', () => {
    const { root, metadata } = fixture();
    metadata.packages[0].release_group = 'other-group';
    metadata.packages[0].documentation.release_references['1.0.0'] = 'menu/v1.0.1';
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    const errors = validateSkillCompatibility({ root }).join('\n');
    expect(errors).toContain('release_group must be rivinia-1.0');
    expect(errors).toContain('must reference immutable tag menu/v1.0.0');
  });

  it('requires evidence references to exist for every verified version', () => {
    const { root, metadata } = fixture();
    metadata.packages[0].evidence[0].ref = 'docs/evidence/missing.md';
    writeFileSync(join(root, '.opencode', 'skills', 'example', 'compatibility.json'), JSON.stringify(metadata));
    expect(validateSkillCompatibility({ root }).join('\n')).toContain('evidence reference does not exist');
  });
});

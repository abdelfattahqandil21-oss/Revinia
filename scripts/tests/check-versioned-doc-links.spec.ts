import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { parseVersionedDocLinkOptions, validateVersionedDocLinks } from '../check-versioned-doc-links.mjs';

const roots: string[] = [];
function writeTarball(path: string, files: Record<string, string>) {
  const blocks: Buffer[] = [];
  for (const [name, body] of Object.entries(files)) {
    const content = Buffer.from(body);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf8');
    header.write('0000644\0', 100, 8, 'ascii');
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    header.write('00000000000\0', 136, 12, 'ascii');
    header.fill(0x20, 148, 156);
    header[156] = '0'.charCodeAt(0);
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    blocks.push(header, content, Buffer.alloc((512 - (content.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  writeFileSync(path, gzipSync(Buffer.concat(blocks)));
}

function fixture(ref = 'menu/v1.2.3', changelogVersion = '1.2.3') {
  const root = mkdtempSync(join(tmpdir(), 'rv-versioned-docs-'));
  roots.push(root);
  mkdirSync(join(root, 'projects', 'menu'), { recursive: true });
  mkdirSync(join(root, 'docs', 'menu'), { recursive: true });
  writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.2.3' }));
  writeFileSync(
    join(root, 'projects', 'menu', 'README.md'),
    `Package version: **1.2.3**\n[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/${ref}/docs/menu/api.md)\n`,
  );
  writeFileSync(join(root, 'projects', 'menu', 'CHANGELOG.md'), `## ${changelogVersion}\n`);
  writeFileSync(join(root, 'docs', 'menu', 'api.md'), '# API\n');
  return root;
}

function tagRelease(root: string) {
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test Fixture'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture release'], { cwd: root });
  execFileSync('git', ['tag', 'menu/v1.2.3'], { cwd: root });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('versioned package documentation links', () => {
  it('rejects unknown flags and conflicting package-directory/tarball inputs', () => {
    expect(parseVersionedDocLinkOptions(['--tarball=a.tgz', '--typo']).errors).toContain('unknown option --typo');
    expect(parseVersionedDocLinkOptions(['--package-dir=dist/menu', '--tarball=a.tgz']).errors).toContain(
      'choose either --package-dir or --tarball, not both',
    );
  });

  it('accepts matching version metadata and links pinned to the exact package tag', () => {
    const root = fixture();
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' })).toEqual([]);
  });

  it('rejects a moving main reference', () => {
    const root = fixture('main');
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'menu/v1.2.3',
    );
  });

  it('rejects tree/main and reference-style moving repository links', () => {
    const root = fixture();
    const path = join(root, 'projects', 'menu', 'README.md');
    writeFileSync(path, '[API]: https://github.com/abdelfattahqandil21-oss/Rivinia/tree/main/docs/menu/api.md\n');
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'menu/v1.2.3',
    );
  });

  it('rejects a moving link even when another repository link uses a valid pinned tag and owner casing differs', () => {
    const root = fixture();
    const path = join(root, 'projects', 'menu', 'README.md');
    writeFileSync(path, [
      'Package version: **1.2.3**',
      '[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/menu/v1.2.3/docs/menu/api.md)',
      '[Moving](https://github.com/AbdelfattahQandil21-oss/Rivinia/blob/main/docs/menu/api.md)',
      '',
    ].join('\n'));
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'repository file links must use menu/v1.2.3',
    );
  });

  it('accepts raw assets only when their path is pinned to the exact package tag', () => {
    const root = fixture();
    const path = join(root, 'projects', 'menu', 'README.md');
    writeFileSync(
      path,
      'Package version: **1.2.3**\n' +
        '[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/menu/v1.2.3/docs/menu/api.md)\n' +
        '[Raw API](https://raw.githubusercontent.com/abdelfattahqandil21-oss/Rivinia/menu/v1.2.3/docs/menu/api.md)\n',
    );
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' })).toEqual([]);
  });

  it('rejects raw assets on a moving branch', () => {
    const root = fixture();
    const path = join(root, 'projects', 'menu', 'README.md');
    writeFileSync(
      path,
      'Package version: **1.2.3**\n[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/menu/v1.2.3/docs/menu/api.md)\n[Logo](https://raw.githubusercontent.com/abdelfattahqandil21-oss/Rivinia/main/docs/menu/api.md)\n',
    );
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'asset links must use menu/v1.2.3',
    );
  });

  it('rejects a documentation link pinned to another release version', () => {
    const root = fixture('menu/v1.2.2');
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'menu/v1.2.3',
    );
  });

  it('rejects a README package-version mismatch', () => {
    const root = fixture();
    const path = join(root, 'projects', 'menu', 'README.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('Package version: **1.2.3**', 'Package version: **1.2.2**'));
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'README must state Package version: **1.2.3**',
    );
  });

  it('rejects malformed version strings before reading package files', () => {
    expect(validateVersionedDocLinks({ root: '/missing', packageName: '@rivinia/menu', version: 'not-semver' }).join('\n')).toContain(
      'valid exact SemVer',
    );
  });


  it('validates the README that is actually inside a packed tarball', () => {
    const root = fixture();
    const manifest = JSON.stringify({ name: '@rivinia/menu', version: '1.2.3' });
    const changelog = '## 1.2.3\n';
    const tarballPath = join(root, 'candidate.tgz');
    writeTarball(tarballPath, {
      'package/package.json': manifest,
      'package/CHANGELOG.md': changelog,
      'package/README.md': 'Package version: **1.2.3**\n[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/menu/v1.2.3/docs/menu/api.md)\n',
    });
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3', tarballPath })).toEqual([]);

    writeTarball(tarballPath, {
      'package/package.json': manifest,
      'package/CHANGELOG.md': changelog,
      'package/README.md': 'Package version: **1.2.3**\n[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/main/docs/menu/api.md)\n',
    });
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3', tarballPath }).join('\n')).toContain(
      'menu/v1.2.3',
    );
  });

  it('can require the exact Git tag to resolve to a clean HEAD', () => {
    const root = fixture();
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3', requireTag: true }).join('\n')).toContain(
      'release tag menu/v1.2.3 is missing or cannot be resolved',
    );
  });

  it('verifies the release tag manifest and linked documentation snapshot', () => {
    const root = fixture();
    tagRelease(root);
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3', verifyTagSnapshot: true })).toEqual([]);
  });

  it('rejects a release tag whose package manifest has a different version', () => {
    const root = fixture();
    tagRelease(root);
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.2.2' }));
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-qm', 'wrong tag manifest'], { cwd: root });
    execFileSync('git', ['tag', '-f', 'menu/v1.2.3'], { cwd: root });
    writeFileSync(join(root, 'projects', 'menu', 'package.json'), JSON.stringify({ name: '@rivinia/menu', version: '1.2.3' }));
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3', verifyTagSnapshot: true }).join('\n')).toContain(
      'package manifest does not match @rivinia/menu@1.2.3',
    );
  });

  it('rejects packed docs that do not match the documentation snapshot at the release tag', () => {
    const root = fixture();
    tagRelease(root);
    const tarballPath = join(root, 'snapshot.tgz');
    writeTarball(tarballPath, {
      'package/package.json': JSON.stringify({ name: '@rivinia/menu', version: '1.2.3' }),
      'package/CHANGELOG.md': '## 1.2.3\n',
      'package/README.md': 'Package version: **1.2.3**\n[API](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/menu/v1.2.3/docs/menu/api.md)\n\nChanged after the tag.\n',
    });
    expect(validateVersionedDocLinks({
      root, packageName: '@rivinia/menu', version: '1.2.3', tarballPath, verifyTagSnapshot: true,
    }).join('\n')).toContain('packed README does not match documentation snapshot menu/v1.2.3');
  });

  it('requires a changelog heading for the exact package release', () => {
    const root = fixture('menu/v1.2.3', '1.2.2');
    expect(validateVersionedDocLinks({ root, packageName: '@rivinia/menu', version: '1.2.3' }).join('\n')).toContain(
      'CHANGELOG.md must contain a heading for 1.2.3',
    );
  });
});

import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConsumerSmokeArgs, runConsumerSmoke } from '../consumer-smoke.mjs';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function setup() {
  const testRoot = mkdtempSync(join(tmpdir(), 'rivinia-consumer-runner-test-'));
  roots.push(testRoot);
  const root = join(testRoot, 'repo');
  mkdirSync(root);
  const fixture = join(root, 'fixture');
  mkdirSync(join(fixture, 'src'), { recursive: true });
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ scripts: { build: 'ng build' } }));
  const tarball = join(testRoot, 'rivinia-test.tgz');
  writeFileSync(tarball, 'fixture tarball bytes');
  const tempBase = join(testRoot, 'external-tmp');
  mkdirSync(tempBase);
  return { root, fixture, tarball, tempBase };
}

describe('packed consumer smoke lifecycle', () => {
  it('installs the exact tarball, builds in an external temp consumer, reports its hash, and cleans up', () => {
    const state = setup();
    const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const output: string[] = [];
    let generatedImports = '';
    const spawn = (command: string, args: string[], options: { cwd: string }) => {
      calls.push({ command, args, cwd: options.cwd });
      if (args[0] === 'install') {
        generatedImports = readFileSync(join(options.cwd, 'src/consumer-imports.ts'), 'utf8');
        writeFileSync(join(options.cwd, 'package-lock.json'), JSON.stringify({ packages: {
          'node_modules/@rivinia/test': { version: '1.2.3', resolved: `file:${state.tarball}` },
        } }));
      }
      return { status: 0, stdout: '', stderr: '' };
    };

    runConsumerSmoke({ ...state, tarballs: [state.tarball], specifiers: ['@rivinia/test'], spawn, write: (line) => output.push(line) });

    expect(calls).toHaveLength(3);
    expect(calls[1].args).toContain(state.tarball);
    expect(calls[1].cwd).not.toBe(state.fixture);
    expect(calls[2].args).toEqual(['run', 'build']);
    expect(generatedImports).toContain('from "@rivinia/test"');
    expect(output.join('\n')).toContain('1.2.3');
    expect(output.join('\n')).toMatch(/sha256:[a-f0-9]{64}/);
    expect(readFileSync(join(state.fixture, 'package.json'), 'utf8')).toContain('ng build');
    expect(readdirSync(state.tempBase)).toEqual([]);
  });

  it.each([
    { label: 'install', command: 'install' },
    { label: 'build', command: 'run' },
  ])('removes the temporary consumer when $label fails', ({ label, command }) => {
    const state = setup();
    const spawn = (_command: string, args: string[], options: { cwd: string }) => {
      if (args[0] === 'install' && label !== 'install') {
        writeFileSync(join(options.cwd, 'package-lock.json'), JSON.stringify({ packages: {
          'node_modules/@rivinia/test': { version: '1.2.3', resolved: `file:${state.tarball}` },
        } }));
      }
      return {
        status: args[0] === command ? 1 : 0,
        stdout: '',
        stderr: 'intentional failure',
      };
    };

    expect(() => runConsumerSmoke({ ...state, tarballs: [state.tarball], specifiers: ['@rivinia/test'], spawn, write: () => {} }))
      .toThrow(new RegExp(`npm ${command} failed`));
    expect(readdirSync(state.tempBase)).toEqual([]);
  });

  it('fails and cleans up when a declared optional package is installed', () => {
    const state = setup();
    const spawn = (_command: string, args: string[], options: { cwd: string }) => {
      if (args[0] === 'install') {
        writeFileSync(join(options.cwd, 'package-lock.json'), JSON.stringify({ packages: {
          'node_modules/@rivinia/test': { version: '1.2.3', resolved: `file:${state.tarball}` },
          'node_modules/@rivinia/optional': { version: '0.1.0' },
        } }));
      }
      return { status: 0, stdout: '', stderr: '' };
    };

    expect(() => runConsumerSmoke({ ...state, tarballs: [state.tarball], specifiers: ['@rivinia/test'], absentPackages: ['@rivinia/optional'], spawn, write: () => {} }))
      .toThrow(/must be absent but was installed/);
    expect(readdirSync(state.tempBase)).toEqual([]);
  });
});

describe('consumer smoke arguments', () => {
  it('requires at least one tarball and a package import or stylesheet', () => {
    expect(parseConsumerSmokeArgs([]).errors).toContain('at least one --tarball is required');
    expect(parseConsumerSmokeArgs(['--tarball', 'a.tgz']).errors).toContain('at least one --specifier or --style is required');
  });

  it('accepts repeated tarballs, imports and styles', () => {
    expect(parseConsumerSmokeArgs([
      '--tarball', 'a.tgz', '--tarball', 'b.tgz', '--specifier', '@rivinia/menu',
      '--specifier', '@rivinia/menu/ui', '--style', '@rivinia/theme/styles/theme.css',
      '--absent-package', '@rivinia/select',
    ])).toMatchObject({
      tarballs: ['a.tgz', 'b.tgz'],
      specifiers: ['@rivinia/menu', '@rivinia/menu/ui'],
      styles: ['@rivinia/theme/styles/theme.css'],
      absentPackages: ['@rivinia/select'],
      errors: [],
    });
  });
});

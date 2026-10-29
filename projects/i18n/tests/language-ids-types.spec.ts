import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Compile-time half of the language-id guard. The runtime half throws from
 * `RiviniaI18n`'s constructor (see `rivinia-i18n.spec.ts`); this suite proves
 * which *shapes* the type system can reject, because that is not something a
 * runtime assertion can show.
 *
 * The guard only sees a tuple — a `languages` list written inline. Hoisted
 * arrays widen, so the runtime check is the guarantee there. Both limits are
 * asserted below on purpose: if a future TypeScript or signature change starts
 * catching more, these tests fail and the docs get updated.
 */

const ROOT = process.cwd();
const FIXTURE = resolve(ROOT, 'tmp/language-ids-fixture');
const TSC = resolve(ROOT, 'node_modules/typescript/bin/tsc');
const PUBLIC_API = resolve(ROOT, 'projects/i18n/src/public-api.ts');

if (!existsSync(TSC)) throw new Error(`typescript not found at ${TSC}`);
if (!existsSync(PUBLIC_API)) throw new Error(`i18n source not found at ${PUBLIC_API}`);

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'bundler',
      experimentalDecorators: true,
      types: [],
      paths: { '@rivinia/i18n': ['../../../projects/i18n/src/public-api.ts'] },
    },
    include: ['*.ts'],
  },
  null,
  2,
);

const HEAD = [
  "import { defineRiviniaI18n, provideRiviniaI18n } from '@rivinia/i18n';",
  '',
  "const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;",
  "const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;",
  '',
].join('\n');

function compile(name: string, usage: string): { code: number; output: string } {
  const dir = join(FIXTURE, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'tsconfig.json'), TSCONFIG, 'utf8');
  writeFileSync(join(dir, 'usage.ts'), usage, 'utf8');
  const result = spawnSync(process.execPath, [TSC, '--noEmit', '-p', join(dir, 'tsconfig.json')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return {
    code: result.status ?? -1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

afterAll(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe('language ids — duplicate detection at write time', () => {
  it('rejects an inline duplicate through both entry points', () => {
    const result = compile(
      'rejected',
      `${HEAD}provideRiviniaI18n({ languages: [AR, EN, AR] });\ndefineRiviniaI18n({ languages: [EN, EN] });\n`,
    );
    expect(result.code, result.output).toBe(2);
    expect(result.output).toContain('duplicateLanguageId');
    // Each call site is reported, so the fix location is obvious.
    expect(result.output.match(/usage\.ts/g)?.length).toBe(2);
  });

  it('accepts unique inline lists and the documented explicit-union form', () => {
    const result = compile(
      'accepted',
      [
        HEAD,
        'provideRiviniaI18n({ languages: [AR, EN] });',
        "provideRiviniaI18n<'ar' | 'en'>({ languages: [AR, EN] });",
        'defineRiviniaI18n({ languages: [AR, EN] });',
        '',
      ].join('\n'),
    );
    expect(result.output).toBe('');
    expect(result.code).toBe(0);
  });

  it('leaves hoisted lists and the explicit-union form to the runtime check', () => {
    // Known limit, encoded so it cannot rot silently: arrays widened to
    // `Language[]` carry no positional information, so tsc cannot see the
    // duplicate. `RiviniaI18n`'s constructor still throws at bootstrap.
    const result = compile(
      'limit',
      [
        HEAD,
        'const LANGS = [AR, EN, AR];',
        'provideRiviniaI18n({ languages: LANGS });',
        "provideRiviniaI18n<'ar' | 'en'>({ languages: [AR, EN, AR] });",
        '',
      ].join('\n'),
    );
    expect(result.output).toBe('');
    expect(result.code).toBe(0);
  });
});

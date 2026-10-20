/**
 * The contract between the published type and the files the schematic writes.
 *
 * `@rivinia/env` ships no runtime code — its public API is the
 * `BaseEnvironment` type, and everything it does happens in the schematic.
 * So the thing worth testing is the seam between the two: the environment
 * file the schematic scaffolds must satisfy the type the package publishes.
 *
 * The test drives the COMPILED schematic (`schematics/ng-add/index.cjs`) —
 * the file that actually ships — so a drift between the scaffolded output
 * and the published contract fails here, not in a consumer's app.
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';

import type { BaseEnvironment } from '../src/lib/models/env-types';

// The schematic collection, relative to the workspace root the test runner
// works from. The schematic's own spec reaches the same file with
// `new URL('../collection.json', import.meta.url)` — but that form resolves
// against the test file, and this spec lives one folder higher.
const COLLECTION = 'projects/env/schematics/collection.json';

/** Reads the two contract fields out of a scaffolded environment file. */
function readEnvironment(source: string): BaseEnvironment | null {
  const match = /production:\s*(true|false),\s*\n\s*version:\s*'([^']*)',/.exec(source);
  if (!match) return null;
  return { production: match[1] === 'true', version: match[2] };
}

async function scaffold(environments: string[]): Promise<UnitTestTree> {
  const runner = new SchematicTestRunner('rivinia-env', COLLECTION);
  const tree = new UnitTestTree(new EmptyTree());
  tree.create('/package.json', JSON.stringify({ name: 'demo', version: '9.8.7' }));
  tree.create(
    '/angular.json',
    JSON.stringify({
      version: 1,
      defaultProject: 'demo',
      projects: { demo: { root: '', sourceRoot: 'src' } },
    }),
  );
  return runner.runSchematic('ng-add', { environments }, tree);
}

describe('the environment contract', () => {
  it('the scaffolded development environment satisfies BaseEnvironment', async () => {
    const tree = await scaffold(['dev']);
    const source = tree.readContent('/src/environments/environment.ts');
    const environment = readEnvironment(source);

    expect(environment).not.toBeNull();
    // Typed as BaseEnvironment: if the published contract changes shape, the
    // compiler fails here rather than a consumer's app.
    const typed: BaseEnvironment = environment!;
    expect(typed.production).toBe(false);
    expect(typed.version).toBe('9.8.7');
  });

  it('the scaffolded production environment is production-like', async () => {
    const tree = await scaffold(['prod']);
    const source = tree.readContent('/src/environments/environment.prod.ts');
    const environment = readEnvironment(source);

    expect(environment).not.toBeNull();
    const typed: BaseEnvironment = environment!;
    expect(typed.production).toBe(true);
    expect(typed.version).toBe('9.8.7');
  });
});

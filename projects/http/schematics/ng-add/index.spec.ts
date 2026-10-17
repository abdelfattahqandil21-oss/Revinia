import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';

const COLLECTION = new URL('../collection.json', import.meta.url).pathname;

function appTree(): UnitTestTree {
  const t = new EmptyTree();
  t.create(
    '/angular.json',
    JSON.stringify({
      version: 1,
      defaultProject: 'demo',
      projects: { demo: { root: '', sourceRoot: 'src', architect: {} } },
    }),
  );
  t.create(
    '/src/app/app.config.ts',
    `import { ApplicationConfig } from '@angular/core';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [],\n};\n`,
  );
  return new UnitTestTree(t);
}

async function run(options: object, base?: UnitTestTree) {
  const runner = new SchematicTestRunner('rivinia-http', COLLECTION);
  return runner.runSchematic('ng-add', options, base ?? appTree());
}

describe('ng-add', () => {
  it('inserts imports and both providers (bare, no unwrap config)', async () => {
    const tree = await run({});
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`import { provideHttpClient } from '@angular/common/http';`);
    expect(content).toContain(`import { provideRiviniaHttp } from '@rivinia/http';`);
    expect(content).toContain('provideHttpClient(),');
    expect(content).toContain('provideRiviniaHttp(),');
    expect(content).not.toContain('unwrap');
  });

  it('ignores legacy unwrap flags (removed in 0.5.0)', async () => {
    const tree = await run({ unwrap: true, unwrapKey: 'result' });
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain('provideRiviniaHttp(),');
    expect(content).not.toContain('unwrap');
  });

  it('is idempotent (second run changes nothing)', async () => {
    const once = await run({});
    const before = once.readContent('/src/app/app.config.ts');
    const twice = await run({}, once);
    expect(twice.readContent('/src/app/app.config.ts')).toBe(before);
  });

  it('warns and skips when app.config.ts is missing', async () => {
    const runner = new SchematicTestRunner('rivinia-http', COLLECTION);
    const t = new EmptyTree();
    t.create('/angular.json', JSON.stringify({ version: 1, projects: {} }));
    const tree = await runner.runSchematic('ng-add', {}, new UnitTestTree(t));
    expect(tree.files.length).toBe(1); // untouched
  });
});

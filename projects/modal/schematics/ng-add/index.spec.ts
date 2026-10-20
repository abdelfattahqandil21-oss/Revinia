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
  const runner = new SchematicTestRunner('rivinia-modal', COLLECTION);
  return runner.runSchematic('ng-add', options, base ?? appTree());
}

describe('ng-add', () => {
  it('does not duplicate an import the app already has in another shape', async () => {
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
      `import { injectRiviniaModal, provideRiviniaModal } from '@rivinia/modal';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [],\n};\n`,
    );
    const tree = await run({}, new UnitTestTree(t));
    const content = tree.readContent('/src/app/app.config.ts');
    const imports = content.split('\n').filter((line) => /^import\s/.test(line));
    // A SECOND import of the same symbol is TS2300, which breaks the build.
    expect(imports.filter((line) => line.includes('provideRiviniaModal'))).toHaveLength(1);
    // The provider call is still added — the app only had the import.
    expect(content).toContain('provideRiviniaModal(');
  });

  it('inserts the import and a bare provider by default', async () => {
    const tree = await run({});
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`import { provideRiviniaModal } from '@rivinia/modal';`);
    expect(content).toContain('provideRiviniaModal(),');
  });

  it('emits the strategy flag when given', async () => {
    const tree = await run({ strategy: 'queue' });
    expect(tree.readContent('/src/app/app.config.ts')).toContain(
      `provideRiviniaModal({ strategy: 'queue' }),`,
    );
  });

  it('rejects unknown strategies via schema validation', async () => {
    await expect(run({ strategy: 'heap' })).rejects.toThrow();
  });

  it('is idempotent (second run changes nothing)', async () => {
    const once = await run({ strategy: 'queue' });
    const before = once.readContent('/src/app/app.config.ts');
    const twice = await run({ strategy: 'queue' }, once);
    expect(twice.readContent('/src/app/app.config.ts')).toBe(before);
  });

  it('warns and skips when the workspace is unrecognized', async () => {
    const runner = new SchematicTestRunner('rivinia-modal', COLLECTION);
    const t = new EmptyTree();
    t.create('/angular.json', JSON.stringify({ version: 1, projects: {} }));
    const tree = await runner.runSchematic('ng-add', {}, new UnitTestTree(t));
    expect(tree.files.length).toBe(1); // untouched
  });
});

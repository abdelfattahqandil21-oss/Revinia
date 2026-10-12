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
  const runner = new SchematicTestRunner('rivinia-toast', COLLECTION);
  return runner.runSchematic('ng-add', options, base ?? appTree());
}

describe('ng-add', () => {
  it('inserts the import and a bare provider by default', async () => {
    const tree = await run({});
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`import { provideRiviniaToast } from '@rivinia/toast';`);
    expect(content).toContain('provideRiviniaToast(),');
  });

  it('emits duration and maxVisible when flagged', async () => {
    const tree = await run({ duration: 3000, maxVisible: 3 });
    expect(tree.readContent('/src/app/app.config.ts')).toContain(
      'provideRiviniaToast({ duration: 3000, maxVisible: 3 }),',
    );
  });

  it('emits duration 0 (falsy but explicit)', async () => {
    const tree = await run({ duration: 0 });
    expect(tree.readContent('/src/app/app.config.ts')).toContain(
      'provideRiviniaToast({ duration: 0 }),',
    );
  });

  it('is idempotent (second run changes nothing)', async () => {
    const once = await run({ duration: 3000 });
    const before = once.readContent('/src/app/app.config.ts');
    const twice = await run({ duration: 3000 }, once);
    expect(twice.readContent('/src/app/app.config.ts')).toBe(before);
  });

  it('warns and skips when the workspace is unrecognized', async () => {
    const runner = new SchematicTestRunner('rivinia-toast', COLLECTION);
    const t = new EmptyTree();
    t.create('/angular.json', JSON.stringify({ version: 1, projects: {} }));
    const tree = await runner.runSchematic('ng-add', {}, new UnitTestTree(t));
    expect(tree.files.length).toBe(1); // untouched
  });
});

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
  const runner = new SchematicTestRunner('rivinia-i18n', COLLECTION);
  return runner.runSchematic('ng-add', options, base ?? appTree());
}

describe('ng-add', () => {
  it('inserts the import and an ar starter by default', async () => {
    const tree = await run({});
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`import { provideRiviniaI18n } from '@rivinia/i18n';`);
    expect(content).toContain(`defaultLanguage: 'ar',`);
    expect(content).toContain(`{ id: 'en', nativeName: 'English', dir: 'ltr' },`);
    expect(content).not.toContain('detectBrowser');
  });

  it('honours defaultLanguage and detectBrowser flags', async () => {
    const tree = await run({ defaultLanguage: 'en', detectBrowser: true });
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`defaultLanguage: 'en',`);
    expect(content).toContain('detectBrowser: true');
  });

  it('is idempotent (second run changes nothing)', async () => {
    const once = await run({ detectBrowser: true });
    const before = once.readContent('/src/app/app.config.ts');
    const twice = await run({ detectBrowser: true }, once);
    expect(twice.readContent('/src/app/app.config.ts')).toBe(before);
  });

  it('warns and skips when the workspace is unrecognized', async () => {
    const runner = new SchematicTestRunner('rivinia-i18n', COLLECTION);
    const t = new EmptyTree();
    t.create('/angular.json', JSON.stringify({ version: 1, projects: {} }));
    const tree = await runner.runSchematic('ng-add', {}, new UnitTestTree(t));
    expect(tree.files.length).toBe(1); // untouched
  });
});

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
      `import { customLoader, provideRiviniaI18n } from '@rivinia/i18n';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [],\n};\n`,
    );
    const tree = await run({}, new UnitTestTree(t));
    const content = tree.readContent('/src/app/app.config.ts');
    const imports = content.split('\n').filter((line) => /^import\s/.test(line));
    // A SECOND import of the same symbol is TS2300, which breaks the build.
    expect(imports.filter((line) => line.includes('provideRiviniaI18n'))).toHaveLength(1);
    // The provider call is still added — the app only had the import.
    expect(content).toContain('provideRiviniaI18n(');
  });

  it('adds a value import when the app only has a type-only one', async () => {
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
      `import type { provideRiviniaI18n } from '@rivinia/i18n';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [],\n};\n`,
    );
    const tree = await run({}, new UnitTestTree(t));
    const content = tree.readContent('/src/app/app.config.ts');
    // A type-only import does not bind the value the provider call needs.
    expect(content).toContain(`import { provideRiviniaI18n } from '@rivinia/i18n';`);
    expect(content).toContain('provideRiviniaI18n(');
  });

  it('inserts the import and an ar starter by default', async () => {
    const tree = await run({});
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`import { provideRiviniaI18n } from '@rivinia/i18n';`);
    expect(content).toContain(`defaultLanguage: 'ar',`);
    expect(content).toContain(`{ id: 'en', nativeName: 'English', dir: 'ltr' },`);
    expect(content).not.toContain('detectBrowser');
    expect(content).toContain('public/i18n/{id}.json');
  });

  it('honours a language list and detectBrowser flag', async () => {
    const tree = await run({ languages: 'en, ar', detectBrowser: true });
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`defaultLanguage: 'en',`);
    expect(content).toContain('detectBrowser: true');
  });

  it('parses the exact messy input users type (quotes, spaces, case)', async () => {
    const tree = await run({ languages: `'ar' , 'en' , 'fr'` });
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`defaultLanguage: 'ar',`);
    expect(content).toContain(`{ id: 'ar', nativeName: 'العربية', dir: 'rtl' },`);
    expect(content).toContain(`{ id: 'en', nativeName: 'English', dir: 'ltr' },`);
    expect(content).toContain(`{ id: 'fr', nativeName: 'Français', dir: 'ltr' },`);
  });

  it('accepts bracketed arrays with or without quotes', async () => {
    const tree = await run({ languages: `[ar,fn , en ,du , it]` });
    const content = tree.readContent('/src/app/app.config.ts');
    expect(content).toContain(`defaultLanguage: 'ar',`);
    for (const id of ['ar', 'fn', 'en', 'du', 'it']) {
      expect(content).toContain(`{ id: '${id}',`);
    }
    const quoted = await run({ languages: `['ar', 'en']` });
    expect(quoted.readContent('/src/app/app.config.ts')).toContain(`defaultLanguage: 'ar',`);
  });

  it('rejects invalid ids instead of emitting broken code', async () => {
    await expect(run({ languages: 'ar, 123, en!!' })).rejects.toThrow(/invalid language id/);
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

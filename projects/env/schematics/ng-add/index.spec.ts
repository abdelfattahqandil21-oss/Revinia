import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';

const COLLECTION = new URL('../collection.json', import.meta.url).pathname;

function appTree(overrides?: {
  angularJson?: object;
  packageJson?: object;
  existingFiles?: Record<string, string>;
}): UnitTestTree {
  const t = new EmptyTree();
  t.create(
    '/angular.json',
    JSON.stringify(
      overrides?.angularJson ?? {
        version: 1,
        defaultProject: 'demo',
        projects: {
          demo: {
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                configurations: {
                  production: { budgets: [] },
                  development: {},
                },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  );
  t.create(
    '/package.json',
    JSON.stringify(overrides?.packageJson ?? { name: 'demo', version: '1.2.3' }),
  );
  t.create('/.gitignore', '/dist\n');
  t.create(
    '/src/app/app.config.ts',
    `export const appConfig = { providers: [] };\n`,
  );
  for (const [path, content] of Object.entries(overrides?.existingFiles ?? {})) {
    t.create(path, content);
  }
  return new UnitTestTree(t);
}

async function run(options: object, base?: UnitTestTree) {
  const runner = new SchematicTestRunner('rivinia-env', COLLECTION);
  return runner.runSchematic('ng-add', options, base ?? appTree());
}

function configurations(tree: UnitTestTree): Record<string, Record<string, unknown>> {
  const angular = JSON.parse(tree.readContent('/angular.json')) as {
    projects: Record<string, { architect: { build: { configurations: Record<string, Record<string, unknown>> } } }>;
  };
  return angular.projects['demo'].architect.build.configurations;
}

describe('ng-add', () => {
  it('creates the four files with the app version inlined', async () => {
    const tree = await run({});
    expect(tree.readContent('/src/environments/environment.model.ts')).toContain(
      'AppEnvironment',
    );
    expect(tree.readContent('/src/environments/environment.ts')).toContain(`version: '1.2.3'`);
    expect(tree.readContent('/src/environments/environment.staging.ts')).toContain(
      'production: true',
    );
    expect(tree.readContent('/src/environments/environment.prod.ts')).toContain(
      'https://api.example.com/api',
    );
  });

  it('creates staging config (from production) and both replacements', async () => {
    const tree = await run({});
    const configs = configurations(tree);
    expect(Object.keys(configs)).toContain('staging');
    expect(configs['staging']['fileReplacements']).toEqual([
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.staging.ts',
      },
    ]);
    expect(configs['production']['fileReplacements']).toEqual([
      {
        replace: 'src/environments/environment.ts',
        with: 'src/environments/environment.prod.ts',
      },
    ]);
    expect(configs['development']['outputPath']).toBe('builds/dev');
    expect(configs['development']['fileReplacements']).toBeUndefined();
  });

  it('never overwrites existing files but still wires missing config', async () => {
    const custom = `export const environment = { production: false, version: '9.9.9', apiUrl: 'x' };\n`;
    const tree = await run({}, appTree({ existingFiles: { '/src/environments/environment.ts': custom } }));
    expect(tree.readContent('/src/environments/environment.ts')).toBe(custom);
    expect(tree.readContent('/src/environments/environment.prod.ts')).toContain(`version: '1.2.3'`);
    expect(configurations(tree)['production']['fileReplacements']).toHaveLength(1);
  });

  it('scaffolds only the selected environments (prod only)', async () => {
    const tree = await run({ environments: ['production'] });
    expect(tree.exists('/src/environments/environment.model.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.prod.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.staging.ts')).toBe(false);
    const configs = configurations(tree);
    expect(Object.keys(configs)).not.toContain('staging');
    expect(configs['production']['fileReplacements']).toHaveLength(1);
  });

  it('dev only: files without any wiring', async () => {
    const tree = await run({ environments: ['development'] });
    expect(tree.exists('/src/environments/environment.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.prod.ts')).toBe(false);
    const configs = configurations(tree);
    expect('fileReplacements' in (configs['production'] ?? {})).toBe(false);
  });

  it('rejects unknown environment names via schema validation', async () => {
    await expect(run({ environments: ['preprod'] })).rejects.toThrow();
  });

  it('accepts short aliases (dev/prod/stag) and sets output dirs', async () => {
    const tree = await run({ environments: ['prod', 'dev'] });
    expect(tree.exists('/src/environments/environment.prod.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.staging.ts')).toBe(false);
    const configs = configurations(tree);
    expect(configs['production']['outputPath']).toBe('builds/prod');
    expect(configs['development']['outputPath']).toBe('builds/dev');
    expect(Object.keys(configs)).not.toContain('staging');
  });

  it('keeps customized outputPath and appends /builds to .gitignore once', async () => {
    const base = appTree();
    const angular = JSON.parse(base.readContent('/angular.json'));
    angular.projects['demo'].architect.build.configurations['production']['outputPath'] =
      'dist/custom';
    base.overwrite('/angular.json', JSON.stringify(angular, null, 2));
    const first = await run({}, base);
    const afterFirst = JSON.parse(first.readContent('/angular.json'));
    expect(afterFirst.projects['demo'].architect.build.configurations['production']['outputPath']).toBe(
      'dist/custom',
    );
    expect(afterFirst.projects['demo'].architect.build.configurations['staging']['outputPath']).toBe(
      'builds/stag',
    );
    expect(first.readContent('/.gitignore')).toContain('/builds');
    const second = await run({}, first);
    const gitignore = second.readContent('/.gitignore');
    expect(gitignore.match(/\/builds/g)?.length).toBe(1);
  });

  it('accepts comma-separated strings (CLI flag form)', async () => {
    const tree = await run({ environments: 'staging,production' });
    expect(tree.exists('/src/environments/environment.staging.ts')).toBe(true);
    expect(tree.exists('/src/environments/environment.prod.ts')).toBe(true);
    expect(Object.keys(configurations(tree))).toContain('staging');
  });

  it('throws a clear error on unknown names in string form', async () => {
    await expect(run({ environments: 'preprod' })).rejects.toThrow(/unknown environment/);
  });

  it('is idempotent (second run changes nothing)', async () => {
    const runner = new SchematicTestRunner('rivinia-env', COLLECTION);
    const once = await runner.runSchematic('ng-add', {}, appTree());
    const beforeAngular = once.readContent('/angular.json');
    const beforeEnv = once.readContent('/src/environments/environment.ts');
    const twice = await runner.runSchematic('ng-add', {}, once);
    expect(twice.readContent('/angular.json')).toBe(beforeAngular);
    expect(twice.readContent('/src/environments/environment.ts')).toBe(beforeEnv);
  });

  it('does not duplicate pre-existing replacements', async () => {
    const tree = await run(
      {},
      appTree({
        angularJson: {
          version: 1,
          defaultProject: 'demo',
          projects: {
            demo: {
              root: '',
              sourceRoot: 'src',
              architect: {
                build: {
                  configurations: {
                    production: {
                      fileReplacements: [
                        {
                          replace: 'src/environments/environment.ts',
                          with: 'src/environments/environment.prod.ts',
                        },
                      ],
                    },
                    development: {},
                  },
                },
              },
            },
          },
        },
      }),
    );
    expect(configurations(tree)['production']['fileReplacements']).toHaveLength(1);
  });

  it('falls back to 0.0.0 without a parsable package.json version', async () => {
    const tree = await run({}, appTree({ packageJson: { name: 'demo' } }));
    expect(tree.readContent('/src/environments/environment.ts')).toContain(`version: '0.0.0'`);
  });

  it('warns and skips unknown projects without touching anything', async () => {
    const runner = new SchematicTestRunner('rivinia-env', COLLECTION);
    const base = appTree();
    const before = base.readContent('/angular.json');
    const tree = await runner.runSchematic('ng-add', { project: 'ghost' }, base);
    expect(tree.readContent('/angular.json')).toBe(before);
    expect(tree.files).not.toContain('/src/environments/environment.ts');
  });
});

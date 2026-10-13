import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

export interface NgAddOptions {
  project?: string;
}

interface FileDef {
  name: string;
  content: (version: string) => string;
}

const MODEL_FILE = `import type { BaseEnvironment } from '@rivinia/env';

/**
 * Application environment contract. Extend with your own fields
 * (apiUrl, keys, feature flags, …) — nothing else in the app should
 * import environment values except through this type.
 */
export interface AppEnvironment extends BaseEnvironment {
  /** Base URL for API calls (per-environment value below). */
  readonly apiUrl: string;
}
`;

const fileDefs = (sourceRoot: string): FileDef[] => [
  { name: `${sourceRoot}/environments/environment.model.ts`, content: () => MODEL_FILE },
  {
    name: `${sourceRoot}/environments/environment.ts`,
    content: (version: string) =>
      `import type { AppEnvironment } from './environment.model';\n\n` +
      `/** Development defaults. Used as-is by the \`development\` configuration. */\n` +
      `export const environment: AppEnvironment = {\n` +
      `  production: false,\n` +
      `  version: '${version}',\n` +
      `  apiUrl: 'http://localhost:3000/api',\n` +
      `};\n`,
  },
  {
    name: `${sourceRoot}/environments/environment.staging.ts`,
    content: (version: string) =>
      `import type { AppEnvironment } from './environment.model';\n\n` +
      `/** Staging mirrors production. Wired via the \`staging\` configuration. */\n` +
      `export const environment: AppEnvironment = {\n` +
      `  production: true,\n` +
      `  version: '${version}',\n` +
      `  apiUrl: 'https://staging.example.com/api',\n` +
      `};\n`,
  },
  {
    name: `${sourceRoot}/environments/environment.prod.ts`,
    content: (version: string) =>
      `import type { AppEnvironment } from './environment.model';\n\n` +
      `export const environment: AppEnvironment = {\n` +
      `  production: true,\n` +
      `  version: '${version}',\n` +
      `  apiUrl: 'https://api.example.com/api',\n` +
      `};\n`,
  },
];

/**
 * `ng add @rivinia/env` — scaffolds typed environment files and wires
 * development/staging/production configurations with file replacements.
 *
 * - Never overwrites existing files (each file skipped individually).
 * - Never removes user configuration: only ADDS missing fileReplacements
 *   (matched by replace+with pair) and creates a `staging` configuration
 *   (copied from `production` when present) if absent.
 * - `development` intentionally gets no replacement (CLI standard: it uses
 *   `environment.ts` directly).
 * - App version is snapshotted from the app's `package.json` (`0.0.0` fallback).
 */
export function ngAdd(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree, context, options.project);
    if (!workspace) return tree;
    const { name, project, angular } = workspace;

    const sourceRoot = project.sourceRoot ?? (project.root ? `${project.root}/src` : 'src');
    const version = readAppVersion(tree);
    const configsSnapshot = (): string =>
      JSON.stringify(project.architect?.build?.configurations ?? null);
    const configsBefore = configsSnapshot();

    let created = 0;
    for (const file of fileDefs(sourceRoot)) {
      const path = `/${file.name}`;
      if (tree.exists(path)) {
        context.logger.info(`[rivinia/env] exists, skipped: ${path}`);
        continue;
      }
      tree.create(path, file.content(version));
      created++;
    }

    ensureReplacement(tree, angular, name, 'production', {
      replace: `${sourceRoot}/environments/environment.ts`,
      with: `${sourceRoot}/environments/environment.prod.ts`,
    });
    ensureStaging(tree, angular, name, sourceRoot, context);

    if (created > 0 || configsSnapshot() !== configsBefore) {
      tree.overwrite('/angular.json', JSON.stringify(angular, null, 2) + '\n');
    }
    context.logger.info(
      `[rivinia/env] ${created} file(s) created, configurations wired for '${name}'.`,
    );
    return tree;
  };
}

interface ProjectDef {
  root?: string;
  sourceRoot?: string;
  architect?: {
    build?: {
      configurations?: Record<string, Record<string, unknown>>;
    };
  };
}

function readWorkspace(
  tree: Tree,
  context: SchematicContext,
  requested?: string,
): { name: string; project: ProjectDef; angular: {
  projects?: Record<string, ProjectDef>;
  defaultProject?: string;
} } | null {
  let angular: {
    projects?: Record<string, ProjectDef>;
    defaultProject?: string;
  };
  try {
    const raw = tree.read('/angular.json')?.toString('utf-8');
    if (!raw) throw new SchematicsException('angular.json not found.');
    angular = JSON.parse(raw) as {
      projects?: Record<string, ProjectDef>;
      defaultProject?: string;
    };
  } catch (error) {
    context.logger.warn(
      `[rivinia/env] cannot read angular.json (${error instanceof Error ? error.message : error}) — skipping.`,
    );
    return null;
  }
  const names = Object.keys(angular.projects ?? {});
  if (names.length === 0) {
    context.logger.warn('[rivinia/env] no projects in angular.json — skipping.');
    return null;
  }
  // NOTE: the schema default for `project` is "" (engine-filled), so only a
  // non-empty value counts as an explicit request. (`??` alone would honor "".)
  const name =
    requested && requested.length > 0
      ? requested
      : angular.defaultProject && typeof angular.defaultProject === 'string'
        ? angular.defaultProject
        : names[0];
  const project = angular.projects?.[name];
  if (!project) {
    context.logger.warn(`[rivinia/env] project '${name}' not found — skipping.`);
    return null;
  }
  return { name, project, angular };
}

function readAppVersion(tree: Tree): string {
  try {
    const raw = tree.read('/package.json')?.toString('utf-8');
    if (!raw) return '0.0.0';
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' && parsed.version.length > 0
      ? parsed.version
      : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getConfigurations(
  angular: { projects?: Record<string, ProjectDef> },
  name: string,
): Record<string, Record<string, unknown>> {
  const project = angular.projects?.[name];
  if (!project) throw new SchematicsException(`[rivinia/env] project '${name}' not found.`);
  project.architect ??= {};
  project.architect.build ??= {};
  const build = project.architect.build as { configurations?: Record<string, Record<string, unknown>> };
  build.configurations ??= {};
  return build.configurations;
}

function ensureReplacement(
  tree: Tree,
  angular: { projects?: Record<string, ProjectDef> },
  name: string,
  configuration: string,
  entry: { replace: string; with: string },
): void {
  if (!tree.exists('/angular.json')) return;
  const configurations = getConfigurations(angular, name);
  const target = configurations[configuration];
  if (!target) return; // never create production/development for the user
  const list = target['fileReplacements'];
  if (!Array.isArray(list)) {
    target['fileReplacements'] = [{ ...entry }];
    return;
  }
  const exists = list.some(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      (item as Record<string, unknown>)['replace'] === entry.replace &&
      (item as Record<string, unknown>)['with'] === entry.with,
  );
  if (!exists) list.push({ ...entry });
}

function ensureStaging(
  tree: Tree,
  angular: { projects?: Record<string, ProjectDef> },
  name: string,
  sourceRoot: string,
  context: SchematicContext,
): void {
  if (!tree.exists('/angular.json')) return;
  const configurations = getConfigurations(angular, name);
  if (!configurations['staging']) {
    const production = configurations['production'];
    const copy: Record<string, unknown> =
      production && typeof production === 'object' ? { ...production } : {};
    delete copy['fileReplacements'];
    delete copy['outputPath'];
    configurations['staging'] = copy;
    context.logger.info('[rivinia/env] created `staging` configuration.');
  }
  ensureReplacement(tree, angular, name, 'staging', {
    replace: `${sourceRoot}/environments/environment.ts`,
    with: `${sourceRoot}/environments/environment.staging.ts`,
  });
}

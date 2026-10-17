import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';

export interface NgAddOptions {
  project?: string;
}

const HTTP_CLIENT_IMPORT = `import { provideHttpClient } from '@angular/common/http';`;
const PROVIDE_HTTP_IMPORT = `import { provideRiviniaHttp } from '@rivinia/http';`;

/**
 * `ng add @rivinia/http` — wires the library into a standalone app config.
 *
 * - Never overwrites user files; only inserts two imports + two providers.
 * - Idempotent: safe to run twice (existing entries are detected and skipped).
 * - Never provides the backend beyond `provideHttpClient()`; interceptors,
 *   URLs and per-request unwrap options stay app-owned. Unwrapping is
 *   strictly per call (`{ unwrap: true, unwrapKey }`) — the schematic emits
 *   no unwrap configuration.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let configPath: string | null;
    try {
      configPath = findAppConfig(tree, options.project);
    } catch (error) {
      context.logger.warn(
        `[rivinia/http] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
          `Add provideHttpClient() and provideRiviniaHttp() manually (see README).`,
      );
      return tree;
    }
    if (!configPath || !tree.exists(configPath)) {
      context.logger.warn(
        `[rivinia/http] app.config.ts not found — skipping. ` +
          `Add provideHttpClient() and provideRiviniaHttp() manually (see README).`,
      );
      return tree;
    }

    let content = tree.read(configPath)?.toString('utf-8') ?? '';
    if (!content) {
      throw new SchematicsException(`[rivinia/http] ${configPath} is empty.`);
    }

    // Unwrapping is strictly per request (`{ unwrap: true, unwrapKey }`) —
    // the schematic emits no unwrap configuration. URLs are never touched:
    // the caller owns them (environment, joinUrl, …).

    let changed = false;
    if (!content.includes(HTTP_CLIENT_IMPORT)) {
      content = insertAfterLastImport(content, HTTP_CLIENT_IMPORT);
      changed = true;
    }
    if (!content.includes(PROVIDE_HTTP_IMPORT)) {
      content = insertAfterLastImport(content, PROVIDE_HTTP_IMPORT);
      changed = true;
    }
    if (!content.includes('provideHttpClient(')) {
      content = insertProvider(content, 'provideHttpClient()');
      changed = true;
    } else {
      context.logger.info('[rivinia/http] provideHttpClient() already present — skipped.');
    }
    const provideCall = `provideRiviniaHttp()`;
    if (!content.includes('provideRiviniaHttp(')) {
      content = insertProvider(content, provideCall);
      changed = true;
    } else {
      context.logger.info('[rivinia/http] provideRiviniaHttp() already present — skipped.');
    }

    if (changed) {
      tree.overwrite(configPath, content);
      context.logger.info(`[rivinia/http] wired into ${configPath}.`);
    }
    return tree;
  };
}

function defaultProjectName(tree: Tree, requested?: string): string {
  if (requested) return requested;
  const angularJson = tree.read('/angular.json')?.toString('utf-8');
  if (!angularJson) {
    throw new SchematicsException('[rivinia/http] angular.json not found.');
  }
  const workspace = JSON.parse(angularJson) as {
    defaultProject?: string;
    projects?: Record<string, unknown>;
  };
  if (workspace.defaultProject && typeof workspace.defaultProject === 'string') {
    return workspace.defaultProject;
  }
  const names = Object.keys(workspace.projects ?? {});
  if (names.length === 0) {
    throw new SchematicsException('[rivinia/http] no projects in angular.json.');
  }
  return names[0];
}

function findAppConfig(tree: Tree, requestedProject?: string): string | null {
  const angularJson = tree.read('/angular.json')?.toString('utf-8');
  if (!angularJson) return null;
  const workspace = JSON.parse(angularJson) as {
    projects?: Record<string, { sourceRoot?: string; root?: string }>;
  };
  const name = defaultProjectName(tree, requestedProject);
  const project = workspace.projects?.[name];
  if (!project) return null;
  const sourceRoot = project.sourceRoot ?? (project.root ? `${project.root}/src` : 'src');
  return `/${sourceRoot}/app/app.config.ts`;
}

function insertAfterLastImport(content: string, line: string): string {
  const lines = content.split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) idx = i;
  }
  lines.splice(idx + 1, 0, line);
  return lines.join('\n');
}

function insertProvider(content: string, call: string): string {
  const match = /providers\s*:\s*\[/.exec(content);
  if (!match) {
    throw new SchematicsException(
      '[rivinia/http] no `providers: [` array found in app.config.ts — add providers manually.',
    );
  }
  const at = match.index + match[0].length;
  return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

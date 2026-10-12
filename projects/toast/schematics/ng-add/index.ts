import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

export interface NgAddOptions {
  duration?: number;
  maxVisible?: number;
  project?: string;
}

const PROVIDE_IMPORT = `import { provideRiviniaToast } from '@rivinia/toast';`;

/**
 * `ng add @rivinia/toast` — wires the library into a standalone app config.
 *
 * - Never overwrites user files; only inserts one import + one provider.
 * - Idempotent: safe to run twice (existing entries are detected and skipped).
 * - No prompts by design: duration/maxVisible are one-line edits, and every
 *   extra question is a papercut. Pass `--duration` / `--max-visible` flags
 *   or edit the emitted call afterwards.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let configPath: string | null;
    try {
      configPath = findAppConfig(tree, options.project);
    } catch (error) {
      context.logger.warn(
        `[rivinia/toast] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
          `Add provideRiviniaToast() manually (see README).`,
      );
      return tree;
    }
    if (!configPath || !tree.exists(configPath)) {
      context.logger.warn(
        `[rivinia/toast] app.config.ts not found — skipping. ` +
          `Add provideRiviniaToast() manually (see README).`,
      );
      return tree;
    }

    let content = tree.read(configPath)?.toString('utf-8') ?? '';
    if (!content) {
      throw new SchematicsException(`[rivinia/toast] ${configPath} is empty.`);
    }

    const parts: string[] = [];
    if (options.duration !== undefined) parts.push(`duration: ${options.duration}`);
    if (options.maxVisible !== undefined) parts.push(`maxVisible: ${options.maxVisible}`);
    const provideCall = `provideRiviniaToast(${parts.length > 0 ? `{ ${parts.join(', ')} }` : ''})`;

    let changed = false;
    if (!content.includes(PROVIDE_IMPORT)) {
      content = insertAfterLastImport(content, PROVIDE_IMPORT);
      changed = true;
    }
    if (!content.includes('provideRiviniaToast(')) {
      content = insertProvider(content, provideCall);
      changed = true;
    } else {
      context.logger.info('[rivinia/toast] provideRiviniaToast() already present — skipped.');
    }

    if (changed) {
      tree.overwrite(configPath, content);
      context.logger.info(`[rivinia/toast] wired into ${configPath}.`);
    }
    return tree;
  };
}

function defaultProjectName(tree: Tree, requested?: string): string {
  if (requested) return requested;
  const angularJson = tree.read('/angular.json')?.toString('utf-8');
  if (!angularJson) {
    throw new SchematicsException('[rivinia/toast] angular.json not found.');
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
    throw new SchematicsException('[rivinia/toast] no projects in angular.json.');
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
      '[rivinia/toast] no `providers: [` array found in app.config.ts — add providers manually.',
    );
  }
  const at = match.index + match[0].length;
  return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

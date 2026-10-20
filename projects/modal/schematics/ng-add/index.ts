import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

export interface NgAddOptions {
  strategy?: 'stack' | 'queue';
  project?: string;
}

const PROVIDE_IMPORT = `import { provideRiviniaModal } from '@rivinia/modal';`;

/**
 * `ng add @rivinia/modal` — wires the manager into a standalone app config.
 *
 * - Never overwrites user files; only inserts one import + one provider.
 * - Idempotent: safe to run twice. No prompts by design (strategy is a
 *   one-line edit; pass `--strategy queue` or edit afterwards).
 * - Rendering outlet (`<rv-modal-outlet/>` in a future `/ui` entry) is a
 *   layout decision the schematic never makes for you.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let configPath: string | null;
    try {
      configPath = findAppConfig(tree, options.project);
    } catch (error) {
      context.logger.warn(
        `[rivinia/modal] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
          `Add provideRiviniaModal() manually (see README).`,
      );
      return tree;
    }
    if (!configPath || !tree.exists(configPath)) {
      context.logger.warn(
        `[rivinia/modal] app.config.ts not found — skipping. ` +
          `Add provideRiviniaModal() manually (see README).`,
      );
      return tree;
    }

    let content = tree.read(configPath)?.toString('utf-8') ?? '';
    if (!content) {
      throw new SchematicsException(`[rivinia/modal] ${configPath} is empty.`);
    }

    const provideCall =
      options.strategy !== undefined ? `provideRiviniaModal({ strategy: '${options.strategy}' })` : 'provideRiviniaModal()';

    let changed = false;
    if (!importsValue(content, '@rivinia/modal', 'provideRiviniaModal')) {
      content = insertAfterLastImport(content, PROVIDE_IMPORT);
      changed = true;
    }
    if (!content.includes('provideRiviniaModal(')) {
      content = insertProvider(content, provideCall);
      changed = true;
    } else {
      context.logger.info('[rivinia/modal] provideRiviniaModal() already present — skipped.');
    }

    if (changed) {
      tree.overwrite(configPath, content);
      context.logger.info(`[rivinia/modal] wired into ${configPath}.`);
    }
    return tree;
  };
}

function defaultProjectName(tree: Tree, requested?: string): string {
  if (requested) return requested;
  const angularJson = tree.read('/angular.json')?.toString('utf-8');
  if (!angularJson) {
    throw new SchematicsException('[rivinia/modal] angular.json not found.');
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
    throw new SchematicsException('[rivinia/modal] no projects in angular.json.');
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
      '[rivinia/modal] no `providers: [` array found in app.config.ts — add providers manually.',
    );
  }
  const at = match.index + match[0].length;
  return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

/**
 * Whether the file already binds `symbol` as a VALUE imported from `module`.
 *
 * A plain `content.includes(IMPORT_LINE)` recognises only ONE shape of the
 * import — `import { symbol } from 'module';`. An app that imports the
 * symbol beside others (`import { other, symbol } from 'module';`) would be
 * given a SECOND import of the same symbol, and its build would then fail
 * with "Duplicate identifier" (TS2300).
 *
 * An aliased or a type-only import does not bind the name we need, so it
 * does not count as present.
 */
function importsValue(content: string, module: string, symbol: string): boolean {
  const pattern = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(pattern)) {
    if (match[2] !== module) continue;
    if (/^\s*import\s+type\s/.test(match[0])) continue; // a type-only import
    for (const entry of match[1].split(',')) {
      const raw = entry.trim();
      if (!raw || /^type\s/.test(raw)) continue; // a type-only specifier
      const local = raw.split(/\s+as\s+/).pop()!.trim();
      if (local === symbol) return true;
    }
  }
  return false;
}

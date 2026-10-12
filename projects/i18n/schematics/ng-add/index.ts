import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

export interface NgAddOptions {
  defaultLanguage?: string;
  detectBrowser?: boolean;
  project?: string;
}

const PROVIDE_IMPORT = `import { provideRiviniaI18n } from '@rivinia/i18n';`;

const STARTER = (defaultLanguage: string, detectBrowser: boolean): string => {
  const detect = detectBrowser ? ',\n    detectBrowser: true' : '';
  return (
    `provideRiviniaI18n({\n` +
    `    defaultLanguage: '${defaultLanguage}',\n` +
    `    languages: [\n` +
    `      { id: 'ar', nativeName: 'العربية', dir: 'rtl' },\n` +
    `      { id: 'en', nativeName: 'English', dir: 'ltr' },\n` +
    `    ],${detect}\n` +
    `  })`
  );
};

/**
 * `ng add @rivinia/i18n` — wires a starter bilingual config.
 *
 * - Emits an editable ar/en starter (default language + optional detection).
 *   Real apps replace the list with their own languages afterwards.
 * - Never overwrites user files; idempotent; warn-skips unknown layouts
 *   without failing installs.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    let configPath: string | null;
    try {
      configPath = findAppConfig(tree, options.project);
    } catch (error) {
      context.logger.warn(
        `[rivinia/i18n] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
          `Add provideRiviniaI18n() manually (see README).`,
      );
      return tree;
    }
    if (!configPath || !tree.exists(configPath)) {
      context.logger.warn(
        `[rivinia/i18n] app.config.ts not found — skipping. ` +
          `Add provideRiviniaI18n() manually (see README).`,
      );
      return tree;
    }

    let content = tree.read(configPath)?.toString('utf-8') ?? '';
    if (!content) {
      throw new SchematicsException(`[rivinia/i18n] ${configPath} is empty.`);
    }

    let changed = false;
    if (!content.includes(PROVIDE_IMPORT)) {
      content = insertAfterLastImport(content, PROVIDE_IMPORT);
      changed = true;
    }
    if (!content.includes('provideRiviniaI18n(')) {
      const call = STARTER(
        options.defaultLanguage && options.defaultLanguage.length > 0
          ? options.defaultLanguage
          : 'ar',
        options.detectBrowser === true,
      );
      content = insertProvider(content, call);
      changed = true;
    } else {
      context.logger.info('[rivinia/i18n] provideRiviniaI18n() already present — skipped.');
    }

    if (changed) {
      tree.overwrite(configPath, content);
      context.logger.info(`[rivinia/i18n] wired into ${configPath}.`);
    }
    return tree;
  };
}

function defaultProjectName(tree: Tree, requested?: string): string {
  if (requested) return requested;
  const angularJson = tree.read('/angular.json')?.toString('utf-8');
  if (!angularJson) {
    throw new SchematicsException('[rivinia/i18n] angular.json not found.');
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
    throw new SchematicsException('[rivinia/i18n] no projects in angular.json.');
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
      '[rivinia/i18n] no `providers: [` array found in app.config.ts — add providers manually.',
    );
  }
  const at = match.index + match[0].length;
  return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

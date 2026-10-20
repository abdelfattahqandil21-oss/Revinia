"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngAdd = ngAdd;
const schematics_1 = require("@angular-devkit/schematics");
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
function ngAdd(options) {
    return (tree, context) => {
        let configPath;
        try {
            configPath = findAppConfig(tree, options.project);
        }
        catch (error) {
            context.logger.warn(`[rivinia/toast] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
                `Add provideRiviniaToast() manually (see README).`);
            return tree;
        }
        if (!configPath || !tree.exists(configPath)) {
            context.logger.warn(`[rivinia/toast] app.config.ts not found — skipping. ` +
                `Add provideRiviniaToast() manually (see README).`);
            return tree;
        }
        let content = tree.read(configPath)?.toString('utf-8') ?? '';
        if (!content) {
            throw new schematics_1.SchematicsException(`[rivinia/toast] ${configPath} is empty.`);
        }
        const parts = [];
        if (options.duration !== undefined)
            parts.push(`duration: ${options.duration}`);
        if (options.maxVisible !== undefined)
            parts.push(`maxVisible: ${options.maxVisible}`);
        const provideCall = `provideRiviniaToast(${parts.length > 0 ? `{ ${parts.join(', ')} }` : ''})`;
        let changed = false;
        if (!importsValue(content, '@rivinia/toast', 'provideRiviniaToast')) {
            content = insertAfterLastImport(content, PROVIDE_IMPORT);
            changed = true;
        }
        if (!content.includes('provideRiviniaToast(')) {
            content = insertProvider(content, provideCall);
            changed = true;
        }
        else {
            context.logger.info('[rivinia/toast] provideRiviniaToast() already present — skipped.');
        }
        if (changed) {
            tree.overwrite(configPath, content);
            context.logger.info(`[rivinia/toast] wired into ${configPath}.`);
        }
        return tree;
    };
}
function defaultProjectName(tree, requested) {
    if (requested)
        return requested;
    const angularJson = tree.read('/angular.json')?.toString('utf-8');
    if (!angularJson) {
        throw new schematics_1.SchematicsException('[rivinia/toast] angular.json not found.');
    }
    const workspace = JSON.parse(angularJson);
    if (workspace.defaultProject && typeof workspace.defaultProject === 'string') {
        return workspace.defaultProject;
    }
    const names = Object.keys(workspace.projects ?? {});
    if (names.length === 0) {
        throw new schematics_1.SchematicsException('[rivinia/toast] no projects in angular.json.');
    }
    return names[0];
}
function findAppConfig(tree, requestedProject) {
    const angularJson = tree.read('/angular.json')?.toString('utf-8');
    if (!angularJson)
        return null;
    const workspace = JSON.parse(angularJson);
    const name = defaultProjectName(tree, requestedProject);
    const project = workspace.projects?.[name];
    if (!project)
        return null;
    const sourceRoot = project.sourceRoot ?? (project.root ? `${project.root}/src` : 'src');
    return `/${sourceRoot}/app/app.config.ts`;
}
function insertAfterLastImport(content, line) {
    const lines = content.split('\n');
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i]))
            idx = i;
    }
    lines.splice(idx + 1, 0, line);
    return lines.join('\n');
}
function insertProvider(content, call) {
    const match = /providers\s*:\s*\[/.exec(content);
    if (!match) {
        throw new schematics_1.SchematicsException('[rivinia/toast] no `providers: [` array found in app.config.ts — add providers manually.');
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
function importsValue(content, module, symbol) {
    const pattern = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(pattern)) {
        if (match[2] !== module)
            continue;
        if (/^\s*import\s+type\s/.test(match[0]))
            continue; // a type-only import
        for (const entry of match[1].split(',')) {
            const raw = entry.trim();
            if (!raw || /^type\s/.test(raw))
                continue; // a type-only specifier
            const local = raw.split(/\s+as\s+/).pop().trim();
            if (local === symbol)
                return true;
        }
    }
    return false;
}

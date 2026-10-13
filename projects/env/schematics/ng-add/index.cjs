"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngAdd = ngAdd;
const schematics_1 = require("@angular-devkit/schematics");
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
const ALL_ENVIRONMENTS = ['development', 'staging', 'production'];
/** Short aliases users actually type (`prod`, `dev`, `stag`). */
const ENVIRONMENT_ALIASES = {
    dev: 'development',
    prod: 'production',
    stag: 'staging',
    stage: 'staging',
};
/** Output directory short names: builds/dev, builds/prod, builds/stag. */
const OUTPUT_DIR = {
    development: 'builds/dev',
    staging: 'builds/stag',
    production: 'builds/prod',
};
const fileDefs = (sourceRoot, selected) => {
    const files = [
        { name: `${sourceRoot}/environments/environment.model.ts`, content: () => MODEL_FILE },
        // The base file is always scaffolded: it is the `replace` source for
        // prod/staging swaps (and what `development` uses directly).
        {
            name: `${sourceRoot}/environments/environment.ts`,
            content: (version) => `import type { AppEnvironment } from './environment.model';\n\n` +
                `/** Development defaults. Used as-is by the \`development\` configuration. */\n` +
                `export const environment: AppEnvironment = {\n` +
                `  production: false,\n` +
                `  version: '${version}',\n` +
                `  apiUrl: 'http://localhost:3000/api',\n` +
                `};\n`,
        },
    ];
    if (selected.includes('staging')) {
        files.push({
            name: `${sourceRoot}/environments/environment.staging.ts`,
            content: (version) => `import type { AppEnvironment } from './environment.model';\n\n` +
                `/** Staging mirrors production. Wired via the \`staging\` configuration. */\n` +
                `export const environment: AppEnvironment = {\n` +
                `  production: true,\n` +
                `  version: '${version}',\n` +
                `  apiUrl: 'https://staging.example.com/api',\n` +
                `};\n`,
        });
    }
    if (selected.includes('production')) {
        files.push({
            name: `${sourceRoot}/environments/environment.prod.ts`,
            content: (version) => `import type { AppEnvironment } from './environment.model';\n\n` +
                `export const environment: AppEnvironment = {\n` +
                `  production: true,\n` +
                `  version: '${version}',\n` +
                `  apiUrl: 'https://api.example.com/api',\n` +
                `};\n`,
        });
    }
    return files;
};
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
function ngAdd(options) {
    return (tree, context) => {
        const workspace = readWorkspace(tree, context, options.project);
        if (!workspace)
            return tree;
        const { name, project, angular } = workspace;
        const sourceRoot = project.sourceRoot ?? (project.root ? `${project.root}/src` : 'src');
        const version = readAppVersion(tree);
        // Empty selection (or engine default) means everything — same as --defaults.
        // Accepts arrays (prompt/programmatic) and comma strings (CLI flags), with
        // short aliases (dev/prod/stag/stage) normalized before validation.
        const rawSelected = options.environments;
        const asArray = Array.isArray(rawSelected)
            ? [...rawSelected]
            : typeof rawSelected === 'string'
                ? rawSelected.split(',')
                : [];
        const cleaned = asArray
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 0)
            .map((e) => ENVIRONMENT_ALIASES[e] ?? e);
        const unknown = [...new Set(cleaned)].filter((e) => !ALL_ENVIRONMENTS.includes(e));
        if (unknown.length > 0) {
            throw new schematics_1.SchematicsException(`[rivinia/env] unknown environment(s): ${unknown.join(', ')}. ` +
                `Choose from development (dev), staging (stag), production (prod).`);
        }
        const selected = cleaned.length > 0
            ? [...new Set(cleaned)]
            : [...ALL_ENVIRONMENTS];
        const configsSnapshot = () => JSON.stringify(project.architect?.build?.configurations ?? null);
        const configsBefore = configsSnapshot();
        let created = 0;
        for (const file of fileDefs(sourceRoot, selected)) {
            const path = `/${file.name}`;
            if (tree.exists(path)) {
                context.logger.info(`[rivinia/env] exists, skipped: ${path}`);
                continue;
            }
            tree.create(path, file.content(version));
            created++;
        }
        if (selected.includes('production')) {
            ensureReplacement(tree, angular, name, 'production', {
                replace: `${sourceRoot}/environments/environment.ts`,
                with: `${sourceRoot}/environments/environment.prod.ts`,
            });
        }
        if (selected.includes('staging')) {
            ensureStaging(tree, angular, name, sourceRoot, context);
        }
        ensureOutputPaths(tree, angular, name, selected, context);
        if (created > 0 || configsSnapshot() !== configsBefore) {
            tree.overwrite('/angular.json', JSON.stringify(angular, null, 2) + '\n');
        }
        context.logger.info(`[rivinia/env] ${created} file(s) created, configurations wired for '${name}'.`);
        return tree;
    };
}
function readWorkspace(tree, context, requested) {
    let angular;
    try {
        const raw = tree.read('/angular.json')?.toString('utf-8');
        if (!raw)
            throw new schematics_1.SchematicsException('angular.json not found.');
        angular = JSON.parse(raw);
    }
    catch (error) {
        context.logger.warn(`[rivinia/env] cannot read angular.json (${error instanceof Error ? error.message : error}) — skipping.`);
        return null;
    }
    const names = Object.keys(angular.projects ?? {});
    if (names.length === 0) {
        context.logger.warn('[rivinia/env] no projects in angular.json — skipping.');
        return null;
    }
    // NOTE: the schema default for `project` is "" (engine-filled), so only a
    // non-empty value counts as an explicit request. (`??` alone would honor "".)
    const name = requested && requested.length > 0
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
function readAppVersion(tree) {
    try {
        const raw = tree.read('/package.json')?.toString('utf-8');
        if (!raw)
            return '0.0.0';
        const parsed = JSON.parse(raw);
        return typeof parsed.version === 'string' && parsed.version.length > 0
            ? parsed.version
            : '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
function getConfigurations(angular, name) {
    const project = angular.projects?.[name];
    if (!project)
        throw new schematics_1.SchematicsException(`[rivinia/env] project '${name}' not found.`);
    project.architect ??= {};
    project.architect.build ??= {};
    const build = project.architect.build;
    build.configurations ??= {};
    return build.configurations;
}
function ensureReplacement(tree, angular, name, configuration, entry) {
    if (!tree.exists('/angular.json'))
        return;
    const configurations = getConfigurations(angular, name);
    const target = configurations[configuration];
    if (!target)
        return; // never create production/development for the user
    const list = target['fileReplacements'];
    if (!Array.isArray(list)) {
        target['fileReplacements'] = [{ ...entry }];
        return;
    }
    const exists = list.some((item) => typeof item === 'object' &&
        item !== null &&
        item['replace'] === entry.replace &&
        item['with'] === entry.with);
    if (!exists)
        list.push({ ...entry });
}
/**
 * Points each selected configuration at its build directory
 * (builds/dev, builds/stag, builds/prod) — but only when the app has not
 * customized `outputPath` already. Never overwrites user output locations.
 */
function ensureOutputPaths(tree, angular, name, selected, context) {
    if (!tree.exists('/angular.json'))
        return;
    const configurations = getConfigurations(angular, name);
    let touched = false;
    for (const env of selected) {
        const target = configurations[env];
        if (!target || 'outputPath' in target)
            continue;
        target['outputPath'] = OUTPUT_DIR[env];
        touched = true;
    }
    if (touched)
        ensureGitignore(tree, context);
}
/** Appends `/builds` to the app .gitignore once (build outputs don't commit). */
function ensureGitignore(tree, context) {
    if (!tree.exists('/.gitignore'))
        return;
    const content = tree.read('/.gitignore')?.toString('utf-8') ?? '';
    if (/(^|\n)\/*builds\/?(\n|$)/.test(content))
        return;
    tree.overwrite('/.gitignore', content.replace(/\s*$/, '\n') + '/builds\n');
    context.logger.info('[rivinia/env] added /builds to .gitignore.');
}
function ensureStaging(tree, angular, name, sourceRoot, context) {
    if (!tree.exists('/angular.json'))
        return;
    const configurations = getConfigurations(angular, name);
    if (!configurations['staging']) {
        const production = configurations['production'];
        const copy = production && typeof production === 'object' ? { ...production } : {};
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

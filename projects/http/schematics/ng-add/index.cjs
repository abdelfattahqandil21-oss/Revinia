"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ngAdd = ngAdd;
const schematics_1 = require("@angular-devkit/schematics");
const HTTP_CLIENT_IMPORT = `import { provideHttpClient } from '@angular/common/http';`;
const PROVIDE_HTTP_IMPORT = `import { provideRiviniaHttp } from '@rivinia/http';`;
/**
 * `ng add @rivinia/http` — wires the library into a standalone app config.
 *
 * - Never overwrites user files; only inserts two imports + two providers.
 * - Idempotent: safe to run twice (existing entries are detected and skipped).
 * - Never provides the backend beyond `provideHttpClient()`; interceptors,
 *   URLs and unwrap options stay app-owned (see schema options).
 */
function ngAdd(options) {
    return (tree, context) => {
        let configPath;
        try {
            configPath = findAppConfig(tree, options.project);
        }
        catch (error) {
            context.logger.warn(`[rivinia/http] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
                `Add provideHttpClient() and provideRiviniaHttp() manually (see README).`);
            return tree;
        }
        if (!configPath || !tree.exists(configPath)) {
            context.logger.warn(`[rivinia/http] app.config.ts not found — skipping. ` +
                `Add provideHttpClient() and provideRiviniaHttp() manually (see README).`);
            return tree;
        }
        let content = tree.read(configPath)?.toString('utf-8') ?? '';
        if (!content) {
            throw new schematics_1.SchematicsException(`[rivinia/http] ${configPath} is empty.`);
        }
        // Deterministic mapping, no ambiguity (library default: disabled):
        // - unwrap !== true   → emit nothing about unwrapping (raw passthrough).
        //   A custom key given alongside is ignored, said plainly in logs.
        // - unwrap === true   → emit `unwrap: true`, plus the key only when custom
        //   (anything but ''/'data', which both mean the library default key).
        // URLs are never touched: the caller owns them (environment, joinUrl, …).
        const parts = [];
        const unwrapEnabled = options.unwrap === true;
        if (!unwrapEnabled) {
            if (options.unwrapKey && options.unwrapKey !== 'data') {
                context.logger.info(`[rivinia/http] unwrapping not enabled — custom unwrapKey '${options.unwrapKey}' ignored.`);
            }
        }
        else {
            parts.push('unwrap: true');
            if (options.unwrapKey && options.unwrapKey.length > 0 && options.unwrapKey !== 'data') {
                parts.push(`unwrapKey: '${options.unwrapKey}'`);
            }
        }
        const provideArg = parts.length > 0 ? `{ ${parts.join(', ')} }` : '';
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
        }
        else {
            context.logger.info('[rivinia/http] provideHttpClient() already present — skipped.');
        }
        const provideCall = `provideRiviniaHttp(${provideArg})`;
        if (!content.includes('provideRiviniaHttp(')) {
            content = insertProvider(content, provideCall);
            changed = true;
        }
        else {
            context.logger.info('[rivinia/http] provideRiviniaHttp() already present — skipped.');
        }
        if (changed) {
            tree.overwrite(configPath, content);
            context.logger.info(`[rivinia/http] wired into ${configPath}.`);
        }
        return tree;
    };
}
function defaultProjectName(tree, requested) {
    if (requested)
        return requested;
    const angularJson = tree.read('/angular.json')?.toString('utf-8');
    if (!angularJson) {
        throw new schematics_1.SchematicsException('[rivinia/http] angular.json not found.');
    }
    const workspace = JSON.parse(angularJson);
    if (workspace.defaultProject && typeof workspace.defaultProject === 'string') {
        return workspace.defaultProject;
    }
    const names = Object.keys(workspace.projects ?? {});
    if (names.length === 0) {
        throw new schematics_1.SchematicsException('[rivinia/http] no projects in angular.json.');
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
        throw new schematics_1.SchematicsException('[rivinia/http] no `providers: [` array found in app.config.ts — add providers manually.');
    }
    const at = match.index + match[0].length;
    return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

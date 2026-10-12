"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLanguageIds = parseLanguageIds;
exports.ngAdd = ngAdd;
const schematics_1 = require("@angular-devkit/schematics");
const PROVIDE_IMPORT = `import { provideRiviniaI18n } from '@rivinia/i18n';`;
/** Known display names/directions; anything else gets `{ nativeName: id, dir }`. */
const KNOWN_LANGUAGES = {
    ar: { nativeName: 'العربية', dir: 'rtl' },
    en: { nativeName: 'English', dir: 'ltr' },
    fr: { nativeName: 'Français', dir: 'ltr' },
    de: { nativeName: 'Deutsch', dir: 'ltr' },
    es: { nativeName: 'Español', dir: 'ltr' },
    he: { nativeName: 'עברית', dir: 'rtl' },
    fa: { nativeName: 'فارسی', dir: 'rtl' },
    ur: { nativeName: 'اردو', dir: 'rtl' },
};
const RTL_IDS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'yi', 'dv', 'ku', 'sd']);
const STARTER = (ids, detectBrowser) => {
    const languages = ids
        .map((id) => {
        const known = KNOWN_LANGUAGES[id];
        const nativeName = known?.nativeName ?? id;
        const dir = known?.dir ?? (RTL_IDS.has(id) ? 'rtl' : 'ltr');
        return `      { id: '${id}', nativeName: '${nativeName}', dir: '${dir}' },`;
    })
        .join('\n');
    const detect = detectBrowser ? ',\n    detectBrowser: true' : '';
    return (`provideRiviniaI18n({\n` +
        `    defaultLanguage: '${ids[0]}',\n` +
        `    languages: [\n${languages}\n    ],${detect}\n` +
        `  })`);
};
/**
 * Parses a free-form language list (`ar, en`, `'ar','en'`, `AR EN`…).
 * Never trusts raw input: strips quotes/whitespace, lowercases, validates
 * BCP-47-ish tags, dedupes. Throws a clear error instead of emitting code.
 */
function parseLanguageIds(raw) {
    if (!raw || raw.trim() === '')
        return ['ar', 'en'];
    // Accept bare lists (`ar, en`), quoted parts (`'ar', "en"`), and bracketed
    // arrays (`[ar, en]`, `['ar','en']`) — then validate strictly regardless.
    let text = raw.trim();
    if (text.startsWith('['))
        text = text.slice(1);
    if (text.endsWith(']'))
        text = text.slice(0, -1);
    const ids = text
        .split(',')
        .map((part) => part
        .trim()
        .replace(/^['"`]+|['"`]+$/g, '')
        .trim()
        .toLowerCase())
        .filter((id) => id.length > 0);
    const unique = [...new Set(ids)];
    if (unique.length === 0)
        return ['ar', 'en'];
    const bad = unique.filter((id) => !/^[a-z]{2,8}(-[a-z0-9]{2,8})?$/.test(id));
    if (bad.length > 0) {
        throw new schematics_1.SchematicsException(`[rivinia/i18n] invalid language id(s): ${bad.join(', ')}. ` +
            `Use comma-separated codes like 'ar, en' or 'ar-EG, en'.`);
    }
    return unique;
}
/**
 * `ng add @rivinia/i18n` — wires a starter bilingual config.
 *
 * - Emits an editable ar/en starter (default language + optional detection).
 *   Real apps replace the list with their own languages afterwards.
 * - Never overwrites user files; idempotent; warn-skips unknown layouts
 *   without failing installs.
 */
function ngAdd(options) {
    return (tree, context) => {
        let configPath;
        try {
            configPath = findAppConfig(tree, options.project);
        }
        catch (error) {
            context.logger.warn(`[rivinia/i18n] workspace lookup failed (${error instanceof Error ? error.message : error}) — skipping. ` +
                `Add provideRiviniaI18n() manually (see README).`);
            return tree;
        }
        if (!configPath || !tree.exists(configPath)) {
            context.logger.warn(`[rivinia/i18n] app.config.ts not found — skipping. ` +
                `Add provideRiviniaI18n() manually (see README).`);
            return tree;
        }
        let content = tree.read(configPath)?.toString('utf-8') ?? '';
        if (!content) {
            throw new schematics_1.SchematicsException(`[rivinia/i18n] ${configPath} is empty.`);
        }
        let changed = false;
        if (!content.includes(PROVIDE_IMPORT)) {
            content = insertAfterLastImport(content, PROVIDE_IMPORT);
            changed = true;
        }
        if (!content.includes('provideRiviniaI18n(')) {
            const call = STARTER(parseLanguageIds(options.languages), options.detectBrowser === true);
            content = insertProvider(content, call);
            changed = true;
        }
        else {
            context.logger.info('[rivinia/i18n] provideRiviniaI18n() already present — skipped.');
        }
        if (changed) {
            tree.overwrite(configPath, content);
            context.logger.info(`[rivinia/i18n] wired into ${configPath}.`);
        }
        return tree;
    };
}
function defaultProjectName(tree, requested) {
    if (requested)
        return requested;
    const angularJson = tree.read('/angular.json')?.toString('utf-8');
    if (!angularJson) {
        throw new schematics_1.SchematicsException('[rivinia/i18n] angular.json not found.');
    }
    const workspace = JSON.parse(angularJson);
    if (workspace.defaultProject && typeof workspace.defaultProject === 'string') {
        return workspace.defaultProject;
    }
    const names = Object.keys(workspace.projects ?? {});
    if (names.length === 0) {
        throw new schematics_1.SchematicsException('[rivinia/i18n] no projects in angular.json.');
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
        throw new schematics_1.SchematicsException('[rivinia/i18n] no `providers: [` array found in app.config.ts — add providers manually.');
    }
    const at = match.index + match[0].length;
    return `${content.slice(0, at)}\n    ${call},${content.slice(at)}`;
}

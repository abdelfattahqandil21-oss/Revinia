/**
 * pnpm check:docs — plain node, zero dependencies.
 *
 * Fails when a package README (or RECIPES) mentions an export that is absent
 * from that package's public entry points (`src/public-api.ts`):
 *  1. API-table first-column identifiers must be exported.
 *  2. CamelCase `code` tokens in prose must be exported or allowlisted
 *     (generic terms + Angular symbols live in ALLOWLIST below).
 *
 * Usage: node scripts/check-docs.mjs [--strict-prose]
 * Without --strict-prose, rule 2 reports warnings only (exit 0);
 * API-table mismatches always fail.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT_PROSE = process.argv.includes('--strict-prose');

const PROJECTS = join(ROOT, 'projects');
const PACKAGES = readdirSync(PROJECTS, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(PROJECTS, entry.name, 'README.md')) &&
      existsSync(join(PROJECTS, entry.name, 'src', 'public-api.ts')),
  )
  .map((entry) => entry.name);

// Generic terms + Angular/Test symbols that are never Rivinia exports.
const ALLOWLIST = new Set([
  'Angular',
  'TypeScript',
  'JavaScript',
  'JSON',
  'HTML',
  'CSS',
  'SSR',
  'CSR',
  'RTL',
  'LTR',
  'API',
  'DOM',
  'URL',
  'ICU',
  'WCAG',
  'MIT',
  'Zod',
  'Valibot',
  'TanStack',
  'RxJS',
  'Jasmine',
  'Karma',
  'Search',
  'Status',
  // Angular symbols commonly referenced in prose/recipes:
  'ApplicationConfig',
  'ApplicationRef',
  'TemplateRef',
  'ViewChild',
  'Injector',
  'ElementRef',
  'EmbeddedViewRef',
  'EnvironmentInjector',
  'DestroyRef',
  'DOCUMENT',
  'REQUEST',
  'TransferState',
  'PendingTasks',
  'StateKey',
  'HttpClient',
  'HttpContext',
  'HttpParams',
  'HttpResponse',
  'HttpTestingController',
  'TestBed',
  'Type',
  'ErrorHandler',
  'NgComponentOutlet',
  'Observable',
  'ControlValueAccessor',
  'FormValueControl',
  // Angular's own provider fns referenced in our docs:
  'provideHttpClient',
  'provideServerRendering',
  'provideClientHydration',
  // Cross-package UI/provider references in integration guides:
  'RiviniaToastList',
  'provideRiviniaToast',
  'Promise',
  'HttpRequest',
  // Generic type names used in prose (type params / TS builtins):
  'Record',
  'T',
  'TData',
  'TResult',
]);

function collectExports(pkg) {
  const projectPath = join(PROJECTS, pkg);
  const apiPaths = [join(projectPath, 'src', 'public-api.ts')];
  for (const entry of readdirSync(projectPath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      apiPaths.push(join(projectPath, entry.name, 'src', 'public-api.ts'));
    }
  }

  const names = new Set();
  for (const apiPath of apiPaths) {
    if (!existsSync(apiPath)) continue;
    const src = readFileSync(apiPath, 'utf8');
    for (const m of src.matchAll(
      /export\s+(?:type\s+)?\{([^}]*)\}\s*(?:from\s*['"][^'"]+['"])?/g,
    )) {
      for (const part of m[1].split(',')) {
        const name = part
          .replace(/^\s*type\s+/, '')
          .trim()
          .split(/\s+as\s+/)
          .pop()
          .trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) names.add(name);
      }
    }
    for (const m of src.matchAll(
      /export\s+(?:declare\s+)?(?:type|interface|class|function|const|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    )) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(/export\s+\*\s*(?:as\s+([A-Za-z_$][A-Za-z0-9_$]*))?\s*from/g)) {
      if (m[1]) names.add(m[1]);
    }
  }
  return names;
}

function identifiersIn(text) {
  const out = [];
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const raw = m[1];
    const base = raw.split('(')[0].trim();
    // `RiviniaTimeZone*` documents a family; keep the marker so rule 1 can
    // match it against exports that share the prefix.
    const wildcard = base.endsWith('*');
    const name = wildcard ? base.slice(0, -1).trim() : base;
    for (const token of name.match(/[\p{L}_$][\p{L}\p{M}\p{N}_$]*/gu) ?? []) {
      // Object.freeze is a standard JavaScript built-in, not a package export.
      // Keep this exception tied to the exact documented expression.
      if (token === 'Object' && base === 'Object.freeze') continue;
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token)) out.push(wildcard ? `${token}*` : token);
    }
  }
  return out;
}

/** Tables of literal tokens (date patterns) or keys (keyboard) are not API. */
function isVocabularyTable(lines, idx) {
  const isRow = (line) => (line ?? '').trim().startsWith('|');
  const isSeparator = (line) => /^\|[\s:\-|]+\|?$/.test((line ?? '').trim());

  if (isRow(lines[idx]) && isSeparator(lines[idx + 1])) return headerKind(lines[idx]);

  let first = idx;
  while (first > 0 && isRow(lines[first - 1])) first--;
  return isSeparator(lines[first + 1]) ? headerKind(lines[first]) : false;
}

function headerKind(line) {
  const header = (line.trim().split('|')[1] ?? '').replaceAll('`', '').trim().toLowerCase();
  return header === 'token' || header === 'key';
}

function isExported(id, exports) {
  if (exports.has(id)) return true;
  if (id.endsWith('*')) {
    const prefix = id.slice(0, -1);
    return [...exports].some((name) => name.startsWith(prefix));
  }
  return false;
}

let failures = 0;
let warnings = 0;

for (const pkg of PACKAGES) {
  const exports = collectExports(pkg);
  const docs = [join(ROOT, 'projects', pkg, 'README.md')];
  const recipes = join(ROOT, 'projects', pkg, 'RECIPES.md');
  if (existsSync(recipes)) docs.push(recipes);
  for (const doc of docs) {
    if (!existsSync(doc)) continue;
    const rel = doc.slice(ROOT.length + 1);
    const lines = readFileSync(doc, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      // Rule 1: API-table first column.
      if (trimmed.startsWith('|') && !/^\|[\s:\-|]+\|?$/.test(trimmed)) {
        const cells = trimmed.split('|').slice(1, -1);
        if (
          cells.length >= 2 &&
          !/^export/i.test(cells[0].trim()) &&
          !isVocabularyTable(lines, idx)
        ) {
          for (const id of identifiersIn(cells[0])) {
            if (/^provide[A-Z]|^inject[A-Z]|^define[A-Z]/.test(id) || /^[A-Z]/.test(id)) {
              if (!isExported(id, exports) && !ALLOWLIST.has(id)) {
                console.error(`FAIL ${rel}:${idx + 1} table mentions unexported \`${id}\``);
                failures++;
              }
            }
          }
        }
        return;
      }
      // Rule 2: CamelCase prose tokens + provide/inject/define references.
      // CamelCase warns by default (generic English overlap), fails strict.
      // provide*/inject*/define* tokens can only reference package exports,
      // so unknown ones ALWAYS fail.
      for (const id of identifiersIn(line)) {
        if (/^(provide|inject|define)[A-Z]/.test(id) && !exports.has(id) && !ALLOWLIST.has(id)) {
          console.error(`FAIL ${rel}:${idx + 1} prose mentions unexported \`${id}\``);
          failures++;
          continue;
        }
        if (/^[A-Z][A-Za-z0-9]*$/.test(id) && !exports.has(id) && !ALLOWLIST.has(id)) {
          const msg = `${STRICT_PROSE ? 'FAIL' : 'WARN'} ${rel}:${idx + 1} prose mentions unexported \`${id}\``;
          if (STRICT_PROSE) {
            console.error(msg);
            failures++;
          } else {
            console.warn(msg);
            warnings++;
          }
        }
      }
    });
  }
}

failures += checkRootReadme();

console.log(`check:docs — ${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures > 0 ? 1 : 0);

/**
 * The root README is the workspace entry point: every publishable project
 * must be listed there, with its manifest version in the "Workspace" column.
 * Offline by design — the npm column is refreshed by hand.
 */
function checkRootReadme() {
  const readme = join(ROOT, 'README.md');
  if (!existsSync(readme)) {
    console.error('FAIL README.md is missing');
    return 1;
  }

  const listed = new Map();
  for (const line of readFileSync(readme, 'utf8').split('\n')) {
    const link = /^\|\s*\[`?([^`\]]+)`?\]\(\.\/projects\/([^/]+)\/README\.md\)/.exec(line);
    if (!link) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    listed.set(link[2], { name: link[1], version: cells[3] ?? '' });
  }

  let problems = 0;
  for (const entry of readdirSync(PROJECTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(PROJECTS, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.private === true) continue;

    const row = listed.get(entry.name);
    if (!row) {
      console.error(`FAIL README.md does not list @rivinia/${entry.name} (projects/${entry.name})`);
      problems++;
      continue;
    }
    if (row.name !== manifest.name) {
      console.error(
        `FAIL README.md lists "${row.name}" for projects/${entry.name}, manifest is "${manifest.name}"`,
      );
      problems++;
    }
    if (row.version !== manifest.version) {
      console.error(
        `FAIL README.md says projects/${entry.name} is ${row.version}, manifest is ${manifest.version}`,
      );
      problems++;
    }
  }

  for (const dir of listed.keys()) {
    if (!existsSync(join(PROJECTS, dir, 'package.json'))) {
      console.error(`FAIL README.md links projects/${dir}, which has no package.json`);
      problems++;
    }
  }

  if (problems === 0)
    console.log(
      `check:docs — README.md lists all ${listed.size} packages at their manifest versions.`,
    );
  return problems;
}

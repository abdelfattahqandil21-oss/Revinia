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
    for (const token of base.match(/[\p{L}_$][\p{L}\p{M}\p{N}_$]*/gu) ?? []) {
      // Object.freeze is a standard JavaScript built-in, not a package export.
      // Keep this exception tied to the exact documented expression.
      if (token === 'Object' && base === 'Object.freeze') continue;
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token)) out.push(token);
    }
  }
  return out;
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
        if (cells.length >= 2 && !/^export/i.test(cells[0].trim())) {
          for (const id of identifiersIn(cells[0])) {
            if (/^provide[A-Z]|^inject[A-Z]|^define[A-Z]/.test(id) || /^[A-Z]/.test(id)) {
              if (!exports.has(id) && !ALLOWLIST.has(id)) {
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

console.log(`check:docs — ${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures > 0 ? 1 : 0);

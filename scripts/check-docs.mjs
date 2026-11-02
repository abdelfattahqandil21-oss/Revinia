/**
 * pnpm check:docs — plain node, zero dependencies.
 *
 * Fails when a consumer document mentions an export that is absent from that
 * package's public entry points (`src/public-api.ts`):
 *  1. API-table first-column identifiers must be exported.
 *  2. CamelCase `code` tokens in prose must be exported or allowlisted
 *     (generic terms + Angular symbols live in ALLOWLIST below).
 *
 * Since the S9 content move a consumer document is either `projects/<pkg>/README.md`,
 * `projects/<pkg>/RECIPES.md` or a topic page under `docs/<pkg>/`. The rest of
 * `docs/` — `DECISIONS.md`, the AUDITs, the SPECs, `MERGES-1.0.md` — is
 * repo-internal: it names removed and `@internal` symbols on purpose, which is
 * exactly what this gate forbids in a consumer document. A topic page added to
 * `docs/<pkg>/` is scanned with no further change here; a page filed anywhere
 * else is silently not a consumer document, so the directory name is the scope.
 *
 * Usage: node scripts/check-docs.mjs [--strict-prose]
 * Without --strict-prose, rule 2 reports warnings only (exit 0);
 * API-table mismatches always fail.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
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
export const ALLOWLIST = new Set([
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
  // Written by `rivinia-i18n-keys init` into the application's own
  // `languages.ts` (`projects/i18n/cli/rivinia-i18n-keys.mjs`), so the docs
  // name a real symbol that is deliberately not an export of the package.
  'injectI18n',
  'Promise',
  'HttpRequest',
  // Generic type names used in prose (type params / TS builtins):
  'Record',
  'T',
  // The language-id parameter, as in `Translation<L>` in docs/i18n/api.md.
  'L',
  'TData',
  'TResult',
]);

/**
 * Platform vocabulary the reference pages must name: `Intl` and its constructors
 * are what i18n delegates to, the system colours are what a forced-colours rule
 * paints with, and the JS builtins appear in behaviour notes. None is a Rivinia
 * export, and none can become one by accident — a Rivinia symbol is always
 * `Rivinia*`, `rv*` or a camelCase member.
 */
export const PLATFORM_TERMS = new Set([
  'Intl',
  'DisplayNames',
  'PluralRules',
  'NumberFormat',
  'DateTimeFormat',
  'ListFormat',
  'Locale',
  'Canvas',
  'CanvasText',
  'Highlight',
  'HighlightText',
  'GrayText',
  'SystemButtonFace',
  'SystemButtonText',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Map',
  'Set',
  'Array',
  'Date',
  'RegExp',
  'Error',
  'RangeError',
  'TypeError',
  'Math',
  'Chrome',
  'Chromium',
  'Edge',
  'Firefox',
  'Safari',
  'WebKit',
  'Gecko',
  'Blink',
  // The `KeyboardEvent.key` values the keyboard tables name.
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Backspace',
  'Enter',
  'End',
  'Escape',
  'Home',
  'PageDown',
  'PageUp',
  'Space',
  'Tab',
  'Shift',
  // `@angular/forms/signals`, the module name Signal Forms prose refers to.
  'Signals',
  'iOS',
  'Android',
  'Linux',
  'Windows',
  'MacOS',
  'Node',
  'npm',
  'npx',
  'JavaScript',
  'Tailwind',
  'Bootstrap',
  'Figma',
]);

/** What `auditDocument` accepts unless a caller says otherwise. */
const merged = new Set([...ALLOWLIST, ...PLATFORM_TERMS]);

export function collectExports(pkg, root = PROJECTS) {
  const projectPath = join(root, pkg);
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

/**
 * The two rules, applied to one document.
 *
 * Rule 2 asks for real CamelCase — an identifier with a lowercase letter after
 * the initial. `EG`, `XXX`, `T12` and `Z` are a BCP 47 region subtag, an ISO
 * 4217 code and two ICU/ISO-8601 pattern letters from the snippets in
 * `docs/i18n/`; they can never be a Rivinia export, and a Rivinia typo
 * (`RiviniaLanagugeToggle`) still has lowercase letters, so it still fails.
 *
 * @param {{ rel: string, text: string, exports: Set<string>,
 *           allowlist?: Set<string>, strictProse?: boolean }} input
 * @returns {{ failures: string[], warnings: string[] }} messages, `rel:line` prefixed
 */
export function auditDocument({ rel, text, exports, allowlist = merged, strictProse = false }) {
  const failures = [];
  const warnings = [];
  const lines = text.split('\n');

  lines.forEach((line, idx) => {
    const where = `${rel}:${idx + 1}`;
    const trimmed = line.trim();
    // Rule 1: API-table first column. A table row is never read by rule 2 —
    // its later cells hold descriptions, not claims about the surface.
    if (trimmed.startsWith('|') && !/^\|[\s:\-|]+\|?$/.test(trimmed)) {
      const cells = trimmed.split('|').slice(1, -1);
      if (
        cells.length >= 2 &&
        !/^export/i.test(cells[0].trim()) &&
        !isVocabularyTable(lines, idx)
      ) {
        for (const id of identifiersIn(cells[0])) {
          if (/^provide[A-Z]|^inject[A-Z]|^define[A-Z]/.test(id) || /^[A-Z]/.test(id)) {
            if (!isExported(id, exports) && !allowlist.has(id)) {
              failures.push(`FAIL ${where} table mentions unexported \`${id}\``);
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
      if (/^(provide|inject|define)[A-Z]/.test(id) && !exports.has(id) && !allowlist.has(id)) {
        failures.push(`FAIL ${where} prose mentions unexported \`${id}\``);
        continue;
      }
      const camelCase = /^[A-Z][A-Za-z0-9]*$/.test(id) && /[a-z]/.test(id);
      if (camelCase && !exports.has(id) && !allowlist.has(id)) {
        const msg = `${strictProse ? 'FAIL' : 'WARN'} ${where} prose mentions unexported \`${id}\``;
        if (strictProse) failures.push(msg);
        else warnings.push(msg);
      }
    }
  });

  return { failures, warnings };
}

/**
 * The consumer documents of one package: its README, its recipes and — since the
 * S9 content move — every topic page filed under `docs/<pkg>/`.
 *
 * @param {string} pkg
 * @param {{ root?: string, exists?: (p: string) => boolean, read?: (p: string) => string }} hooks
 * @returns {{ rel: string, text: string }[]}
 */
export function consumerDocuments(pkg, { root = ROOT, exists = existsSync, read = null } = {}) {
  const paths = [
    join(root, 'projects', pkg, 'README.md'),
    join(root, 'projects', pkg, 'RECIPES.md'),
  ];
  const topicDir = join(root, 'docs', pkg);
  if (exists(topicDir)) {
    for (const entry of readdirSync(topicDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) paths.push(join(topicDir, entry.name));
    }
  }

  const documents = [];
  for (const path of paths) {
    if (!exists(path)) continue;
    const text = read ? read(path) : readFileSync(path, 'utf8');
    documents.push({ rel: path.slice(root.length + 1), text });
  }
  return documents;
}

/**
 * `README.md` is the workspace entry point: every publishable project must be
 * listed there, with its manifest version in the "Workspace" column. Offline by
 * design — the npm column is refreshed by hand.
 */
export function checkRootReadme({ root = ROOT, exists = existsSync, read = readFileSync } = {}) {
  const readme = join(root, 'README.md');
  if (!exists(readme)) {
    console.error('FAIL README.md is missing');
    return 1;
  }

  const listed = new Map();
  for (const line of String(read(readme, 'utf8')).split('\n')) {
    const link = /^\|\s*\[`?([^`\]]+)`?\]\(\.\/projects\/([^/]+)\/README\.md\)/.exec(line);
    if (!link) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    listed.set(link[2], { name: link[1], version: cells[3] ?? '' });
  }

  let problems = 0;
  for (const entry of readdirSync(join(root, 'projects'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(root, 'projects', entry.name, 'package.json');
    if (!exists(manifestPath)) continue;
    const manifest = JSON.parse(String(read(manifestPath, 'utf8')));
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
    if (!exists(join(root, 'projects', dir, 'package.json'))) {
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

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  let failures = 0;
  let warnings = 0;

  for (const pkg of PACKAGES) {
    const exports = collectExports(pkg);
    for (const doc of consumerDocuments(pkg)) {
      const report = auditDocument({
        rel: doc.rel,
        text: doc.text,
        exports,
        strictProse: STRICT_PROSE,
      });
      for (const message of report.failures) {
        console.error(message);
        failures++;
      }
      for (const message of report.warnings) {
        console.warn(message);
        warnings++;
      }
    }
  }

  failures += checkRootReadme();

  console.log(`check:docs — ${failures} failure(s), ${warnings} warning(s)`);
  process.exit(failures > 0 ? 1 : 0);
}

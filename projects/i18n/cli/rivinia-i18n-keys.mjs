#!/usr/bin/env node
/**
 * `rivinia-i18n-keys` — generates the typed-key registry for `@rivinia/i18n`
 * and checks key/placeholder parity across dictionaries.
 *
 *   npx rivinia-i18n-keys
 *   npx rivinia-i18n-keys --source public/i18n/en.json --out src/i18n-keys.d.ts
 *   npx rivinia-i18n-keys --check        # CI: exit 1 when the file is stale
 *   npx rivinia-i18n-keys --parity --dir public/i18n --base en
 *
 * Nested objects flatten to dot paths, literal dotted keys are kept as-is,
 * only string leaves become keys, keys are sorted for stable diffs, and quotes
 * are escaped. No dependencies.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, basename, join, relative, resolve } from 'node:path';

const DEFAULTS = Object.freeze({
  source: 'public/i18n/en.json',
  out: 'src/i18n-keys.d.ts',
  dir: 'public/i18n',
  base: 'en',
});

const PREFIX = '[rivinia/i18n]';

function main(argv) {
  const args = parseArgs(argv);
  if (args.error) {
    console.error(`${PREFIX} ${args.error}`);
    printHelp();
    return 1;
  }
  if (args.help) {
    printHelp();
    return 0;
  }
  return args.parity ? runParity(args) : runGenerate(args);
}

function runGenerate(args) {
  const sourcePath = resolve(args.source ?? DEFAULTS.source);
  const outPath = resolve(args.out ?? DEFAULTS.out);

  const dictionary = readDictionary(sourcePath);
  if (dictionary === null) return 1;

  const entries = new Map();
  flatten(dictionary, '', entries);
  const keys = [...entries.keys()].sort();
  const output = render(keys);

  if (args.check) {
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
    if (current === output) {
      console.log(`${PREFIX} ${outPath} is up to date (${keys.length} keys).`);
      return 0;
    }
    console.error(
      `${PREFIX} ${outPath} is stale. Regenerate it:\n` +
        `  npx rivinia-i18n-keys --source ${relative(process.cwd(), sourcePath)} ` +
        `--out ${relative(process.cwd(), outPath)}`,
    );
    return 1;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, output, 'utf8');
  console.log(`${PREFIX} Wrote ${keys.length} keys to ${outPath}.`);
  return 0;
}

/**
 * `--parity`: every `<lang>.json` in `--dir` must have the same keys as
 * `--base`, and every placeholder used by the base string must appear in the
 * translated string. Sorted output, exit 1 on any mismatch (CI-friendly).
 */
function runParity(args) {
  const dir = resolve(args.dir ?? DEFAULTS.dir);
  const base = args.base ?? DEFAULTS.base;

  if (!existsSync(dir)) {
    console.error(`${PREFIX} Dictionary directory not found: ${dir}`);
    return 1;
  }

  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    console.error(`${PREFIX} No JSON dictionaries in ${dir}`);
    return 1;
  }

  const dictionaries = new Map();
  for (const file of files) {
    const language = basename(file, '.json');
    const path = join(dir, file);
    const dictionary = readDictionary(path);
    if (dictionary === null) return 1;
    const entries = new Map();
    flatten(dictionary, '', entries);
    dictionaries.set(language, entries);
  }

  const baseEntries = dictionaries.get(base);
  if (baseEntries === undefined) {
    console.error(`${PREFIX} Base dictionary "${base}.json" not found in ${dir}`);
    return 1;
  }

  const problems = [];
  for (const language of [...dictionaries.keys()].sort()) {
    if (language === base) continue;
    const entries = dictionaries.get(language);

    for (const key of [...baseEntries.keys()].sort()) {
      if (!entries.has(key)) {
        problems.push(
          `${PREFIX} MISSING ${language} key "${key}" (present in "${base}")`,
        );
        continue;
      }
      const expected = placeholders(baseEntries.get(key).value);
      const actual = placeholders(entries.get(key).value);
      for (const name of [...expected].sort()) {
        if (!actual.has(name)) {
          problems.push(
            `${PREFIX} PLACEHOLDER ${language} key "${key}": ` +
              `{${name}} is used in "${base}" but absent from "${language}"`,
          );
        }
      }
    }

    for (const key of [...entries.keys()].sort()) {
      if (!baseEntries.has(key)) {
        problems.push(`${PREFIX} EXTRA ${language} key "${key}" (absent in "${base}")`);
      }
    }
  }

  if (problems.length === 0) {
    console.log(
      `${PREFIX} Parity OK (${dictionaries.size} dictionaries, ` +
        `${baseEntries.size} keys in "${base}").`,
    );
    return 0;
  }

  for (const line of problems) console.error(line);
  console.error(
    `${PREFIX} ${problems.length} parity problem(s) across ${dictionaries.size} dictionaries.`,
  );
  return 1;
}

function readDictionary(path) {
  if (!existsSync(path)) {
    console.error(`${PREFIX} Source dictionary not found: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`${PREFIX} Could not parse ${path}: ${error.message}`);
    return null;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') {
      args.check = true;
    } else if (arg === '--parity') {
      args.parity = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--source' || arg === '--out' || arg === '--dir' || arg === '--base') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        return { error: `${arg} needs a ${arg === '--base' ? 'language' : 'path'}.` };
      }
      args[arg.slice(2)] = value;
      i++;
    } else if (
      arg.startsWith('--source=') ||
      arg.startsWith('--out=') ||
      arg.startsWith('--dir=') ||
      arg.startsWith('--base=')
    ) {
      const eq = arg.indexOf('=');
      args[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      return { error: `Unknown option: ${arg}` };
    }
  }
  return args;
}

/**
 * Collects string leaves in `entries` (key → { value, flat, sourcePath }).
 * A JSON key that itself contains dots (an export from many tools) is already
 * a full key; when it collides with a nested path the literal key wins and a
 * warning is printed.
 */
function flatten(value, prefix, entries) {
  if (Array.isArray(value)) {
    warn(`Skipping array at "${prefix || '(root)'}" — arrays are not keys.`);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
        flatten(child, path, entries);
        continue;
      }
      if (typeof child === 'string') {
        addEntry(entries, path, child, key.includes('.'), path);
        continue;
      }
      if (Array.isArray(child)) {
        warn(`Skipping array at "${path}" — arrays are not keys.`);
        continue;
      }
      warn(`Skipping non-string value at "${path}" (${typeOf(child)}).`);
    }
    return;
  }
  warn(`Skipping non-string value at "${prefix || '(root)'}" (${typeOf(value)}).`);
}

function addEntry(entries, key, value, flat, sourcePath) {
  const existing = entries.get(key);
  if (existing === undefined) {
    entries.set(key, { value, flat, sourcePath });
    return;
  }
  if (existing.flat && !flat) {
    warn(`Key collision at "${key}": keeping the flat key over "${sourcePath}".`);
    return;
  }
  if (!existing.flat && flat) {
    warn(`Key collision at "${key}": the flat key wins over "${existing.sourcePath}".`);
    entries.set(key, { value, flat, sourcePath });
    return;
  }
  warn(
    `Key collision at "${key}" between "${existing.sourcePath}" and "${sourcePath}"; ` +
      'keeping the first value.',
  );
}

const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const BRANCH_TYPES = new Set(['plural', 'selectordinal', 'select']);

/**
 * Named arguments of an ICU message: every `{name …}` argument at any nesting
 * depth. Branch bodies are message text, not arguments, so their words are
 * never reported — `=0 {No items}` must not yield a `{No}` parameter.
 */
function placeholders(message) {
  const names = new Set();
  if (typeof message !== 'string') return names;
  collectPlaceholders(message, 0, message.length, names);
  return names;
}

function collectPlaceholders(text, start, end, names) {
  let i = start;
  while (i < end) {
    const char = text[i];
    if (char === "'") {
      i = skipQuote(text, i, end);
    } else if (char === '{') {
      i = readArgument(text, i, end, names);
    } else {
      i++;
    }
  }
}

/** ICU: `''` is one apostrophe; `'` before `{`, `}` or `#` quotes until `'`. */
function skipQuote(text, i, end) {
  if (text[i + 1] === "'") return i + 2;
  const next = text[i + 1];
  if (next === '{' || next === '}' || next === '#') {
    const close = text.indexOf("'", i + 2);
    return close === -1 || close >= end ? end : close + 1;
  }
  return i + 1;
}

/** Index of the `}` closing the `{` at `open`; `end` when malformed. */
function matchBrace(text, open, end) {
  let depth = 0;
  for (let i = open; i < end; i++) {
    const char = text[i];
    if (char === "'") {
      i = skipQuote(text, i, end) - 1;
    } else if (char === '{') {
      depth++;
    } else if (char === '}' && --depth === 0) {
      return i;
    }
  }
  return end;
}

function readArgument(text, open, end, names) {
  const close = matchBrace(text, open, end);
  let i = open + 1;
  while (i < close && /\s/.test(text[i])) i++;
  const nameStart = i;
  while (i < close && text[i] !== ',' && text[i] !== '}') i++;
  const name = text.slice(nameStart, i).trim();
  if (NAME.test(name)) names.add(name);
  if (i >= close || text[i] === '}') return close + 1;

  i++; // past the comma
  while (i < close && /\s/.test(text[i])) i++;
  const typeStart = i;
  while (i < close && text[i] !== ',' && text[i] !== '}') i++;
  if (BRANCH_TYPES.has(text.slice(typeStart, i).trim())) {
    collectBranches(text, i, close, names);
  }
  return close + 1;
}

/** Selector words are ignored; each `{…}` branch body is a nested message. */
function collectBranches(text, start, end, names) {
  let i = start;
  while (i < end) {
    const char = text[i];
    if (char === "'") {
      i = skipQuote(text, i, end);
    } else if (char === '{') {
      const close = matchBrace(text, i, end);
      collectPlaceholders(text, i + 1, close, names);
      i = close + 1;
    } else {
      i++;
    }
  }
}

function typeOf(value) {
  if (value === null) return 'null';
  return typeof value;
}

function warn(message) {
  console.warn(`${PREFIX} ${message}`);
}

function render(keys) {
  const union = keys.length === 0 ? 'never' : keys.map((key) => `'${escapeKey(key)}'`).join(' | ');
  return [
    '// Generated by @rivinia/i18n. Do not edit.',
    "import '@rivinia/i18n';",
    '',
    "declare module '@rivinia/i18n' {",
    '  interface RiviniaI18nKeyRegistry {',
    `    readonly keys: ${union};`,
    '  }',
    '}',
    '',
  ].join('\n');
}

function escapeKey(key) {
  return key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function printHelp() {
  console.log(
    [
      'rivinia-i18n-keys — generate typed translation keys for @rivinia/i18n',
      '',
      'Usage:',
      '  rivinia-i18n-keys [--source <json>] [--out <d.ts>]',
      '  rivinia-i18n-keys --check',
      '  rivinia-i18n-keys --parity [--dir <folder>] [--base <language>]',
      '',
      'Options:',
      `  --source  Dictionary to read        (default: ${DEFAULTS.source})`,
      `  --out     Declaration file to write (default: ${DEFAULTS.out})`,
      '  --check   Exit 1 when --out is missing or stale (for CI)',
      `  --parity  Compare every dictionary against the base`,
      `  --dir     Dictionary folder         (default: ${DEFAULTS.dir})`,
      `  --base    Reference language        (default: ${DEFAULTS.base})`,
      '  --help    Show this help',
    ].join('\n'),
  );
}

process.exitCode = main(process.argv.slice(2));

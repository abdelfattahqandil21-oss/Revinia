/**
 * pnpm check:readmes — plain node, zero dependencies.
 *
 * A package README has two failure modes no other gate catches:
 *  1. it grows past the 200-line budget — the evaluator gets lost before the
 *     installer finds anything;
 *  2. it states a version that the manifest no longer has (measured on
 *     `main`, 2026-10-31: select 0.7.1's README said 0.6.0, menu 0.5.0's said
 *     0.4.0).
 *
 * The line budget uses the package README structure recorded in
 * docs/releases/1.0/README-TEMPLATE.md. Missing relative links fail: the package
 * README is what npm displays, so every repository-local target must resolve.
 *
 * Usage: node scripts/check-readmes.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const LINE_BUDGET = 200;

/** Every package in the synchronized 1.0 candidate. */
export const PACKAGES = Object.freeze(['theme', 'select', 'menu', 'i18n', 'popup', 'datepicker', 'env', 'http', 'toast', 'modal', 'table']);

/** All package READMEs share the S9 hard cap. */

/**
 * Temporary allowances, removed package by package as the content move lands.
 * Keep this list shrinking; an entry here is a TODO, not a policy. Empty since
 * the S9 move: every 1.0 package now fits the budget on its own.
 */
export const ALLOW_OVER_BUDGET = Object.freeze({});

/**
 * A claim is the package's own version, prerelease suffix included: the rc
 * steps of the 1.0 order legitimately read `1.0.0-rc.1`, and a pattern that
 * stopped at the patch number would reject that accurate line while accepting
 * a stale `1.0.0`.
 */
const VERSION_CLAIMS = [
  /package version\s*:?\s*(?:\*\*)?\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/gi,
];

/** The colour tokens shields accepts by name; anything else is the message. */
const BADGE_COLOURS = new Set([
  'brightgreen',
  'green',
  'yellowgreen',
  'yellow',
  'orange',
  'red',
  'blue',
  'grey',
  'gray',
  'lightgrey',
  'lightgray',
  'blueviolet',
  'success',
  'important',
  'critical',
  'informational',
  'inactive',
]);

/**
 * Shields badge messages: `<label>-<message>-<color>`, with `-` inside the
 * message written as `--` (`version-1.0.0--rc.1-blue`). Only a known colour
 * token is dropped: `version-1.0.0-rc` has no colour, and its `rc` is part of
 * the version. A leading `v` (`npm-v1.0.0`) is not part of the semver.
 *
 * @param {string} text
 * @returns {string[]} claimed versions, already unescaped
 */
function badgeClaims(text) {
  const claims = [];
  for (const match of text.matchAll(/img\.shields\.io\/badge\/(?:npm|version|v)-([^\s)"'?#]+)/gi)) {
    const tokens = match[1].replace(/\.svg$/i, '').split('-');
    const last = tokens[tokens.length - 1].toLowerCase();
    if (tokens.length > 1 && (BADGE_COLOURS.has(last) || /^[0-9a-f]{6}$/i.test(last))) tokens.pop();
    claims.push(
      tokens
        .join('-')
        .replace(/--/g, '-')
        .replace(/^v(?=\d)/i, ''),
    );
  }
  return claims;
}

/** shields renders `-` as `--`; undo it so the claim compares as semver. */
const normaliseClaim = (claim) => claim.replace(/--/g, '-');

const IGNORED_SCHEMES = /^(?:https?:|mailto:|tel:|#)/i;

/**
 * @param {{
 *   pkg: string,
 *   text: string,
 *   manifest: { version: string },
 *   allowOverBudget?: boolean,
 *   lineBudget?: number,
 *   fileExists?: (path: string) => boolean,
 * }} input
 * @returns {{ ok: boolean, problems: string[], warnings: string[], lines: number }}
 */
export function checkReadme({
  pkg,
  text,
  manifest,
  allowOverBudget = false,
  lineBudget = LINE_BUDGET,
  fileExists = existsSync,
}) {
  const problems = [];
  const warnings = [];
  const lines = text.replace(/\n$/, '').split('\n').length;

  if (lines > lineBudget) {
    const message = `${pkg}/README.md is ${lines} lines, over the ${lineBudget}-line budget`;
    if (allowOverBudget) warnings.push(`${message} (temporarily allowed until the content move)`);
    else problems.push(message);
  }

  for (const pattern of VERSION_CLAIMS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const claimed = normaliseClaim(match[1]);
      if (claimed !== manifest.version) {
        problems.push(
          `${pkg}/README.md claims version ${claimed}, package.json has ${manifest.version}`,
        );
      }
    }
  }

  for (const claimed of badgeClaims(text)) {
    if (claimed !== manifest.version) {
      problems.push(
        `${pkg}/README.md badge claims version ${claimed}, package.json has ${manifest.version}`,
      );
    }
  }

  const base = join(ROOT, 'projects', pkg);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (IGNORED_SCHEMES.test(target)) continue;
    const path = target.split('#')[0].split('?')[0];
    if (path.length === 0) continue;
    const resolved = resolve(base, path);
    if (!fileExists(resolved))
      problems.push(`${pkg}/README.md links ${target}, which does not exist`);
  }

  return { ok: problems.length === 0, problems, warnings, lines };
}

/**
 * A malformed manifest must be a named problem, not a thrown SyntaxError from
 * inside the gate: the release stops either way, but only one says why.
 *
 * @param {string} path
 * @returns {{ error?: string } & Record<string, unknown>}
 */
export function readManifest(path) {
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    if (!manifest || typeof manifest !== 'object' || typeof manifest.version !== 'string') {
      return { error: `${path} has no version string` };
    }
    return manifest;
  } catch (error) {
    return { error: `${path} is not valid JSON: ${error.message}` };
  }
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  let failures = 0;
  let warningCount = 0;
  for (const pkg of PACKAGES) {
    const readmePath = join(ROOT, 'projects', pkg, 'README.md');
    const manifestPath = join(ROOT, 'projects', pkg, 'package.json');
    if (!existsSync(readmePath) || !existsSync(manifestPath)) {
      console.error(`FAIL projects/${pkg} has no README.md or package.json`);
      failures++;
      continue;
    }
    const manifest = readManifest(manifestPath);
    if (manifest.error) {
      console.error(`FAIL ${manifest.error}`);
      failures++;
      continue;
    }
    const report = checkReadme({
      pkg,
      text: readFileSync(readmePath, 'utf8'),
      manifest,
      allowOverBudget: ALLOW_OVER_BUDGET[pkg] === true,
    });
    console.log(`check:readmes — ${pkg} (${report.lines} lines)`);
    for (const problem of report.problems) {
      console.error(`FAIL ${problem}`);
      failures++;
    }
    for (const warning of report.warnings) {
      console.warn(`WARN ${warning}`);
      warningCount++;
    }
  }
  if (failures > 0) {
    console.error(`check:readmes — ${failures} problem(s)`);
    process.exit(1);
  }
  console.log(`check:readmes — ok (${warningCount} warning(s))`);
}

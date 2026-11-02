/**
 * pnpm check:duplication — the duplication figure D86 promised, report-only.
 *
 * D86 decided NOT to extract a shared popup core before 1.0 and to measure the
 * duplication instead, so that a fix landing in one component and missing the
 * other is at least visible. This is that measurement. It never fails the
 * build: a number going up is a decision for the owner, not a red gate, and the
 * suite that actually protects the behavior is `e2e/popup/conformance.spec.ts`.
 *
 * jscpd is not a dependency: this pulls it with `pnpm dlx`, so it needs the
 * network once and, like every install on this machine, the build-script
 * allowance —
 *   PNPM_CONFIG_ALLOW_BUILDS='{"@parcel/watcher":true,"esbuild":true,"lmdb":true,"msgpackr-extract":true}' \
 *     pnpm check:duplication
 * The baseline below is what the tree measured on 2026-11-01; if the run prints
 * a different number, say which way it moved. The version is pinned, because the
 * detector matters more than the tree here: the same sources at the same scope
 * measured 8 clones on jscpd 4.0.8 and 18 clones (322 lines, 11.30%) on 5.4.2,
 * and a check that re-runs on a moving version reports drift that is only the
 * tool changing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The two popup implementations, their placement modules and everything beside them. */
const PATHS = [
  'projects/select/ui/src/lib/components/popup',
  'projects/select/ui/src/lib/utils',
  'projects/menu/ui/src/lib/components/menu',
  'projects/menu/ui/src/lib/utils',
];

// Measured on this tree with the pinned flags below: 8 clones over 9 files,
// 196 duplicated lines (6.75%) and 2,213 tokens (11.36%). `HEAD` before the S4
// resize rule measured 7 clones / 181 lines (6.38%) / 2,046 tokens (10.77%) at
// the identical scope, so S4 added exactly one clone: the listener-registration
// block the two popups now share line for line.
//
// One shared block is NOT in that count and the reason is measured:
// `editableFocusInsidePanel()` exists in both popups, 12 lines each differing on
// the one selector line. At 4.0.8's `--min-tokens 40` it is still invisible; at
// `--min-tokens 20` it appears as two fragments of 75 and 63 tokens. That one
// differing line splits the shared text below this check's 100-token threshold,
// so read the figure as 8 clones reported and 9 shared blocks present.
//
// S7 (2026-11-02) moved the line PERCENTAGE and nothing else. The anchor-gate
// prose added to both popup CSS files grew the same scope from 2,904 to 2,950
// lines, so 196 duplicated lines are now 6.64% instead of 6.75%; 2,213 tokens
// are still 11.36% and the clone count is still 8. The new text is comments in
// `.css` files, which jscpd reads into the denominator but does not match — the
// css format row reports 0 clones — so it documents the shared `@supports` gate
// without duplicating behaviour.
const BASELINE = {
  measured: '2026-11-02',
  clones: 8,
  lines: '196 (6.64%)',
  tokens: '2213 (11.36%)',
};

for (const path of PATHS) {
  if (!existsSync(join(ROOT, path))) {
    console.error(`check:duplication — ${path} is gone. Update the script's PATHS.`);
    process.exit(1);
  }
}

const result = spawnSync(
  'pnpm',
  ['dlx', 'jscpd@4.0.8', '--min-tokens', '100', '--reporters', 'console', ...PATHS],
  { cwd: ROOT, encoding: 'utf8' },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
// jscpd colors its table; strip ANSI before matching numbers out of it.
const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
const clones = plain.match(/Found (\d+) clones/)?.[1];
// The summary table's Total row is `… │ 162 (5.02%) │ 1855 (7.62%) │` — the two
// percentages are read positionally, because the header cells are on another line.
const totalRow = plain.split('\n').find((line) => line.includes('Total:')) ?? '';
const [lines, tokens] = [...totalRow.matchAll(/(\d+(?:\.\d+)?(?: \([\d.]+%\)))/g)].map(
  (match) => match[1],
);

console.log(plain.trim());
console.log('');
console.log('This check reports; it does not gate (D86).');
console.log(
  `Baseline ${BASELINE.measured}: ${BASELINE.clones} clones, ${BASELINE.lines} lines, ${BASELINE.tokens} tokens.`,
);
console.log(
  clones === undefined
    ? 'This run: jscpd printed no summary — read the output above.'
    : `This run: ${clones} clones${lines ? `, ${lines} lines` : ''}${tokens ? `, ${tokens} tokens` : ''}.`,
);
process.exit(0);

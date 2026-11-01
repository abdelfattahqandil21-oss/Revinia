/**
 * pnpm check:popup-mutations — the evidence behind D86's acceptance line:
 * "breaking one component's behavior makes it fail".
 *
 * A green conformance suite proves nothing on its own: a case can pass because
 * the behavior it names is not the behavior it measures. So each entry below
 * breaks one documented rule in the library source, rebuilds what the suite
 * actually serves (`dist/menu` / `dist/select`, then `dist/menu-e2e`, which
 * bundles the library dist — the suite never builds, so a stale `dist/` would
 * report every mutant as surviving), runs the suite, and records which cases
 * went red.
 *
 * A mutant nobody kills is a behavior no test measures. The expected list is
 * exact in both directions: every named case must go red, and NOTHING else —
 * so a menu-side break that reddens a select case is reported as a mismatch,
 * not as extra coverage. That second half is what makes the per-component claim
 * real: the select's cases stay green under a menu mutant and the other way
 * round, because they are different code.
 *
 * Two kinds of break are deliberately absent, with the reason rather than a
 * silent omission: forcing the height-only exemption to always fire cannot be
 * tested on the select, whose panel always has a filter box — the "has nothing
 * editable" counter-case exists only for the built-in menu. The `<textarea>` /
 * `contenteditable` branch breaks are the same story on the select: its fixture
 * offers an `<input>`, so those two branches are unobservable there by
 * construction.
 *
 * The source files are restored in a `finally`, including on a crash, and the
 * libraries plus the demo are rebuilt on the way out so `dist/` describes the
 * restored source.
 *
 * The suite runs on Chromium only, and that is a speed choice, not a gap: an
 * engine would have to be excluded if it could not launch at all, and WebKit does
 * launch here since `libavif16` was installed (24/24 on 2026-11-01). Rebuilding and
 * re-running 18 mutants on three engines costs about an hour to prove a claim about
 * library logic, which is engine-independent — the engine matrix is S7's job and
 * runs the suite separately on all three.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MENU = 'projects/menu/ui/src/lib/components/menu/menu-panel.ts';
const SELECT = 'projects/select/ui/src/lib/components/popup/select-popup.ts';
const SUITE = 'e2e/popup/conformance.spec.ts';

const HEIGHT_KEEPS = 'a height-only resize keeps the panel open for every editable it hosts';
const HEIGHT_CLOSES = 'a height-only resize closes a panel that has nothing editable';
const WIDTH_CLOSES = 'a width change closes it, even with the filter focused';
const SCROLL_INSIDE = 'scroll inside the panel leaves it open';
const SCROLL_OUTSIDE = 'scroll outside the panel closes it';
const LEDGER = 'destroying the open panel removes every global listener';
const ESCAPE = 'Escape closes and returns focus to the trigger';
const POINTER = 'outside pointerdown closes without stealing focus back to the trigger';

/** The shared S4 guard, byte-identical in both popups (D86's accepted clone). */
const RESIZE_GUARD = 'if (width === widthAtOpen && this.editableFocusInsidePanel()) return;';

/** The three kinds of editable the exemption recognizes. */
const EDITABLE_TEST = `    return (
      active.isContentEditable ||
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    );`;

const INSIDE_SCROLL_GUARD =
  'if (panel && event.target instanceof Node && panel.contains(event.target)) return;';

const SCROLL_REGISTRATION = "window.addEventListener('scroll', onScroll, true);";

const CLEANUP_BLOCK = `        document.removeEventListener('pointerdown', onPointer);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);`;

const POINTER_GUARD = 'if (host && !host.contains(event.target as Node)) this.doClose(false);';

const ESCAPE_BRANCH = `      case 'Escape':
        event.preventDefault();
        this.doClose(true);`;

const ESCAPE_NO_RESTORE = `      case 'Escape':
        event.preventDefault();
        this.doClose(false);`;

/**
 * Each mutant names the anchor it rewrites — it must occur exactly once in that
 * file, or the run aborts rather than proving nothing — and the case titles that
 * have to go red for it. `harness: 'ssr'` runs the server-render gate instead of
 * the browser, because that is where a missing `window` guard is observable.
 */
const MUTANTS = [
  {
    label: 'menu: the height-only exemption never fires',
    file: MENU,
    from: RESIZE_GUARD,
    to: 'this.editableFocusInsidePanel();',
    expect: [HEIGHT_KEEPS],
  },
  {
    label: 'menu: the height-only exemption ignores editability',
    file: MENU,
    from: RESIZE_GUARD,
    to: 'if (width === widthAtOpen) return;',
    expect: [HEIGHT_CLOSES],
  },
  {
    label: 'menu: the height-only exemption ignores width',
    file: MENU,
    from: RESIZE_GUARD,
    to: 'if (this.editableFocusInsidePanel()) return;',
    expect: [WIDTH_CLOSES],
  },
  {
    label: 'menu: only an <input> counts as editable',
    file: MENU,
    from: EDITABLE_TEST,
    to: '    return active instanceof HTMLInputElement;',
    expect: [HEIGHT_KEEPS],
  },
  {
    label: 'menu: contenteditable does not count as editable',
    file: MENU,
    from: '      active.isContentEditable ||\n',
    to: '',
    expect: [HEIGHT_KEEPS],
  },
  {
    label: 'menu: the scroll exemption tests the wrong side of the panel',
    file: MENU,
    from: INSIDE_SCROLL_GUARD,
    to: 'if (panel && event.target instanceof Node && !panel.contains(event.target)) return;',
    expect: [SCROLL_INSIDE, SCROLL_OUTSIDE],
  },
  {
    label: 'menu: the scroll listener is never registered',
    file: MENU,
    from: SCROLL_REGISTRATION,
    to: 'void onScroll;',
    expect: [SCROLL_OUTSIDE, LEDGER],
  },
  {
    label: 'menu: the cleanup removes nothing',
    file: MENU,
    from: CLEANUP_BLOCK,
    to: '        void [onPointer, onScroll, onResize];',
    expect: [LEDGER],
  },
  {
    label: 'menu: Escape closes without restoring focus',
    file: MENU,
    from: ESCAPE_BRANCH,
    to: ESCAPE_NO_RESTORE,
    expect: [ESCAPE],
  },
  {
    label: 'menu: an outside pointerdown closes nothing',
    file: MENU,
    from: POINTER_GUARD,
    to: 'if (host && !host.contains(event.target as Node)) void this.controller();',
    expect: [POINTER],
  },
  {
    label: 'select: the height-only exemption never fires',
    file: SELECT,
    from: RESIZE_GUARD,
    to: 'this.editableFocusInsidePanel();',
    expect: [HEIGHT_KEEPS],
  },
  {
    label: 'select: the height-only exemption ignores width',
    file: SELECT,
    from: RESIZE_GUARD,
    to: 'if (this.editableFocusInsidePanel()) return;',
    expect: [WIDTH_CLOSES],
  },
  {
    label: 'select: the scroll exemption tests the wrong side of the panel',
    file: SELECT,
    from: INSIDE_SCROLL_GUARD,
    to: 'if (panel && event.target instanceof Node && !panel.contains(event.target)) return;',
    expect: [SCROLL_INSIDE, SCROLL_OUTSIDE],
  },
  {
    label: 'select: the scroll listener is never registered',
    file: SELECT,
    from: SCROLL_REGISTRATION,
    to: 'void onScroll;',
    expect: [SCROLL_OUTSIDE, LEDGER],
  },
  {
    label: 'select: the cleanup removes nothing',
    file: SELECT,
    from: CLEANUP_BLOCK,
    to: '        void [onPointer, onScroll, onResize];',
    expect: [LEDGER],
  },
  {
    label: 'select: Escape closes without restoring focus',
    file: SELECT,
    from: ESCAPE_BRANCH,
    to: ESCAPE_NO_RESTORE,
    expect: [ESCAPE],
  },
  {
    label: 'select: an outside pointerdown closes nothing',
    file: SELECT,
    from: POINTER_GUARD,
    to: 'if (host && !host.contains(event.target as Node)) void this.controller();',
    expect: [POINTER],
  },
  {
    // A different harness: this guard protects a server, not a viewport, and the
    // open-state effect only runs there if `window` is asked for. Angular swallows
    // an effect error during a server render, so `threw` stays green and the kill
    // is the two state assertions below.
    label: 'menu: the server guard in the listener effect is deleted',
    file: MENU,
    from: `    effect((onCleanup) => {
      if (typeof window === 'undefined') return;`,
    to: '    effect((onCleanup) => {',
    harness: 'ssr',
    expect: [
      'rv-menu (open): the panel really mounted',
      'rv-menu (open): the top-layer probe reports unsupported instead of crashing',
    ],
  },
];

function run(cmd, args, label, options = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      env: options.env ?? process.env,
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (!output.trim()) throw new Error(`${label} failed with no output: ${error.message}`);
    return { code: error.status ?? 1, output };
  }
}

/**
 * Red marks from the reporter's per-test lines, as `describe › test` titles.
 * Matching titles rather than counts is what makes an unexpected failure — a
 * build that did not land, a fixture that moved — show up as a mismatch instead
 * of quietly counting as a kill.
 */
function failingCases(output) {
  const titles = output
    .split('\n')
    .filter((line) => line.includes('✘'))
    .map((line) =>
      line
        .replace(/^.*?conformance\.spec\.ts:\d+:\d+ › /, '')
        .replace(/\s*\([\d.]+m?s\)\s*$/, '')
        .trim(),
    )
    .filter((title) => title.length > 0);
  return [...new Set(titles)].sort();
}

function failingChecks(output) {
  return [
    ...new Set(
      output
        .split('\n')
        .filter((line) => line.trim().startsWith('FAIL'))
        .map((line) =>
          line
            .trim()
            .replace(/^FAIL\s+/, '')
            .split(' — ')[0]
            .trim(),
        ),
    ),
  ].sort();
}

function observe(mutant) {
  // Both libraries, every time, even when only one of them was just rewritten:
  // the first run of this script rebuilt only the mutated one and carried the
  // previous menu mutant inside `dist/menu` through six select runs, reddening
  // menu cases the select break never touched. That is the same stale-`dist/`
  // trap the header warns about, and the strict expected list is what caught it.
  run('npx', ['ng', 'build', 'menu'], 'menu build');
  run('npx', ['ng', 'build', 'select'], 'select build');
  if (mutant.harness === 'ssr') {
    const result = run('node', ['scripts/check-popup-ssr.mjs'], 'server-render gate');
    return { code: result.code, failed: failingChecks(result.output) };
  }
  run('npx', ['ng', 'build', 'menu-e2e'], 'demo build');
  const result = run('npx', ['playwright', 'test', SUITE, '--project=chromium'], 'suite run');
  return { code: result.code, failed: failingCases(result.output) };
}

const originals = new Map();
for (const file of new Set(MUTANTS.map((mutant) => mutant.file))) {
  originals.set(file, readFileSync(file, 'utf8'));
}

function restore() {
  for (const [file, source] of originals) writeFileSync(file, source);
}

const results = [];
let aborted = null;

try {
  // Control: the clean suite must be green, or a red case proves nothing.
  const control = run('npx', ['playwright', 'test', SUITE, '--project=chromium'], 'control run');
  const controlFailures = failingCases(control.output);
  if (control.code !== 0 || controlFailures.length) {
    aborted = `the clean suite is not green: ${controlFailures.join(' | ') || control.output.slice(-400)}`;
  } else {
    const summary = control.output.split('\n').find((line) => line.includes('passed'));
    console.log(`control: the clean suite is green — ${(summary ?? '').trim()}`);
  }

  for (const mutant of MUTANTS) {
    if (aborted) break;
    const source = originals.get(mutant.file);
    const occurrences = source.split(mutant.from).length - 1;
    if (occurrences !== 1) {
      aborted = `${mutant.label}: its anchor occurs ${occurrences} times in ${mutant.file}`;
      break;
    }

    writeFileSync(mutant.file, source.replace(mutant.from, mutant.to));
    const { code, failed } = observe(mutant);

    const missing = mutant.expect.filter(
      (name) => !failed.some((observed) => observed.endsWith(name)),
    );
    const extra = failed.filter(
      (observed) => !mutant.expect.some((name) => observed.endsWith(name)),
    );
    const killed = code !== 0 && missing.length === 0 && extra.length === 0;
    results.push({ label: mutant.label, killed, failed, missing, extra });
    console.log(
      `${killed ? 'KILLED  ' : 'SURVIVED'} ${mutant.label} — red: ${failed.join(' | ') || 'nothing'}`,
    );

    restore();
  }
} finally {
  restore();
  if (!aborted) {
    // Leave `dist/` describing the restored source: the suite reads the bundle,
    // not the tree, so a mutant left in `dist/` would masquerade as a product bug.
    run('npx', ['ng', 'build', 'menu'], 'menu rebuild');
    run('npx', ['ng', 'build', 'select'], 'select rebuild');
    run('npx', ['ng', 'build', 'menu-e2e'], 'demo rebuild');
  }
}

const survivors = results.filter((result) => !result.killed);
console.log(
  `\ncheck:popup-mutations — ${results.length} of ${MUTANTS.length} mutants run, ${results.length - survivors.length} killed exactly as expected.`,
);
for (const result of survivors) {
  const why = result.missing.length
    ? `expected red, stayed green: ${result.missing.join(' | ')}`
    : result.extra.length
      ? `also red, unexpectedly: ${result.extra.join(' | ')}`
      : 'the harness exited 0';
  console.log(`  SURVIVED ${result.label} — ${why}`);
}
if (aborted) {
  console.log(`check:popup-mutations ABORTED: ${aborted}`);
  process.exit(1);
}
if (survivors.length || results.length !== MUTANTS.length) {
  console.log(`check:popup-mutations FAILED (${survivors.length} surviving mutants).`);
  process.exit(1);
}
console.log('check:popup-mutations passed.');

/**
 * pnpm check:popup-mutations — the evidence behind D86's acceptance line:
 * "breaking shared popup behavior makes its contract fail".
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
 * not as extra coverage. Shared-core mutants are expected to fail both hosts'
 * equivalent cases; host-specific focus/keyboard behavior remains outside this
 * mutation set and covered by package characterization tests.
 *
 * The set covers the shared generic rules: height exemption, scroll/pointer
 * dismissal, listener cleanup, plus the host-owned Menu SSR guard.
 *
 * The source files are restored in a `finally`, including on a crash, and the
 * libraries plus the demo are rebuilt on the way out so `dist/` describes the
 * restored source.
 *
 * The suite runs on Chromium only, and that is a speed choice, not a gap: an
 * engine would have to be excluded if it could not launch at all, and WebKit does
 * launch here since `libavif16` was installed (24/24 on 2026-11-01). Rebuilding and
 * re-running eight mutants on three engines costs time to prove a claim about
 * library logic, which is engine-independent — the engine matrix is S7's job and
 * runs the suite separately on all three.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = 'projects/popup/src/lib/popup-core.ts';
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

/** Shared S4 guard. */
const RESIZE_GUARD = 'if (width === widthAtOpen && options.editableFocusInsidePanel()) return;';

const INSIDE_SCROLL_GUARD =
  'if (panel && event.target instanceof Node && panel.contains(event.target)) return;';

const SCROLL_REGISTRATION = "win.addEventListener('scroll', onScroll, true);";

const CLEANUP_BLOCK = `    doc.removeEventListener('pointerdown', onPointer);
    win.removeEventListener('scroll', onScroll, true);
    win.removeEventListener('resize', onResize);`;

const POINTER_GUARD = 'if (host && !host.contains(event.target as Node)) options.dismiss();';

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
    label: 'core: the height-only exemption never fires',
    file: CORE,
    from: RESIZE_GUARD,
    to: 'options.editableFocusInsidePanel();',
    expect: [HEIGHT_KEEPS],
  },
  {
    label: 'core: the height-only exemption ignores editability',
    file: CORE,
    from: RESIZE_GUARD,
    to: 'if (width === widthAtOpen) return;',
    expect: [HEIGHT_CLOSES],
  },
  {
    label: 'core: the height-only exemption ignores width',
    file: CORE,
    from: RESIZE_GUARD,
    to: 'if (options.editableFocusInsidePanel()) return;',
    expect: [WIDTH_CLOSES],
  },
  {
    label: 'core: the scroll exemption tests the wrong side of the panel',
    file: CORE,
    from: INSIDE_SCROLL_GUARD,
    to: 'if (panel && event.target instanceof Node && !panel.contains(event.target)) return;',
    expect: [SCROLL_INSIDE, SCROLL_OUTSIDE],
  },
  {
    label: 'core: the scroll listener is never registered',
    file: CORE,
    from: SCROLL_REGISTRATION,
    to: '  void onScroll;',
    expect: [SCROLL_OUTSIDE, LEDGER],
  },
  {
    label: 'core: the cleanup removes nothing',
    file: CORE,
    from: CLEANUP_BLOCK,
    to: '    void [onPointer, onScroll, onResize];',
    expect: [LEDGER],
  },
  {
    label: 'core: an outside pointerdown closes nothing',
    file: CORE,
    from: POINTER_GUARD,
    to: 'if (host && !host.contains(event.target as Node)) void options.panel();',
    expect: [POINTER],
  },
  {
    label: 'core: a missing browser context is not SSR-safe',
    file: CORE,
    from: '  if (!doc || !win) return;',
    to: '  if (!doc || !win) { options.dismiss(); return; }',
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
 *
 * The `✘` is the `list` reporter's glyph, which is what `playwright.config.ts`
 * selects. Measured: `--reporter=line` prints the same tests with no `✘` at all,
 * so a run forced onto another reporter would report every mutant as surviving.
 * The harness never overrides the reporter, and this script's own tests use the
 * captured `list` shape.
 */
export function failingCases(output) {
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

export function failingChecks(output) {
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
  // Rebuild the core first, then both consumers, so no mutant is hidden by a
  // stale dist/popup or bundled into only one consumer.
  run('npx', ['ng', 'build', 'popup'], 'popup core build');
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

// The run itself is for a direct invocation only: `scripts/tests` imports the
// two reporter parsers out of this file, and an import must not rebuild the
// libraries or rewrite a source file on its way through the mutants.
const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  const originals = new Map();
  for (const file of new Set(MUTANTS.map((mutant) => mutant.file))) originals.set(file, readFileSync(file, 'utf8'));

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
    // Leave `dist/` describing the restored source, even after an abort: a
    // mutant left in dist would make the next clean control misleading.
    run('npx', ['ng', 'build', 'popup'], 'popup core rebuild');
    run('npx', ['ng', 'build', 'menu'], 'menu rebuild');
    run('npx', ['ng', 'build', 'select'], 'select rebuild');
    run('npx', ['ng', 'build', 'menu-e2e'], 'demo rebuild');
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
}

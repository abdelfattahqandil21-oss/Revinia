import { describe, expect, it } from 'vitest';
import { failingCases, failingChecks } from '../check-popup-mutations.mjs';

/**
 * `check:popup-mutations` decides that a mutant was killed by matching the case
 * titles that went red against the list it expects. Both halves of that
 * judgement come out of these two parsers, so a parser that quietly returns
 * nothing would turn every mutant into a survivor — and, worse, a parser that
 * reads the wrong line would credit a kill to a case that never failed.
 *
 * The fixtures are the real output shapes: the `list` reporter line was captured
 * from `npx playwright test <one failing case> --project=chromium` on this
 * repository's own config, and the `FAIL` line from `check-popup-ssr.mjs`'s
 * `check()`.
 */

const RED = '  ✘  1 [chromium] › e2e/popup/conformance.spec.ts:41:7 › rv-menu popup › a height-only resize keeps the panel open (1.2s)';
const GREEN = '  ✓  2 [chromium] › e2e/popup/conformance.spec.ts:52:7 › rv-menu popup › Escape closes and returns focus (34ms)';
const SUMMARY = '  1 failed\n  1 passed (1.1s)';

describe('failingCases — the browser harness', () => {
  it('reads the describe-prefixed title out of a red line, minus location and duration', () => {
    expect(failingCases(RED)).toEqual([
      'rv-menu popup › a height-only resize keeps the panel open',
    ]);
  });

  it('ignores green cases and the run summary', () => {
    expect(failingCases(`${GREEN}\n${SUMMARY}`)).toEqual([]);
  });

  it('keeps a red from another spec file, so an unexpected failure is reported as extra', () => {
    const other =
      '  ✘  1 [chromium] › e2e/select/select.spec.ts:9:7 › select: multi mode › picks two (88ms)';
    const [title] = failingCases(other);
    // Not dropped, and still matched by the harness's `endsWith` comparison.
    expect(title.endsWith('select: multi mode › picks two')).toBe(true);
  });

  it('counts a retried case once, and returns a stable order', () => {
    const second =
      '  ✘  2 [chromium] › e2e/popup/conformance.spec.ts:60:7 › rv-select popup › a width change closes it (5ms)';
    expect(failingCases(`${second}\n${RED}\n${RED}`)).toEqual([
      'rv-menu popup › a height-only resize keeps the panel open',
      'rv-select popup › a width change closes it',
    ].sort());
  });
});

describe('failingChecks — the server-render harness', () => {
  it('takes the check name out of a FAIL line and drops the measured reason', () => {
    expect(
      failingChecks('  FAIL rv-menu (open): the panel really mounted — expected 3 nodes, got 0'),
    ).toEqual(['rv-menu (open): the panel really mounted']);
  });

  it('ignores passing checks', () => {
    expect(failingChecks('  ok   rv-menu (closed): the panel is absent — 0 nodes')).toEqual([]);
  });

  it('ignores the script’s own summary line, which contains FAILED but names no check', () => {
    expect(
      failingChecks('check:popup-ssr FAILED (2): a broken one | another broken one'),
    ).toEqual([]);
  });

  it('de-duplicates and sorts, whatever order the gate printed', () => {
    const output = [
      '  FAIL b — reason',
      '  FAIL a — reason',
      '  ok   c — reason',
      '  FAIL a — repeated',
    ].join('\n');
    expect(failingChecks(output)).toEqual(['a', 'b']);
  });
});

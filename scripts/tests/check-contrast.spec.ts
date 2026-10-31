import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CSS,
  PALETTE,
  PAIRS,
  auditPalette,
  auditThemeCss,
  contrastRatio,
  formatRows,
  luminance,
  parseHex,
} from '../check-contrast.mjs';

/**
 * The contrast gate answers one question: does the theme it ships still meet
 * the WCAG AA promise, in both schemes? The maths is tested against known
 * values and the stylesheet against the palette, so a value edited in one of
 * the two dark blocks cannot pass unnoticed.
 */

const light: Record<string, string> = {
  bg: '#ffffff',
  fg: '#111111',
  muted: '#555555',
  border: '#e0e0e0',
  accent: '#5b5bd6',
  danger: '#dc2626',
  ok: '#16a34a',
  info: '#2563eb',
  warning: '#d97706',
};

const dark: Record<string, string> = {
  bg: '#161616',
  fg: '#f2f2f2',
  muted: '#a1a1aa',
  border: '#3f3f46',
  accent: '#8b8bf0',
  danger: '#f87171',
  ok: '#4ade80',
  info: '#60a5fa',
  warning: '#fbbf24',
};

function block(tokens: Record<string, string>, scheme: string): string {
  const lines = Object.entries(tokens).map(([name, value]) => `    --rv-${name}: ${value};`);
  return `    color-scheme: ${scheme};\n${lines.join('\n')}`;
}

/** A minimal stylesheet with the same shape as the real one. */
function stylesheet(
  overrides: { light?: Record<string, string>; dark?: Record<string, string> } = {},
): string {
  const lightTokens = { ...light, ...overrides.light };
  const darkTokens = { ...dark, ...overrides.dark };
  return `@layer rivinia-theme {
  :root {
${block(lightTokens, 'light')}
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-rv-theme='light']) {
${block(darkTokens, 'dark')}
    }
  }
  :root[data-rv-theme='dark'] {
${block(darkTokens, 'dark')}
  }
}
`;
}

describe('contrast maths', () => {
  it('black on white is 21:1, and the ratio is symmetric', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#5b5bd6', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#5b5bd6'),
      10,
    );
  });

  it('separates a pass from a fail at the 4.5 line', () => {
    // #767676 is the classic "just passes" grey on white; #777777 does not.
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });

  it('rejects anything that is not a six-digit hex', () => {
    expect(() => parseHex('red')).toThrow(/six-digit hex/);
    expect(() => parseHex('#fff')).toThrow(/six-digit hex/);
    expect(() => parseHex('rgba(0,0,0,.5)')).toThrow(/six-digit hex/);
    expect(parseHex('#5B5BD6')).toEqual([91, 91, 214]);
  });

  it('matches the WCAG reference luminance', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 6);
    expect(luminance('#000000')).toBeCloseTo(0, 6);
    expect(luminance('#808080')).toBeCloseTo(0.2159, 4);
  });
});

describe('auditThemeCss', () => {
  it('accepts a stylesheet that carries the palette in all three blocks', () => {
    const report = auditThemeCss(stylesheet());
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('reports a token edited in one block', () => {
    const report = auditThemeCss(stylesheet({ light: { muted: '#999999' } }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(
      /light: --rv-muted is #999999, the palette says #555555/,
    );
  });

  it('reports a dark value that lands in only one of the two dark blocks', () => {
    const css = stylesheet().replace(
      `  :root[data-rv-theme='dark'] {\n${block(dark, 'dark')}`,
      `  :root[data-rv-theme='dark'] {\n${block({ ...dark, muted: '#808080' }, 'dark')}`,
    );
    const report = auditThemeCss(css);
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(/the two dark blocks disagree \(--rv-muted\)/);
  });

  it('reports a missing block', () => {
    const css = stylesheet().replace(/:root\[data-rv-theme='dark'\] \{[\s\S]*?\n  \}\n/, '');
    const report = auditThemeCss(css);
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toMatch(/no `:root\[data-rv-theme="dark"\]` block/);
  });

  it('fails a palette whose dark muted grey drops under 4.5:1', () => {
    // Palette-level, so the drift check does not answer first.
    const report = auditPalette({ light, dark: { ...dark, muted: '#666666' } });
    expect(report.problems.join('\n')).toMatch(/dark: --rv-muted .* below 4.5:1/);
  });

  it('measures the decorative border without failing on it', () => {
    const report = auditThemeCss(stylesheet());
    const border = report.rows.find((row) => row.pair.fg === 'border' && row.scheme === 'light');
    expect(border?.enforced).toBe(false);
    expect(border?.ratio).toBeLessThan(3);
    expect(report.ok).toBe(true);
  });

  it('prints one line per pair with the verdict', () => {
    const report = auditThemeCss(stylesheet());
    const text = formatRows(report.rows);
    expect(text.split('\n')).toHaveLength(report.rows.length);
    expect(text).toMatch(
      /text +--rv-fg on --rv-bg +#111111 on #ffffff +18\.\d+:1 \(min 4\.5\) +pass/,
    );
    expect(text).toMatch(/decorative --rv-border on --rv-bg .*recommended 3\) +info/);
  });
});

describe('the shipped stylesheet', () => {
  it('passes the gate', () => {
    const report = auditThemeCss(readFileSync(DEFAULT_CSS, 'utf8'));
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('checks every colour token the palette declares', () => {
    const report = auditThemeCss(readFileSync(DEFAULT_CSS, 'utf8'));
    for (const scheme of ['light', 'dark'] as const) {
      const measured = new Set(
        report.rows.filter((row) => row.scheme === scheme).map((row) => row.pair.fg),
      );
      for (const token of Object.keys(PALETTE[scheme])) {
        const covered = measured.has(token) || PAIRS.some((pair) => pair.bg === token);
        expect(covered, `${token} in ${scheme}`).toBe(true);
      }
    }
  });

  it('is the file the theme actually builds from', () => {
    expect(DEFAULT_CSS.endsWith(join('projects', 'theme', 'styles', 'theme.css'))).toBe(true);
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALLOWLIST,
  PLATFORM_TERMS,
  auditDocument,
  collectExports,
  consumerDocuments,
} from '../check-docs.mjs';

/**
 * `check:docs` asks one question of a consumer document: does every symbol it
 * names in an API table exist in the package? Since the S9 content move the
 * answer is no longer in the README alone — the reference tables live in
 * `docs/<pkg>/`, so a page filed there has to be in scope, and a repo-internal
 * document (which names removed and `@internal` symbols on purpose) must not.
 * Each case below is the smallest document that breaks one half of that.
 */

const EXPORTS = new Set(['RiviniaLanguageSelect', 'languageSelectOptions', 'provideRiviniaI18n']);

function audit(text: string, extra: Record<string, unknown> = {}) {
  return auditDocument({ rel: 'docs/i18n/api.md', text, exports: EXPORTS, ...extra });
}

describe('scope: which documents are consumer documents', () => {
  /** A package with a README, a topic page and a repo-internal note beside it. */
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'rv-docs-'));
    mkdirSync(join(root, 'projects', 'probe', 'src'), { recursive: true });
    mkdirSync(join(root, 'docs', 'probe'), { recursive: true });
    writeFileSync(join(root, 'projects', 'probe', 'README.md'), '# probe\n\n`RiviniaWidget`\n');
    writeFileSync(
      join(root, 'projects', 'probe', 'src', 'public-api.ts'),
      'export { RiviniaWidget } from "./widget";\n',
    );
    writeFileSync(
      join(root, 'docs', 'probe', 'reference.md'),
      '`RiviniaWidget` and `RiviniaGhost`\n',
    );
    writeFileSync(join(root, 'docs', 'DECISIONS.md'), '`RiviniaWidget` and `RiviniaGhost`\n');
    return root;
  }

  it('reads the topic pages under docs/<pkg>/', () => {
    const root = fixture();
    try {
      const files = consumerDocuments('probe', { root }).map((doc) => doc.rel);
      expect(files).toContain('docs/probe/reference.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves a repo-internal document out of the consumer scan', () => {
    const root = fixture();
    try {
      const files = consumerDocuments('probe', { root }).map((doc) => doc.rel);
      expect(files).not.toContain('docs/DECISIONS.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // The gate asks the package, not the caller, what its surface is; a secondary
  // entry point counts.
  it('collects exports from every entry point of the package', () => {
    const root = mkdtempSync(join(tmpdir(), 'rv-docs-'));
    try {
      mkdirSync(join(root, 'probe', 'src'), { recursive: true });
      mkdirSync(join(root, 'probe', 'ui', 'src'), { recursive: true });
      writeFileSync(
        join(root, 'probe', 'src', 'public-api.ts'),
        'export { RiviniaCore } from "./core";\n',
      );
      writeFileSync(
        join(root, 'probe', 'ui', 'src', 'public-api.ts'),
        'export { RiviniaToggle } from "./toggle";\n',
      );
      expect([...collectExports('probe', root)].sort()).toEqual(['RiviniaCore', 'RiviniaToggle']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('rule 1: API tables', () => {
  it('fails a topic page whose table names an unexported symbol', () => {
    const report = audit('| `RiviniaLanagugeSelect` | component |\n');
    expect(report.failures.join('\n')).toMatch(/table mentions unexported `RiviniaLanagugeSelect`/);
  });

  it('passes the same table when the symbol is exported', () => {
    expect(audit('| `RiviniaLanguageSelect` | component |\n').failures).toEqual([]);
  });

  it('reads the family marker `RiviniaTimeZone*` as a prefix', () => {
    const report = auditDocument({
      rel: 'docs/theme/tokens.md',
      text: '| `RiviniaWidget*` | family |\n',
      exports: new Set(['RiviniaWidgetToken']),
    });
    expect(report.failures).toEqual([]);
  });

  it('ignores a table of literal tokens, which is vocabulary and not API', () => {
    const text = '| Token | Meaning |\n| ----- | ------- |\n| `CanvasText` | the ink |\n';
    expect(audit(text).failures).toEqual([]);
  });
});

describe('rule 2: prose identifiers', () => {
  // The i18n reference quotes `ar-EG`, `::currency/XXX` and `T12:00:00Z`. An
  // all-caps token is a region subtag, a currency code or a pattern letter — it
  // can never be a Rivinia export, so it must not be reported at all.
  it('does not report a locale, currency or pattern-letter token', () => {
    const report = audit('`ar-EG` renders `٣` and `::currency/USD` prints 12:30 as `T12:30Z`.\n');
    expect(report.warnings).toEqual([]);
    expect(report.failures).toEqual([]);
  });

  it('reports a CamelCase typo in prose as a warning', () => {
    const report = audit('Use `RiviniaLanagugeSelect` here.\n');
    expect(report.warnings.join('\n')).toMatch(/prose mentions unexported `RiviniaLanagugeSelect`/);
    expect(report.failures).toEqual([]);
  });

  // `provide*`/`inject*`/`define*` can only be a package symbol, so a wrong one
  // is a defect even when nothing is enforced about prose.
  it('always fails an unexported provider name, even without --strict-prose', () => {
    const report = audit('Call `provideRiviniaI18nn()` to wire it.\n');
    expect(report.failures.join('\n')).toMatch(/provideRiviniaI18nn/);
  });

  it('fails prose identifiers under --strict-prose', () => {
    const report = audit('Use `RiviniaLanagugeSelect` here.\n', { strictProse: true });
    expect(report.failures.join('\n')).toMatch(/FAIL docs\/i18n\/api\.md/);
    expect(report.warnings).toEqual([]);
  });

  it('accepts the platform vocabulary the reference must name', () => {
    expect([...PLATFORM_TERMS]).toEqual(
      expect.arrayContaining(['Intl', 'PluralRules', 'CanvasText']),
    );
    const report = audit(
      'Plurals go through `Intl.PluralRules`; forced colours paint `CanvasText`.\n',
    );
    expect(report.warnings).toEqual([]);
  });

  // `injectI18n` is what `rivinia-i18n-keys init` writes into the application,
  // so the docs name a real symbol that is deliberately not a package export.
  it('accepts the generated helper the CLI writes', () => {
    expect(ALLOWLIST.has('injectI18n')).toBe(true);
    expect(audit('The generated file exports `injectI18n`.\n').failures).toEqual([]);
  });
});

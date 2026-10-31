/**
 * pnpm check:theme-dark — the dark-mode cascade, proved in two engines.
 *
 * The contrast script checks the numbers; this one checks that the numbers
 * actually reach the page. Each case is a real HTML document with the shipped
 * `theme.css` (or `bootstrap.css`) linked, rendered in Chromium and Firefox
 * with an emulated `prefers-color-scheme`, then the computed background,
 * colour and `color-scheme` are compared.
 *
 * Cases:
 *  1. OS dark, no attribute            → the dark values.
 *  2. OS light, no attribute           → the light values.
 *  3. OS dark + data-rv-theme="light"  → the light values (opt-out).
 *  4. OS light + data-rv-theme="dark"  → the dark values (explicit wins).
 *  5. OS dark + data-rv-theme="dark"   → the dark values.
 *  6. Bootstrap light, OS dark         → Bootstrap's palette wins; color-scheme light.
 *  7. Bootstrap dark, OS light         → Bootstrap's palette wins; color-scheme dark.
 *
 * Cases 6 and 7 are the reason the adapter's rules stay unlayered: unlayered
 * declarations beat every layered one, so Bootstrap stays authoritative over
 * the theme's `@media (prefers-color-scheme: dark)` block.
 *
 * Needs the Playwright browsers (`npx playwright install`), so it runs on
 * demand, not in `pnpm test`.
 */
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = join(ROOT, 'projects', 'theme', 'styles');

const BODY = '<style>body{background:var(--rv-bg);color:var(--rv-fg)}</style>';

export const CASES = Object.freeze([
  {
    file: 'plain',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'OS dark, no attribute',
    scheme: 'dark',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark' },
  },
  {
    file: 'plain',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'OS light, no attribute',
    scheme: 'light',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light' },
  },
  {
    file: 'light-attr',
    htmlAttrs: ' data-rv-theme="light"',
    stylesheet: 'theme.css',
    label: 'OS dark + data-rv-theme="light"',
    scheme: 'dark',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light' },
  },
  {
    file: 'dark-attr',
    htmlAttrs: ' data-rv-theme="dark"',
    stylesheet: 'theme.css',
    label: 'OS light + data-rv-theme="dark"',
    scheme: 'light',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark' },
  },
  {
    file: 'dark-attr',
    htmlAttrs: ' data-rv-theme="dark"',
    stylesheet: 'theme.css',
    label: 'OS dark + data-rv-theme="dark"',
    scheme: 'dark',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark' },
  },
  {
    file: 'bs-light',
    htmlAttrs: ' data-bs-theme="light"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap light, OS dark',
    scheme: 'dark',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light' },
  },
  {
    file: 'bs-dark',
    htmlAttrs: ' data-bs-theme="dark"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap dark, OS light',
    scheme: 'light',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark' },
  },
]);

function document(htmlAttrs, stylesheet) {
  return `<!doctype html><html${htmlAttrs}><head><link rel="stylesheet" href="${stylesheet}">${BODY}</head><body><p>probe</p></body></html>`;
}

function writeFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'rv-theme-dark-'));
  copyFileSync(join(STYLES, 'theme.css'), join(dir, 'theme.css'));
  copyFileSync(join(STYLES, 'bootstrap.css'), join(dir, 'bootstrap.css'));
  for (const testCase of CASES) {
    writeFileSync(
      join(dir, `${testCase.file}.html`),
      document(testCase.htmlAttrs, testCase.stylesheet),
    );
  }
  return dir;
}

function toHex(rgb) {
  const match = /rgba?\((\d+), (\d+), (\d+)/.exec(rgb);
  return match
    ? `#${[1, 2, 3].map((index) => Number(match[index]).toString(16).padStart(2, '0')).join('')}`
    : rgb;
}

export async function run({ engines = ['chromium', 'firefox'], log = console.log } = {}) {
  const { chromium, firefox } = await import('@playwright/test');
  const available = { chromium, firefox };
  const dir = writeFixtures();
  const failures = [];
  try {
    for (const engineName of engines) {
      const browser = await available[engineName].launch();
      try {
        for (const testCase of CASES) {
          const context = await browser.newContext({ colorScheme: testCase.scheme });
          const page = await context.newPage();
          await page.goto(`file://${join(dir, `${testCase.file}.html`)}`);
          const actual = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            const body = getComputedStyle(document.body);
            return { bg: body.backgroundColor, fg: body.color, colorScheme: root.colorScheme };
          });
          await context.close();
          const measured = {
            bg: toHex(actual.bg),
            fg: toHex(actual.fg),
            colorScheme: actual.colorScheme,
          };
          const mismatches = Object.entries(testCase.expect).filter(
            ([key, value]) => measured[key] !== value,
          );
          if (mismatches.length) {
            failures.push({
              engine: engineName,
              testCase,
              measured,
              mismatches: mismatches.map(([key]) => key),
            });
            log(
              `FAIL ${engineName.padEnd(8)} ${testCase.label.padEnd(32)} got ${JSON.stringify(measured)}`,
            );
          } else {
            log(
              `PASS ${engineName.padEnd(8)} ${testCase.label.padEnd(32)} ${measured.bg} / ${measured.colorScheme}`,
            );
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return failures;
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) {
  const failures = await run();
  if (failures.length) {
    console.error(`check:theme-dark — ${failures.length} case(s) do not match`);
    process.exit(1);
  }
  console.log('check:theme-dark — ok');
}

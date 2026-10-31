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
 *  8. Consumer `:root` override, OS dark → the consumer's value wins.
 *  9. Bootstrap light variables, OS dark → `--rv-*` follows `--bs-*`, not the fallbacks.
 * 10. Bootstrap dark variables, OS light → same, in the dark block.
 * 11. A dark section inside a light page → `--rv-*` and `color-scheme` on the
 *     section reach it and nothing outside it. This is the README's workaround
 *     for the fact that `data-rv-theme` is read on `<html>` only.
 *
 * Cases 6 and 7 are the reason the adapter's rules stay unlayered: unlayered
 * declarations beat every layered one, so Bootstrap stays authoritative over
 * the theme's `@media (prefers-color-scheme: dark)` block.
 *
 * Cases 8, 9 and 10 exist because the first seven would pass for the wrong
 * reason. 8 proves the layer really is a layer — an unlayered `:root` rule must
 * beat the layered defaults. 9 and 10 supply `--bs-*` from the fixture, so the
 * expected value comes from the fixture and not from the adapter's own
 * fallbacks: a misspelled `var(--bs-…)` cannot pass any more.
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

const BODY = '<style>body,#section-probe{background:var(--rv-bg);color:var(--rv-fg)}</style>';

export const CASES = Object.freeze([
  {
    id: 'os-dark',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'OS dark, no attribute',
    scheme: 'dark',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'os-light',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'OS light, no attribute',
    scheme: 'light',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light', shadowAlpha: 0.22 },
  },
  {
    id: 'light-attr',
    htmlAttrs: ' data-rv-theme="light"',
    stylesheet: 'theme.css',
    label: 'OS dark + data-rv-theme="light"',
    scheme: 'dark',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light', shadowAlpha: 0.22 },
  },
  {
    id: 'dark-attr-light-os',
    htmlAttrs: ' data-rv-theme="dark"',
    stylesheet: 'theme.css',
    label: 'OS light + data-rv-theme="dark"',
    scheme: 'light',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'dark-attr-dark-os',
    htmlAttrs: ' data-rv-theme="dark"',
    stylesheet: 'theme.css',
    label: 'OS dark + data-rv-theme="dark"',
    scheme: 'dark',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'bs-light',
    htmlAttrs: ' data-bs-theme="light"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap light, OS dark',
    scheme: 'dark',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light', shadowAlpha: 0.22 },
  },
  {
    id: 'bs-dark',
    htmlAttrs: ' data-bs-theme="dark"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap dark, OS light',
    scheme: 'light',
    expect: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'consumer-override',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'consumer :root override, OS dark',
    scheme: 'dark',
    extra: ':root{--rv-bg:#ff0000;--rv-fg:#00ff00}',
    expect: { bg: '#ff0000', fg: '#00ff00', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'bs-map-light',
    htmlAttrs: ' data-bs-theme="light"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap light vars, OS dark',
    scheme: 'dark',
    extra: ':root{--bs-body-bg:#123456;--bs-body-color:#abcdef}',
    expect: { bg: '#123456', fg: '#abcdef', colorScheme: 'light', shadowAlpha: 0.22 },
  },
  {
    id: 'bs-map-dark',
    htmlAttrs: ' data-bs-theme="dark"',
    stylesheet: 'bootstrap.css',
    label: 'Bootstrap dark vars, OS light',
    scheme: 'light',
    extra: '[data-bs-theme="dark"]{--bs-body-bg:#102030;--bs-body-color:#dcba98}',
    expect: { bg: '#102030', fg: '#dcba98', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
  {
    id: 'section-dark',
    htmlAttrs: '',
    stylesheet: 'theme.css',
    label: 'dark section in a light page',
    scheme: 'light',
    // The README's recipe, verbatim.
    extra:
      '#section-probe{color-scheme:dark;--rv-bg:#161616;--rv-fg:#f2f2f2;--rv-muted:#a1a1aa;--rv-border:#3f3f46;--rv-accent:#8b8bf0;--rv-shadow:0 16px 48px rgba(0,0,0,.6)}',
    expect: { bg: '#ffffff', fg: '#111111', colorScheme: 'light', shadowAlpha: 0.22 },
    expectSection: { bg: '#161616', fg: '#f2f2f2', colorScheme: 'dark', shadowAlpha: 0.6 },
  },
]);

function document(htmlAttrs, stylesheet, extra = '') {
  // The consumer sheet goes BEFORE the theme link on purpose: the layer is
  // what makes it win, not source order.
  const override = extra ? `<style>${extra}</style>` : '';
  return `<!doctype html><html${htmlAttrs}><head>${override}<link rel="stylesheet" href="${stylesheet}">${BODY}</head><body><p>probe</p><section id="section-probe">section</section></body></html>`;
}

function writeFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'rv-theme-dark-'));
  copyFileSync(join(STYLES, 'theme.css'), join(dir, 'theme.css'));
  copyFileSync(join(STYLES, 'bootstrap.css'), join(dir, 'bootstrap.css'));
  for (const testCase of CASES) {
    writeFileSync(
      join(dir, `${testCase.id}.html`),
      document(testCase.htmlAttrs, testCase.stylesheet, testCase.extra),
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
          await page.goto(`file://${join(dir, `${testCase.id}.html`)}`);
          const actual = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            const body = getComputedStyle(document.body);
            const section = getComputedStyle(document.querySelector('#section-probe'));
            const alphaOf = (value) => {
              const match = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(value.trim());
              return match ? Number(match[1]) : null;
            };
            const shadowAlpha = alphaOf(root.getPropertyValue('--rv-shadow'));
            const sectionShadowAlpha = alphaOf(
              getComputedStyle(document.querySelector('#section-probe')).getPropertyValue(
                '--rv-shadow',
              ),
            );
            return {
              bg: body.backgroundColor,
              fg: body.color,
              colorScheme: root.colorScheme,
              shadowAlpha,
              sectionShadowAlpha,
              sectionBg: section.backgroundColor,
              sectionFg: section.color,
              sectionColorScheme: section.colorScheme,
            };
          });
          await context.close();
          const measured = {
            bg: toHex(actual.bg),
            fg: toHex(actual.fg),
            colorScheme: actual.colorScheme,
            shadowAlpha: actual.shadowAlpha,
            sectionShadowAlpha: actual.sectionShadowAlpha,
            sectionBg: toHex(actual.sectionBg),
            sectionFg: toHex(actual.sectionFg),
            sectionColorScheme: actual.sectionColorScheme,
          };
          const expected = {
            ...testCase.expect,
            ...Object.fromEntries(
              Object.entries(testCase.expectSection ?? {}).map(([key, value]) => [
                `section${key[0].toUpperCase()}${key.slice(1)}`,
                value,
              ]),
            ),
          };
          const mismatches = Object.entries(expected).filter(
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
              `FAIL ${engineName.padEnd(8)} ${testCase.label.padEnd(32)} ${mismatches.map(([key]) => key).join(', ')}: got ${JSON.stringify(measured)}`,
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

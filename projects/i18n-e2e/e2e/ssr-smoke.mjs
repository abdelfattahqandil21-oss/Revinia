/**
 * SSR smoke test — the part of the proof Playwright cannot do, because it
 * needs the server process's own stdout.
 *
 *   node projects/i18n-e2e/e2e/ssr-smoke.mjs
 *
 * Prerequisite: `npx ng build i18n && npx ng build i18n-e2e` (the default
 * configuration, which emits browser/ AND server/).
 *
 * Asserts, against the REAL server render:
 *   1. the response HTML carries the Arabic copy (no raw keys, no
 *      `[object Object]`);
 *   2. the server log shows no fetch failure and no render error;
 *   3. the HTML carries the TransferState payload, so the client does not
 *      refetch the dictionary;
 *   4. Chromium hydrates that HTML with zero console errors and the same text,
 *      and the app is interactive afterwards.
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 4300;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const AR_HERO = 'مدير لغات واحد لكل اللغات';
const AR_TITLE = 'ريفينيا للتعريب';
const EN_HERO = 'One language manager, every locale';

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail && !condition ? ` — ${detail}` : ''}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls an async read until it matches; a single read races the CD cycle. */
async function until(read, expected, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let last = '';
  while (Date.now() < deadline) {
    last = String((await read()) ?? '');
    if (last === expected) return last;
    await sleep(50);
  }
  return last;
}

async function waitForServer(logs) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${ORIGIN}/`);
      if (response.ok) return response;
    } catch {
      // not listening yet
    }
    await sleep(250);
  }
  throw new Error(`server did not answer on ${ORIGIN}\n${logs.join('')}`);
}

const server = spawn(process.execPath, ['dist/i18n-e2e/server/server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const logs = [];
server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');
server.stdout.on('data', (chunk) => logs.push(chunk));
server.stderr.on('data', (chunk) => logs.push(chunk));

let browser;
try {
  const response = await waitForServer(logs);
  const html = await response.text();

  check('SSR responds 200', response.status === 200, String(response.status));
  check('SSR HTML contains the Arabic hero', html.includes(AR_HERO));
  check('SSR HTML contains the Arabic title', html.includes(AR_TITLE));
  check('SSR HTML sets lang="ar" dir="rtl"', /<html[^>]*lang="ar"[^>]*dir="rtl"/.test(html));
  check('SSR HTML has no raw key', !/\b(home\.hero|app\.title|icu\.items)\b/.test(html));
  check('SSR HTML has no [object Object]', !html.includes('[object Object]'));
  check('SSR HTML carries the TransferState payload', html.includes('ng-state'));

  const log = logs.join('');
  check('server log has no fetch failure', !/failed to load|Failed to parse URL|fetch failed/i.test(log));
  check('server log has no render error', !/SSR failed/.test(log), log.slice(0, 400));

  browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const dictionaryRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('request', (request) => {
    if (request.url().includes('/i18n/')) dictionaryRequests.push(request.url());
  });

  await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });

  check('hydration keeps the Arabic title', (await page.getByTestId('app-title').textContent()) === AR_TITLE);
  check('hydration keeps the Arabic hero', (await page.getByTestId('hero').textContent()) === AR_HERO);
  check(
    'the client reuses the transfer state (no dictionary refetch)',
    dictionaryRequests.length === 0,
    dictionaryRequests.join(', '),
  );

  // Interactive after hydration: the language switch really runs. The marker
  // is set by `afterNextRender` (browser-only), so this waits for the app to
  // be live rather than for a timer. Without it a click can land before
  // hydration and be dropped — the clean CSR shell carries no event-dispatch
  // contract script, so there is nothing to replay it (measured).
  await page.waitForSelector('html[data-hydrated="true"]');
  await page.getByTestId('lang-en').click();
  const switched = await until(() => page.getByTestId('hero').textContent(), EN_HERO);
  check('the hydrated app switches language', switched === EN_HERO, switched);
  const dir = await until(() => page.locator('html').getAttribute('dir'), 'ltr');
  check('the hydrated app flips dir', dir === 'ltr', dir);

  check('zero console errors in the hydrated page', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('zero uncaught page errors in the hydrated page', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) {
  check('SSR smoke completed', false, String(error));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} SSR checks passed.`);
if (failed.length > 0) {
  console.log('\nServer log:\n' + logs.join(''));
  process.exitCode = 1;
}

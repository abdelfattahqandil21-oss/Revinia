import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The `@rivinia/i18n/select` proof in a real browser. The geometry assertions
 * are the reason this suite exists: in a plain block-flow page the host is
 * shrink-to-fit, and `rv-select`'s `min-width: min(14rem, 100%)` resolves that
 * `100%` to 0 — so without a floor on the picker's own host the trigger, the
 * panel and every row collapse to one character per line (`English` renders as
 * `En / gli / sh`). Neither a unit test nor a build can see that.
 *
 * Like the toggle spec, every test also enforces zero console and page errors.
 */
const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
});

test.afterEach(() => {
  expect(consoleErrors, 'console.error output').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});

function picker(page: Page, testId: string): Locator {
  return page.getByTestId(testId);
}

async function open(page: Page, testId: string): Promise<Locator> {
  await picker(page, testId).locator('.rv-select-trigger').click();
  const panel = picker(page, testId).locator('.rv-select-popup-panel');
  await expect(panel).toBeVisible();
  return panel;
}

/** Height relative to the row's own line box — one line, not a wrapped column. */
async function lineCounts(label: Locator): Promise<{ lines: number; width: number }> {
  return label.evaluate((element) => {
    const style = getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const box = element.getBoundingClientRect();
    return {
      lines: box.height / (Number.isNaN(lineHeight) ? 19 : lineHeight),
      width: box.width,
    };
  });
}

test('the closed trigger keeps the picker at its minimum width', async ({ page }) => {
  await page.goto('/select');
  await expect(page.getByTestId('select-title')).toHaveText('قائمة اللغات');

  const host = await picker(page, 'managed-select').evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, display: getComputedStyle(element).display };
  });

  // 14rem at the default 16px root.
  expect(host.width).toBeGreaterThanOrEqual(220);
  expect(host.display).toBe('inline-block');
});

test('opened rows stay one line per language', async ({ page }) => {
  await page.goto('/select');
  const panel = await open(page, 'managed-select');

  const panelWidth = await panel.evaluate((element) => element.getBoundingClientRect().width);
  expect(panelWidth).toBeGreaterThanOrEqual(200);

  const rows = panel.locator('[rvselectpopupitem]');
  await expect(rows).toHaveCount(2);

  for (const id of ['ar', 'en']) {
    const label = panel.locator(`[rvselectpopupitem][data-rv-id="${id}"] .rv-select-label`);
    const { lines, width } = await lineCounts(label);
    expect(lines, `${id} label wrapped onto ${lines.toFixed(2)} lines`).toBeLessThan(1.6);
    expect(width, `${id} label width`).toBeGreaterThan(60);
  }

  await expect(panel.locator('[data-rv-id="ar"] .rv-select-label')).toHaveAttribute('lang', 'ar');
  await expect(panel.locator('[data-rv-id="ar"] .rv-select-label')).toHaveAttribute('dir', 'rtl');
  await expect(panel.locator('[data-rv-id="en"] .rv-select-label')).toHaveAttribute('dir', 'ltr');
});

test('a managed pick switches the document, and the row ids are hints', async ({ page }) => {
  await page.goto('/select');
  const panel = await open(page, 'managed-select');

  await panel.locator('[rvselectpopupitem][data-rv-id="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByTestId('select-state')).toHaveText('en · ltr');
  await expect(picker(page, 'managed-select').locator('.rv-select-value')).toHaveText('English');

  const panelAfter = await open(page, 'managed-select');
  await panelAfter.locator('[rvselectpopupitem][data-rv-id="ar"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', /^ar/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('select-state')).toHaveText('ar · rtl');
});

test('search filters rows and a presentational pick leaves the manager alone', async ({ page }) => {
  await page.goto('/select');
  const panel = await open(page, 'presentational-select');

  // `Français` carries no `dir`, so the row falls back to `dir="auto"`.
  await expect(panel.locator('[data-rv-id="fr"] .rv-select-label')).toHaveAttribute('dir', 'auto');

  await panel.locator('.rv-select-search').fill('fra');
  await expect(panel.locator('[rvselectpopupitem]')).toHaveCount(1);

  await panel.locator('[rvselectpopupitem][data-rv-id="fr"]').click();
  await expect(page.getByTestId('presentational-state')).toHaveText('fr · fr');
  await expect(picker(page, 'presentational-select').locator('.rv-select-value')).toHaveText(
    'Français',
  );

  // The manager is untouched: the document is still Arabic.
  await expect(page.locator('html')).toHaveAttribute('lang', /^ar/);
  await expect(page.getByTestId('select-state')).toHaveText('ar · rtl');
});

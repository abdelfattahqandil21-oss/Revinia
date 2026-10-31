import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * S2 (D85): the select's accessible structure, measured in a real browser.
 *
 * axe proves the rules; the explicit assertions pin the structure the rules
 * depend on, so a "pass" cannot come from an element silently dropping out of
 * the accessibility tree.
 */

test.describe('select: axe', () => {
  test('closed trigger', async ({ page }) => {
    await page.goto('/select');
    const results = await new AxeBuilder({ page }).include('#single-select').analyze();
    expect(results.violations).toEqual([]);
  });

  test('single, searchable, open', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    await expect(page.locator('#single-select .rv-select-popup-menu')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#single-select').analyze();
    expect(results.violations).toEqual([]);
  });

  test('multi, open', async ({ page }) => {
    await page.goto('/select');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.locator('#multi-select .rv-select-trigger').click();
    await expect(page.locator('#multi-select .rv-select-popup-menu')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#multi-select').analyze();
    expect(results.violations).toEqual([]);
  });

  test('RTL, open', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#rtl-select .rv-select-trigger').click();
    await expect(page.locator('#rtl-select .rv-select-popup-menu')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#rtl-select').analyze();
    expect(results.violations).toEqual([]);
  });

  test('custom list template, open', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#virtual-select .rv-select-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(page.locator('#virtual-select .rv-select-popup-menu')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#virtual-select').analyze();
    expect(results.violations).toEqual([]);
  });

  test('empty state', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    await page.locator('#single-select .rv-select-search').fill('zzz');
    await expect(page.locator('#single-select .rv-select-empty')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#single-select').analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('select: structure', () => {
  test('the menu owns rows only; the filter box and status rows sit beside it', async ({
    page,
  }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await trigger.click();
    const menu = page.locator('#single-select .rv-select-popup-menu');
    await expect(menu).toHaveAttribute('role', 'menu');

    // One menu, and it is the element the trigger controls.
    await expect(menu).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-controls', await menu.getAttribute('id'));
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    // Inside the menu: only menu-item roles (a bare container div is
    // transparent to AT); never an input.
    const innerRoles = await menu.evaluate((element) =>
      [...element.querySelectorAll('[role], input, textarea, select')].map(
        (child) => child.getAttribute('role') ?? child.tagName.toLowerCase(),
      ),
    );
    const allowed = new Set([
      'menuitem',
      'menuitemradio',
      'menuitemcheckbox',
      'group',
      'separator',
    ]);
    expect(innerRoles.filter((role) => !allowed.has(role))).toEqual([]);
    expect(innerRoles).toContain('menuitemradio');

    const search = page.locator('#single-select .rv-select-search');
    await expect(search).toHaveAttribute('role', 'searchbox');
    expect(await search.evaluate((el) => el.closest('[role="menu"]') === null)).toBe(true);
  });

  test('single rows are menuitemradio and the checked state follows the pick', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    const rows = page.locator('#single-select .rv-select-popup-menu [role="menuitemradio"]');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'false');

    // Keyboard pick: a mouse click detaches this row as the single panel
    // closes under the pointer, which Playwright reports as an unstable target.
    await page.keyboard.press('Enter');
    await expect(page.locator('#single-select .rv-select-panel')).toBeHidden();
    await page.locator('#single-select .rv-select-trigger').click();
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(rows.nth(2)).toHaveAttribute('aria-checked', 'false');
  });

  test('multi rows are menuitemcheckbox with a per-row checked state', async ({ page }) => {
    await page.goto('/select');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.locator('#multi-select .rv-select-trigger').click();
    const rows = page.locator('#multi-select .rv-select-popup-menu [role="menuitemcheckbox"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'false');
    await rows.nth(0).click();
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(rows.nth(1)).toHaveAttribute('aria-checked', 'false');
  });

  test('a disabled row is announced disabled and never checked', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    const disabled = page.locator('#single-select .rv-select-popup-menu [aria-disabled="true"]');
    await expect(disabled).toHaveCount(1);
    await expect(disabled).toHaveAttribute('aria-checked', 'false');
  });

  test('the trigger name carries the visible value (WCAG 2.5.3)', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await expect(trigger).toHaveAccessibleName(/Invoice status/);

    await trigger.click();
    // The panel opens with its search box focused; wait for the filter to
    // settle before Enter, which picks the single remaining row.
    await page.locator('#single-select .rv-select-search').fill('outstanding');
    await expect(
      page.locator('#single-select .rv-select-popup-menu [role="menuitemradio"]'),
    ).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(page.locator('#single-select .rv-select-panel')).toBeHidden();
    await expect(trigger).toHaveAccessibleName(/Invoice status.*Outstanding invoices/);
  });

  test('RTL keeps the same roles and reading order', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#rtl-select .rv-select-trigger').click();
    const menu = page.locator('#rtl-select .rv-select-popup-menu');
    await expect(menu).toHaveAttribute('role', 'menu');
    const labels = await menu
      .locator('[role="menuitemradio"]')
      .evaluateAll((rows) => rows.map((row) => row.textContent?.trim()));
    expect(labels).toEqual(['Owner', 'Admin', 'Member']);
  });

  test('keyboard: arrows, Home/End, Enter and Escape', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#multi-select .rv-select-trigger');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const rows = page.locator('#multi-select .rv-select-popup-menu [role="menuitemcheckbox"]');
    await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(rows.nth(0)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#multi-select .rv-select-panel')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

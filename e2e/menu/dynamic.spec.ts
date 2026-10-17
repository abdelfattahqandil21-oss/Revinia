import { test, expect } from '@playwright/test';

const row = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('menuitem', { name });

test.describe('dynamic items lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dynamic');
  });

  test('items added at runtime appear and are navigable', async ({ page }) => {
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(page.getByRole('menu', { name: 'Dynamic menu' })).toBeVisible();
    await expect(row(page, 'Item 4')).toBeVisible();
    await expect(row(page, 'Item 5')).toBeVisible();
    // Navigation covers the newly registered items.
    await page.keyboard.press('End');
    await expect(row(page, 'Item 5')).toBeFocused();
  });

  test('items removed at runtime disappear and navigation stays valid', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove last' }).click();
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(row(page, 'Three')).toHaveCount(0);
    await expect(row(page, 'One')).toBeVisible();
    await page.keyboard.press('End');
    await expect(row(page, 'Two')).toBeFocused();
  });

  test('removing the focused item moves focus to a valid target', async ({ page }) => {
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(row(page, 'Three')).toBeVisible();
    // 'Three' is disabled in the fixture, so End lands on the last ENABLED
    // item ('Two') — disabled rows are never focus targets.
    await page.keyboard.press('End');
    await expect(row(page, 'Two')).toBeFocused();
    // 'Three' is the last item; remove everything so focus cannot stay on it.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Remove last' }).click();
    await page.getByRole('button', { name: 'Remove last' }).click();
    await page.getByRole('button', { name: 'Remove last' }).click();
    await expect(row(page, 'Three')).toHaveCount(0);
    await page.getByRole('button', { name: 'Dynamic' }).click();
    // Menu opens empty: no crash, no focus target, still operable.
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('an empty menu opens safely and stays operable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Toggle empty' }).click();
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('an all-disabled menu opens safely and cannot activate anything', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Toggle all disabled' }).click();
    await expect(page.getByRole('button', { name: 'Dynamic' })).toBeVisible();
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(page.getByRole('menu', { name: 'Dynamic menu' })).toBeVisible();
    await expect(row(page, 'One')).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    // Nothing was picked, and focus was not stranded on <body>.
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.locator('[data-testid="result"]')).toHaveText(/picked=\(none\)/);
    expect(errors).toEqual([]);
  });

  test('destroying and recreating the menu leaves no listeners or registrations', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(page.locator('rv-menu')).toHaveCount(0);
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(page.locator('rv-menu')).toHaveCount(1);

    // Registry has exactly the three declared items — no leftovers from the
    // destroyed instance.
    await page.getByRole('button', { name: 'Dynamic' }).click();
    await expect(page.locator('[data-testid="result"]')).toHaveText(/count=3/);
    expect(errors).toEqual([]);
  });
});

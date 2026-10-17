import { test, expect, beforeEach } from '@playwright/test';

/**
 * Public-API tests: the two documented usage levels, driven through a real
 * Angular consumer component in a production build.
 */
test.describe('public API — data-driven [items]', () => {
  beforeEach(async ({ page }) => {
    await page.goto('/api');
  });

  test('renders items, opens on click and focuses the first enabled row', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Data' });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Data actions' });
    await expect(menu).toBeVisible();
    // Fixture rows: Profile, Billing (both enabled), Archived (disabled).
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
    await expect(page.getByRole('menuitem', { name: 'Billing' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    await expect(page.getByRole('menuitem', { name: 'Archived' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('keyboard navigation skips disabled rows and Enter emits the id', async ({ page }) => {
    await page.getByRole('button', { name: 'Data' }).click();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Billing' })).toBeFocused();
    // 'Archived' is disabled, so ArrowDown wraps to the first enabled row.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="api-result"]')).toHaveText('picked=data=profile');
  });

  test('typeahead works over declarative rows', async ({ page }) => {
    await page.getByRole('button', { name: 'Data' }).click();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
    await page.keyboard.press('b');
    await expect(page.getByRole('menuitem', { name: 'Billing' })).toBeFocused();
  });

  test('panelClass and itemClass reach the intended elements', async ({ page }) => {
    await page.getByRole('button', { name: 'Data' }).click();
    const menu = page.getByRole('menu', { name: 'Data actions' });
    await expect(menu).toHaveClass(/brand-panel/);
    // The CSS custom property set on the wrapper reaches the panel and wins.
    const radius = await menu.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe('2px');
    const border = await menu.evaluate((el) => getComputedStyle(el).borderColor);
    expect(border).toBe('rgb(220, 38, 38)');
    // itemClass lands on the generated rows.
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toHaveClass(/brand-row/);
  });
});

test.describe('public API — composable markup', () => {
  beforeEach(async ({ page }) => {
    await page.goto('/api');
  });

  test('camelCase rvMenuTrigger/rvMenuPanel project correctly', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /Account/ }).last();
    const menu = page.getByRole('menu', { name: 'Custom actions' });
    await expect(menu).toBeHidden();
    await trigger.click();
    await expect(menu).toBeVisible();
    // The projected header renders but is skipped by keyboard navigation.
    await expect(page.locator('.account-header')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
  });

  test('static disabled attribute is honoured (native property collision)', async ({ page }) => {
    await page
      .getByRole('button', { name: /Account/ })
      .last()
      .click();
    const signout = page.getByRole('menuitem', { name: 'Sign out' });
    await expect(signout).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('End');
    // End lands on the last ENABLED row ('Profile'), never the disabled one.
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
  });

  test('selection emits only this menu and both levels stay independent', async ({ page }) => {
    await page
      .getByRole('button', { name: /Account/ })
      .last()
      .click();
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="api-result"]')).toHaveText('picked=custom=profile');
    // The data-driven menu is untouched and still closed.
    await expect(page.getByRole('button', { name: 'Data' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.getByRole('menu', { name: 'Data actions' })).toHaveCount(0);
  });

  test('both levels coexist on one page without sharing state', async ({ page }) => {
    await page.getByRole('button', { name: 'Data' }).click();
    await expect(page.getByRole('menu', { name: 'Data actions' })).toBeVisible();
    await expect(page.getByRole('menu', { name: 'Custom actions' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: /Account/ })
      .last()
      .click();
    await expect(page.getByRole('menu', { name: 'Custom actions' })).toBeVisible();
    await expect(page.getByRole('menu', { name: 'Data actions' })).toHaveCount(0);
  });
});

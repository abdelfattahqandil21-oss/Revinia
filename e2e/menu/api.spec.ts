import { test, expect, beforeEach } from '@playwright/test';
import { openMenu } from './support';

/**
 * Public-API tests: the two documented usage levels, driven through a real
 * Angular consumer component in a production build.
 */
test.describe('public API — data-driven [items]', () => {
  beforeEach(async ({ page }) => {
    await page.goto('/api');
  });

  test('renders items, opens on click and enters the rows with ArrowDown', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Data' });
    await openMenu(page, trigger);
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
    await openMenu(page, page.getByRole('button', { name: 'Data' }));
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
    await openMenu(page, page.getByRole('button', { name: 'Data' }));
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

    // Pointer open (no row active yet): the panel is projected and the icon
    // takes the library's muted tone. Computed styles, not a bounding box —
    // the open animation scales the box for 160ms.
    await trigger.click();
    await expect(menu).toBeVisible();
    // The projected header renders but is skipped by keyboard navigation.
    await expect(page.locator('.account-header')).toBeVisible();
    const row = page.getByRole('menuitem', { name: 'Profile' });
    const icon = row.locator('svg');
    expect(await icon.evaluate((el) => getComputedStyle(el).width)).toBe('16px');
    expect(await icon.evaluate((el) => getComputedStyle(el).height)).toBe('16px');
    expect(await icon.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(85, 85, 85)');
    // The consumer owns the stroke/fill that makes the icon visible.
    await expect(icon).toHaveAttribute('fill', 'none');
    await expect(icon).toHaveAttribute('stroke', 'currentColor');

    // Keyboard entry focuses Profile, and the active row overrides the tone
    // with `color: inherit` so the icon never looks disabled.
    await page.keyboard.press('ArrowDown');
    await expect(row).toBeFocused();
    const colors = await row.evaluate((el) => {
      const svg = el.querySelector('svg') as SVGElement;
      return { row: getComputedStyle(el).color, icon: getComputedStyle(svg).color };
    });
    expect(colors.icon).toBe(colors.row);
  });

  test('static disabled attribute is honoured (native property collision)', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: /Account/ }).last());
    const signout = page.getByRole('menuitem', { name: 'Sign out' });
    await expect(signout).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('End');
    // End lands on the last ENABLED row ('Profile'), never the disabled one.
    await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
  });

  test('selection emits only this menu and both levels stay independent', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: /Account/ }).last());
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

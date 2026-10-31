import { test, expect } from '@playwright/test';
import { openMenu } from './support';

test.describe('two independent menus', () => {
  test('panel ids are unique per instance', async ({ page }) => {
    await page.goto('/two');
    await page.getByRole('button', { name: 'First' }).click();
    const firstId = await page.getByRole('menu', { name: 'First menu' }).getAttribute('id');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Second' }).click();
    const secondId = await page.getByRole('menu', { name: 'Second menu' }).getAttribute('id');

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);

    // Each trigger references its own panel.
    await expect(page.getByRole('button', { name: 'Second' })).toHaveAttribute(
      'aria-controls',
      secondId!,
    );
  });

  test('opening one menu does not disturb the other', async ({ page }) => {
    await page.goto('/two');
    await openMenu(page, page.getByRole('button', { name: 'First' }));
    await expect(page.getByRole('menu', { name: 'First menu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Second' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // First menu focuses ITS first item, not the second menu's.
    await expect(page.getByRole('menuitem', { name: 'Alpha one' })).toBeFocused();
  });

  test('picking in one menu emits only on that menu', async ({ page }) => {
    await page.goto('/two');
    await openMenu(page, page.getByRole('button', { name: 'Second' }));
    await expect(page.getByRole('menuitem', { name: 'Beta one' })).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=second=b2');
    await expect(page.getByRole('menu', { name: 'First menu' })).toHaveCount(0);

    await openMenu(page, page.getByRole('button', { name: 'First' }));
    await expect(page.getByRole('menuitem', { name: 'Alpha one' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Alpha two' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=first=a2');
  });

  test('state is isolated: activating one does not change the other controller', async ({
    page,
  }) => {
    await page.goto('/two');
    await openMenu(page, page.getByRole('button', { name: 'First' }));
    await expect(page.getByRole('menuitem', { name: 'Alpha one' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=first=a2');
    // The first menu's own trigger reflects it closed; the second is untouched.
    await expect(page.getByRole('button', { name: 'First' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Second' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

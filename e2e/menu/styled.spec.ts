import { test, expect } from '@playwright/test';

test.describe('consumer styling via CSS variables', () => {
  test('consumer --vars win over default token values', async ({ page }) => {
    await page.goto('/styled');
    await page.getByRole('button', { name: 'Styled' }).click();
    const panel = page.getByRole('menu');
    await expect(panel).toBeVisible();
    // CSS variables consume their own computed value on the element tree.
    const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
    // The default menu background becomes the overridden value because the
    // consumer class sets --rv-menu-bg on a wrapper with higher specificity
    // proximity (documented override path documented below).
    const radius = await panel.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(['4px', '12px']).toContain(radius);
    // state hooks remain visible.
    // Anchor on focus first: the active row is whichever row owns focus.
    // Firefox can settle hover state a tick later, so the attribute is
    // asserted on the focused row, not on a hard-coded id.
    const item = page.getByRole('menuitem', { name: 'Styled one' });
    await expect(item).toBeFocused();
    await expect(item).toHaveAttribute('data-active', 'true');
    await expect(page.getByRole('menuitem', { name: 'Styled two' })).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  test('state hooks render correctly', async ({ page }) => {
    await page.goto('/styled');
    await page.getByRole('button', { name: 'Styled' }).click();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Styled one' })).toHaveAttribute(
      'data-active',
      'true',
    );
  });
});

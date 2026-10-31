import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openMenu } from './support';

test.describe('basic action menu (axe + RTL)', () => {
  test('no axe violations while the menu is open', async ({ page }) => {
    await page.goto('/basic');
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="menu"]').analyze();
    expect(results.violations).toEqual([]);
  });

  test('no axe violations on the closed trigger', async ({ page }) => {
    await page.goto('/basic');
    const results = await new AxeBuilder({ page }).include('rv-menu').analyze();
    expect(results.violations).toEqual([]);
  });

  test('RTL: logical placement mirrors and keyboard order is unchanged', async ({ page }) => {
    await page.goto('/rtl');
    const trigger = page.getByRole('button', { name: 'الإجراءات' });
    const panel = page.getByRole('menu', { name: 'قائمة الإجراءات' });

    await openMenu(page, trigger);
    await expect(panel).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'الأول' })).toBeFocused();
    await expect(panel).toHaveAttribute('data-placement', 'bottom-end');

    // Entering the rows focuses the first item in DOM order (keyboard order
    // does not mirror in RTL).
    await expect(page.getByRole('menuitem', { name: 'الأول' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'الثاني' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'الثالث' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('menuitem', { name: 'الأول' })).toBeFocused();

    // 'bottom-end' in RTL must align the panel's right edge to the trigger's
    // right edge (not the left).
    const triggerBox = (await trigger.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    expect(Math.abs(panelBox.x + panelBox.width - (triggerBox.x + triggerBox.width))).toBeLessThan(
      2,
    );
  });

  test('RTL: typeahead matches non-Latin labels', async ({ page }) => {
    await page.goto('/rtl');
    await openMenu(page, page.getByRole('button', { name: 'الإجراءات' }));
    await expect(page.getByRole('menuitem', { name: 'الأول' })).toBeFocused();
    await page.keyboard.type('ا');
    await expect(page.getByRole('menuitem', { name: 'الأول' })).toBeFocused();
  });
});

import { test, expect } from '@playwright/test';
import { openMenu } from './support';

test.describe('consumer styling via CSS variables', () => {
  test('consumer --vars on an ancestor win over the library fallbacks', async ({ page }) => {
    await page.goto('/styled');
    await page.getByRole('button', { name: 'Styled' }).click();
    const panel = page.getByRole('menu');
    await expect(panel).toBeVisible();

    // The fixture sets these on a WRAPPER (.peach). They must inherit down
    // to the panel, which only works because the library declares its
    // defaults as var(--token, fallback) values rather than on the panel.
    const styles = await panel.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor,
        fg: cs.color,
        radius: cs.borderRadius,
      };
    });
    expect(styles.bg).toBe('rgb(255, 237, 213)'); // #ffedd5
    expect(styles.fg).toBe('rgb(124, 45, 18)'); // #7c2d12
    expect(styles.radius).toBe('4px');
  });

  test('state hooks follow keyboard focus', async ({ page }) => {
    await page.goto('/styled');
    await openMenu(page, page.getByRole('button', { name: 'Styled' }));

    // The first ArrowDown focuses the first enabled item, which is the active one.
    const one = page.getByRole('menuitem', { name: 'Styled one' });
    const two = page.getByRole('menuitem', { name: 'Styled two' });
    await expect(one).toBeFocused();
    await expect(one).toHaveAttribute('data-active', 'true');
    await expect(one).toHaveAttribute('tabindex', '0');
    await expect(two).toHaveAttribute('data-active', 'false');
    await expect(two).toHaveAttribute('tabindex', '-1');

    // ArrowDown moves the active item (and focus) to the next one.
    await page.keyboard.press('ArrowDown');
    await expect(two).toBeFocused();
    await expect(two).toHaveAttribute('data-active', 'true');
    await expect(one).toHaveAttribute('data-active', 'false');
  });

  test('a consumer outline on the active hook is applied', async ({ page }) => {
    await page.goto('/styled');
    await openMenu(page, page.getByRole('button', { name: 'Styled' }));
    const one = page.getByRole('menuitem', { name: 'Styled one' });
    await expect(one).toBeFocused();
    // The fixture styles `.peach [rvmenuitem][data-active='true']`.
    const outline = await one.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('dashed');
  });
});

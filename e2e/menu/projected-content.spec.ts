import { test, expect, type Page } from '@playwright/test';

/**
 * Projected content contract (docs/SPEC-menu-projected-content.md).
 * jsdom cannot answer any of these: real Tab stepping, real focus after a
 * pick, live popover anchoring, and `aria-controls` resolution.
 */

const trigger = (page: Page) => page.getByRole('button', { name: /^Language:/ });
const filter = (page: Page) => page.getByRole('textbox', { name: 'Filter languages' });

/** Pointer open, then step into the filter the way a user would. */
async function openAndFocusFilter(page: Page): Promise<void> {
  await page.goto('/content');
  await trigger(page).click();
  const field = filter(page);
  await field.click();
  await expect(field).toBeFocused();
}

test.describe('projected content — Tab owns the way out', () => {
  test('Tab from a projected input closes and lands after the menu', async ({ page }) => {
    await openAndFocusFilter(page);
    await expect(page.getByRole('menu')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toBeHidden();
    // The next stop after the menu, not the trigger, not <body>.
    await expect(page.getByRole('button', { name: 'After menu' })).toBeFocused();
    await expect(trigger(page)).not.toBeFocused();
  });

  test('Shift+Tab from a projected input lands before the menu', async ({ page }) => {
    await openAndFocusFilter(page);
    await expect(page.getByRole('menu')).toBeVisible();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Before menu' })).toBeFocused();
  });
});

test.describe('projected content — typing and keys stay in the field', () => {
  test('typing filters rows without highlighting or focusing one', async ({ page }) => {
    await openAndFocusFilter(page);
    const field = filter(page);
    await field.pressSequentially('de');

    await expect(field).toBeFocused();
    await expect(field).toHaveValue('de');
    // The page filtered the rows; the menu highlighted none.
    await expect(page.getByRole('menuitemradio')).toHaveCount(1);
    await expect(page.getByRole('menuitemradio', { name: 'Deutsch' })).toHaveAttribute(
      'data-active',
      'false',
    );
    await expect(page.locator('[rvmenuitem][data-active="true"]')).toHaveCount(0);
  });

  test('Enter and arrows in the field leave the menu and the pick untouched', async ({ page }) => {
    await openAndFocusFilter(page);
    const field = filter(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');

    await expect(field).toBeFocused();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.locator('[rvmenuitem][data-active="true"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=(none)');
  });
});

test.describe('projected content — Escape', () => {
  test('Escape from the filter closes and returns focus to the trigger', async ({ page }) => {
    await openAndFocusFilter(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test('a control that claims Escape keeps the menu open', async ({ page }) => {
    await openAndFocusFilter(page);
    const shortcuts = page.getByRole('button', { name: 'Keyboard shortcuts' });
    await shortcuts.click();
    await expect(shortcuts).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(shortcuts).toBeFocused();
  });
});

test.describe('projected content — pick, roles and anchoring', () => {
  test('a keyboard pick returns focus to the trigger and applies the language', async ({
    page,
  }) => {
    await page.goto('/content');
    await trigger(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    // A pointer open leaves focus on the trigger; the first ArrowDown activates
    // and focuses the first row, so the next key must wait for that step.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: 'English' })).toBeFocused();
    await page.keyboard.press('ArrowDown');

    const german = page.getByRole('menuitemradio', { name: 'Deutsch' });
    await expect(german).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Arabic flips the document direction, still from projected rows.
    await trigger(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: 'English' })).toBeFocused();
    await page.keyboard.press('End');
    const arabic = page.getByRole('menuitemradio', { name: 'العربية' });
    await expect(arabic).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('rows expose menuitemradio with exactly one checked', async ({ page }) => {
    await page.goto('/content');
    await trigger(page).click();
    const rows = page.getByRole('menuitemradio');
    await expect(rows).toHaveCount(3);
    await expect(page.locator('[rvmenuitem][aria-checked="true"]')).toHaveCount(1);
    await expect(page.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // The consumer's group wrapper is not a row.
    await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();
  });

  test('the panel stays anchored to the trigger and advertises itself', async ({ page }) => {
    await page.goto('/content');
    const triggerBox = (await trigger(page).boundingBox())!;
    expect(await trigger(page).getAttribute('aria-controls')).toBeNull();

    await trigger(page).click();
    const panel = page.getByRole('menu');
    await expect(panel).toBeVisible();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
    const id = await panel.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(trigger(page)).toHaveAttribute('aria-controls', id!);
    await expect(page.locator(`#${id}`)).toHaveAttribute('role', 'menu');

    const panelBox = (await panel.boundingBox())!;
    expect(Math.abs(panelBox.x - triggerBox.x)).toBeLessThan(2);
    const gap = panelBox.y - (triggerBox.y + triggerBox.height);
    expect(gap).toBeGreaterThanOrEqual(-1);
    expect(gap).toBeLessThan(16);

    await page.keyboard.press('Escape');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => trigger(page).getAttribute('aria-controls')).toBeNull();
  });
});

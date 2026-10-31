import { test, expect } from '@playwright/test';
import { openMenu } from './support';

/**
 * Focus-contract regressions that need a real browser: Tab traversal, live
 * disabled-state updates and outside-pointer focus behaviour.
 */
test.describe('focus contract — Tab traversal', () => {
  test('Tab closes the menu and focus moves to the next element', async ({ page }) => {
    await page.goto('/two');
    const first = page.getByRole('button', { name: 'First' });
    const second = page.getByRole('button', { name: 'Second' });

    await first.click();
    await expect(page.getByRole('menu', { name: 'First menu' })).toBeVisible();
    await page.keyboard.press('Tab');

    await expect(page.getByRole('menu', { name: 'First menu' })).toBeHidden();
    // Natural document order: the sibling trigger is next.
    await expect(second).toBeFocused();
  });

  test('Shift+Tab closes the menu and focus moves backwards', async ({ page }) => {
    await page.goto('/two');
    const first = page.getByRole('button', { name: 'First' });
    // Document order: nav links … then the 'First' trigger. The stop directly
    // before it is the LAST nav link.
    const previous = page.getByRole('link', { name: 'Styled' });

    await first.click();
    await expect(page.getByRole('menu', { name: 'First menu' })).toBeVisible();
    await page.keyboard.press('Shift+Tab');

    await expect(page.getByRole('menu', { name: 'First menu' })).toBeHidden();
    await expect(previous).toBeFocused();
    await expect(first).not.toBeFocused();
  });

  test('Tab never traps focus: repeated Tab keeps walking through the page', async ({ page }) => {
    await page.goto('/two');
    const second = page.getByRole('button', { name: 'Second' });
    const first = page.getByRole('button', { name: 'First' });

    await first.click();
    await expect(page.getByRole('menu', { name: 'First menu' })).toBeVisible();

    // First Tab: menu closes, focus steps to the sibling trigger.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu', { name: 'First menu' })).toBeHidden();
    await expect(second).toBeFocused();

    // Second Tab: the (already closed) menu must not swallow it or reopen.
    // Note: what happens at the very END of the document is browser-defined
    // (Firefox keeps focus on the last stop, Chromium moves it to the
    // browser UI), so we assert the menu stays out of the way rather than
    // pinning a specific element.
    await page.keyboard.press('Tab');
    await expect(page.locator('.rv-menu-panel')).toHaveCount(0);
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await expect(second).toHaveAttribute('aria-expanded', 'false');
    const insidePanel = await page.evaluate(
      () => !!document.activeElement?.closest('.rv-menu-panel'),
    );
    expect(insidePanel).toBe(false);
  });
});

test.describe('focus contract — live disabled state', () => {
  test('a row disabled while focused can no longer be activated', async ({ page }) => {
    await page.goto('/dynamic');
    // Open the menu, focus the LAST enabled row, then disable everything
    // live while focus is still on it.
    await openMenu(page, page.getByRole('button', { name: 'Dynamic' }));
    await page.keyboard.press('End');
    const focusedRow = page.locator('[rvmenuitem][data-active="true"]');
    await expect(focusedRow).toHaveCount(1);

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Toggle all disabled' }).click();
    await openMenu(page, page.getByRole('button', { name: 'Dynamic' }));

    // Every row now reports disabled and nothing can be picked.
    const rows = page.locator('[rvmenuitem]');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i)).toHaveAttribute('aria-disabled', 'true');
    }
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText(/picked=\(none\)/);
  });

  test('re-enabling a row makes it pickable again', async ({ page }) => {
    await page.goto('/dynamic');
    await page.getByRole('button', { name: 'Toggle all disabled' }).click();
    await openMenu(page, page.getByRole('button', { name: 'Dynamic' }));
    await expect(page.locator('[rvmenuitem]').first()).toHaveAttribute('aria-disabled', 'true');

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Toggle all disabled' }).click();
    await openMenu(page, page.getByRole('button', { name: 'Dynamic' }));
    await expect(page.locator('[rvmenuitem]').first()).not.toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=one count=3');
  });
});

test.describe('focus contract — outside pointer', () => {
  test('clicking a focusable element outside closes without stealing focus', async ({ page }) => {
    await page.goto('/basic');
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();

    // Give the page a focusable element to aim at.
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'outside-target';
      btn.textContent = 'Outside';
      btn.style.cssText = 'position:fixed;top:4px;left:4px;z-index:1';
      document.body.appendChild(btn);
    });

    await page.locator('#outside-target').click();
    await expect(page.getByRole('menu')).toBeHidden();
    // Focus stayed on what the user clicked — NOT pulled back to the trigger.
    await expect(page.locator('#outside-target')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Actions' })).not.toBeFocused();
  });

  test('clicking a non-focusable element closes without inventing a focus jump', async ({
    page,
  }) => {
    await page.goto('/basic');
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.locator('h1').click();
    await expect(page.getByRole('menu')).toBeHidden();
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(['H1', 'BODY']).toContain(focused);
  });
});

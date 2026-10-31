import { test, expect, devices } from '@playwright/test';
import { openMenu } from './support';

// The documented contract: a keyboard open focuses the FIRST enabled item
// (last item with ArrowUp); a pointer open leaves focus on the trigger and
// highlights nothing until the user hovers a row or presses an arrow key.
test.use({ viewport: devices['Desktop Chrome'].viewport });

test.describe('basic action menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basic');
  });

  test('pointer open leaves no row active and exposes ARIA wiring', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    const panel = page.getByRole('menu', { name: 'Actions menu' });

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();

    await expect(panel).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    // A click is a glance, not a keyboard entry: nothing looks chosen and
    // focus stays where the user clicked (APG menu button).
    await expect(page.locator('[rvmenuitem][data-active="true"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // The first ArrowDown enters the rows, as it does for keyboard users.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute(
      'data-active',
      'false',
    );
    // Roving tabindex: only the active row is tabbable.
    await expect(page.getByRole('menuitem', { name: /New file/i })).toHaveAttribute(
      'tabindex',
      '0',
    );
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  test('arrow navigation skips disabled items and wraps', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: 'Actions' }));
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
    // 'Archived' is disabled and must be skipped.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    // Wrap to the first item.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('Home and End reach the first and last enabled items', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: 'Actions' }));
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
  });

  test('Escape closes and returns focus to the trigger', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter and Space open the menu from the trigger', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('Escape');

    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
  });

  test('ArrowUp on the trigger opens with the last item focused', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    await trigger.focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('Enter and Space activate the focused item', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: 'Actions' }));
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=delete');
    await expect(page.getByRole('menu')).toBeHidden();
  });

  test('disabled items cannot be activated and are skipped', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    const archived = page.getByRole('menuitem', { name: 'Archived' });
    await expect(archived).toHaveAttribute('aria-disabled', 'true');
    // Force the click past Playwright's actionability check on the disabled row.
    await archived.dispatchEvent('click');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=(none)');
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('typeahead finds items by accessible text', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    await openMenu(page, trigger);
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
    // Buffer grows to 'du' — still a single match, focus stays.
    await page.keyboard.press('u');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
    // 'due' matches nothing, so focus is left where it was (no reset, no jump).
    await page.keyboard.press('e');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();

    // A fresh open starts an empty buffer: 'dele' resolves to Delete.
    await page.keyboard.press('Escape');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('d');
    await page.keyboard.press('e');
    await page.keyboard.press('l');
    await page.keyboard.press('e');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('repeated-character typeahead cycles between matches', async ({ page }) => {
    await openMenu(page, page.getByRole('button', { name: 'Actions' }));
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
    // Pressing 'd' again cycles to the next match instead of growing the buffer.
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
  });

  test('aria-controls only exists while the panel does', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    // Closed: the id it would reference does not exist, so it is not advertised.
    expect(await trigger.getAttribute('aria-controls')).toBeNull();
    await trigger.click();
    const panel = page.getByRole('menu');
    const id = await panel.getAttribute('id');
    expect(id).toBeTruthy();
    await expect(trigger).toHaveAttribute('aria-controls', id!);
    // The referenced id really is the panel.
    await expect(page.locator(`#${id}`)).toHaveAttribute('role', 'menu');
    await page.keyboard.press('Escape');
    // Angular flushes the ARIA effect after the click handler returns.
    await expect.poll(() => trigger.getAttribute('aria-controls')).toBeNull();
  });

  test('Tab closes the menu and focus continues naturally', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toBeHidden();
    // Focus left the menu entirely (not trapped, not stranded on the removed
    // panel element).
    const stillInsidePanel = await page.evaluate(
      () => !!document.activeElement?.closest('.rv-menu-panel'),
    );
    expect(stillInsidePanel).toBe(false);
  });

  test('outside click closes the menu without stealing focus', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    // Click a non-focusable element: focus is NOT pulled back to the trigger.
    await page.locator('h1').click();
    await expect(page.getByRole('menu')).toBeHidden();
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['H1', 'BODY']).toContain(focusedTag);
  });

  test('pointer hover moves the active item', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    const duplicate = page.getByRole('menuitem', { name: 'Duplicate' });
    await duplicate.hover();
    await expect(duplicate).toHaveAttribute('data-active', 'true');
  });

  test('reopening after each close reason works', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Actions' });
    // close reason 1: Escape
    await trigger.click();
    await page.keyboard.press('Escape');
    // close reason 2: selection
    await openMenu(page, trigger);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="result"]')).toHaveText('picked=delete');
    // close reason 3: outside pointer
    await trigger.click();
    await page.locator('h1').click();
    // close reason 4: toggle (click the trigger while open)
    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await trigger.click();
    await expect(page.getByRole('menu')).toBeHidden();
    // And it opens again cleanly after all four.
    await openMenu(page, trigger);
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
  });
});

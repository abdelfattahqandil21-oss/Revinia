import type { Locator, Page } from '@playwright/test';

/**
 * Open a menu with the pointer and step into its row list.
 *
 * A pointer open deliberately leaves focus on the trigger and highlights no
 * row (APG menu button), so a test that navigates rows has to take the same
 * ArrowDown step a keyboard user takes. Keeping the click in the sequence
 * means the panel still opens through the path consumers use with a mouse.
 */
export async function openMenu(page: Page, trigger: Locator): Promise<void> {
  await trigger.click();
  await page.locator('.rv-menu-panel').first().waitFor({ state: 'visible' });
  await page.keyboard.press('ArrowDown');
}

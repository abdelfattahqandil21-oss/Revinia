import { expect, test, type Page } from '@playwright/test';

/**
 * SPEC-0.6-ui.md §11.2 in a real browser, on chromium and firefox (the config
 * defines no WebKit — D39). Every test also enforces "zero console errors":
 * the listeners attach before the app boots, so a hydration mismatch or a
 * broken render fails the test that caused it instead of a separate smoke test
 * that might pass for the wrong reason.
 */
const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
});

test.afterEach(() => {
  expect(consoleErrors, 'console.error output').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});

function toggle(page: Page, testId: string) {
  return page.getByTestId(testId).locator('button');
}

/**
 * `padding-inline-start` must resolve on the side the button's own `direction`
 * says is the start side. The proof page makes that padding asymmetric
 * (2.5rem start / 0.5rem end), so a browser that resolved the wrong side would
 * measure the other gap instead. The border is subtracted because it sits
 * between the button's box edge and its padding; neither `left` nor `right` is
 * hard-coded here.
 */
async function expectInlineStartPadding(page: Page, testId: string): Promise<void> {
  const measured = await toggle(page, testId).evaluate((button) => {
    const name = button.querySelector('.rv-language-toggle__name');
    if (name === null) {
      throw new Error('the button renders no visible name element');
    }
    const box = button.getBoundingClientRect();
    const text = name.getBoundingClientRect();
    const style = getComputedStyle(button);
    const border = button.clientLeft;
    return {
      direction: style.direction,
      paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
      paddingInlineEnd: Number.parseFloat(style.paddingInlineEnd),
      gapStart:
        style.direction === 'rtl'
          ? box.right - text.right - border
          : text.left - box.left - border,
    };
  });

  expect(['ltr', 'rtl']).toContain(measured.direction);
  // Without an asymmetry the two paddings are the same length and "the start
  // side" could not be told apart, so the measurement below would be vacuous.
  expect(
    measured.paddingInlineStart,
    'the page must give the button an asymmetric inline padding',
  ).not.toBe(measured.paddingInlineEnd);
  expect(
    Math.abs(measured.gapStart - measured.paddingInlineStart),
    `start-side gap ${measured.gapStart} vs padding-inline-start ${measured.paddingInlineStart} (direction ${measured.direction})`,
  ).toBeLessThan(1);
}

test.describe('keyboard', () => {
  test('Tab reaches the button, Enter switches, and focus stays on it', async ({ page }) => {
    await page.goto('/toggle');

    const button = toggle(page, 'managed-toggle');
    await expect(button).toHaveAttribute('aria-label', 'English, تغيير اللغة');

    // The toggle is the first focusable element on the page; the loop tolerates
    // a browser that lands on the document before the first control.
    let reached = false;
    for (let press = 0; press < 5 && !reached; press++) {
      await page.keyboard.press('Tab');
      reached = await button.evaluate((element) => element === document.activeElement);
    }
    expect(reached, 'Tab reaches the toggle button').toBe(true);
    await expect(button).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(button).toHaveText('العربية');
    await expect(button).toBeFocused();
    // The event is the confirmation, not the intention (§5.2).
    await expect(page.getByTestId('managed-event')).toHaveText('en');
  });

  test('Space activates it, and a second press flips dir back', async ({ page }) => {
    await page.goto('/toggle');

    const button = toggle(page, 'managed-toggle');
    await button.focus();
    await page.keyboard.press('Space');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-EG');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(button).toHaveText('English');
    await expect(button).toBeFocused();
  });
});

test.describe('direction matrix', () => {
  test('the button direction follows the target, not the page', async ({ page }) => {
    await page.goto('/toggle');

    const html = page.locator('html');
    const button = toggle(page, 'managed-toggle');

    // Page RTL, target English: the button is an LTR island.
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(button).toHaveAttribute('lang', 'en');
    await expect(button).toHaveAttribute('dir', 'ltr');
    await expect(button).toHaveCSS('direction', 'ltr');
    await expectInlineStartPadding(page, 'managed-toggle');

    await button.click();

    // Page LTR, target Arabic: the button is an RTL island.
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(button).toHaveAttribute('lang', 'ar');
    await expect(button).toHaveAttribute('dir', 'rtl');
    await expect(button).toHaveCSS('direction', 'rtl');
    await expectInlineStartPadding(page, 'managed-toggle');
  });

  test('an entry without dir renders dir="auto" and follows its own text', async ({ page }) => {
    await page.goto('/toggle');

    const button = toggle(page, 'presentational-toggle');

    // The page is RTL and the entry has no dir, so the button's direction can
    // only come from its own (Latin) text.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(button).toHaveAttribute('lang', 'fr');
    await expect(button).toHaveAttribute('dir', 'auto');
    await expect(button).toHaveCSS('direction', 'ltr');
    await expect(button).toContainText('Français');
  });
});

test.describe('trigger template', () => {
  test('a third-language fragment keeps its own lang and direction', async ({ page }) => {
    await page.goto('/toggle');

    const button = toggle(page, 'presentational-toggle');
    const hint = page.getByTestId('foreign-hint');

    await expect(button).toHaveAttribute('lang', 'fr');
    await expect(hint).toHaveAttribute('lang', 'en');

    // One click moves the presentational pair to its Arabic target: the button
    // becomes RTL while the English fragment inside it stays LTR.
    await button.click();
    await expect(page.getByTestId('presentational-event')).toHaveText('fr');
    await expect(button).toHaveAttribute('lang', 'ar');
    await expect(button).toHaveAttribute('dir', 'rtl');
    await expect(button).toHaveCSS('direction', 'rtl');
    await expect(hint).toHaveAttribute('lang', 'en');
    await expect(hint).toHaveCSS('direction', 'ltr');
    await expect(hint).toHaveText(', Switch language');
    // The visible text is exactly the accessible name (§6).
    await expect(button).toHaveAttribute('aria-label', 'العربية, Switch language');
  });
});

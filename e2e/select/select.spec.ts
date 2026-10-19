import { test, expect } from '@playwright/test';

test.describe('select: single mode', () => {
  test('opens, filters, picks, and closes', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await trigger.click();
    const panel = page.locator('#single-select .rv-select-panel');
    await expect(panel).toBeVisible();

    // accessible name from menuLabel
    await expect(panel).toHaveAttribute('aria-label', 'Invoice status options');

    // searchable: filter
    const search = page.locator('#single-select .rv-select-search');
    await search.fill('paid');
    await expect(page.locator('#single-select .rv-select-item')).toHaveCount(1);

    await page.keyboard.press('Enter');
    await expect(page.locator('#single-select .rv-select-panel')).toBeHidden();
    await expect(page.getByTestId('single-value')).toContainText('value=paid');
    await expect(page.locator('#single-select .rv-select-value')).toContainText('Paid');
  });

  test('disabled option is never picked', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    const rows = page.locator('#single-select .rv-select-item');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toHaveAttribute('aria-disabled', 'true');
    await rows
      .nth(1)
      .click({ force: true })
      .catch(() => {});
    // The disabled row refuses the pick, so the value stays empty.
    await expect(page.getByTestId('single-value')).not.toContainText('value=paid');
    await expect(page.getByTestId('single-value')).not.toContainText('value=outstanding');
  });

  test('outside click closes without stealing focus', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await trigger.click();
    await expect(page.locator('#single-select .rv-select-panel')).toBeVisible();
    await page.locator('h1').click();
    await expect(page.locator('#single-select .rv-select-panel')).toBeHidden();
  });
});

test.describe('select: multi mode', () => {
  test('toggles and stays open', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#multi-select .rv-select-trigger');
    await trigger.click();
    const rows = page.locator('#multi-select .rv-select-item');
    await rows.nth(0).click();
    await rows.nth(1).click();
    await expect(page.locator('#multi-select .rv-select-panel')).toBeVisible();
    await expect(page.getByTestId('multi-value')).toContainText('values=a,b');
    await expect(page.locator('#multi-select .rv-select-check')).toHaveCount(2);
  });
});

test.describe('select: theme isolation', () => {
  test('menu theme does not leak into select, and vice versa', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    const panel = page.locator('#single-select .rv-select-panel');
    await expect(panel).toBeVisible();

    const styles = await panel.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, radius: cs.borderRadius };
    });
    // select-scope sets --rv-select-bg: light blue (224,242,254) and radius 4px
    expect(styles.bg).toBe('rgb(224, 242, 254)');
    expect(styles.radius).toBe('4px');

    // The menu rendered on the same page must keep ITS theme (peach), proving
    // the select's --rv-select-* bridge did not bleed into the menu.
    const menuTrigger = page.getByRole('button', { name: 'Menu' });
    await menuTrigger.click();
    const menuPanel = page.getByRole('menu').first();
    await expect(menuPanel).toBeVisible();
    const menuBg = await menuPanel.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(menuBg).toBe('rgb(255, 237, 213)'); // peach, not select's blue
  });
});

test.describe('select: accessibility names', () => {
  test('caption becomes the trigger aria-labelledby and the panel name', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await expect(trigger).toHaveAttribute('aria-labelledby', /.+/);
    await trigger.click();
    const panel = page.locator('#single-select .rv-select-panel');
    await expect(panel).toHaveAttribute('aria-label', 'Invoice status options');
  });
});

test.describe('select: RTL placement', () => {
  test('aligns the panel to the trigger\'s leading (right) edge', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#rtl-select .rv-select-trigger');
    await trigger.click();
    const panel = page.locator('#rtl-select .rv-select-panel');
    await expect(panel).toBeVisible();

    const t = await trigger.boundingBox();
    const p = await panel.boundingBox();
    expect(t).not.toBeNull();
    expect(p).not.toBeNull();

    // `dir="rtl"` is on a wrapper, not <html>: the panel must still resolve
    // RTL and align its RIGHT edge with the trigger's RIGHT edge.
    expect(Math.abs(p!.x + p!.width - (t!.x + t!.width))).toBeLessThanOrEqual(1);

    // And it must stay glued to the trigger horizontally — the old code
    // re-anchored an overflowing RTL panel to the trigger's LEFT edge, which
    // threw it across the viewport.
    expect(Math.abs(p!.x - t!.x)).toBeLessThanOrEqual(1);
  });

  test('keeps the panel inside the viewport when the trigger hugs the edge', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 720 });
    await page.goto('/select');
    await page.locator('#rtl-select .rv-select-trigger').click();
    const panel = page.locator('#rtl-select .rv-select-panel');
    await expect(panel).toBeVisible();

    const p = await panel.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(p!.x).toBeGreaterThanOrEqual(-1);
    expect(p!.x + p!.width).toBeLessThanOrEqual(vw + 1);
  });

  test('picks work in RTL and the trigger shows the label', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#rtl-select .rv-select-trigger').click();
    await page.locator('#rtl-select .rv-select-item').nth(2).click();
    await expect(page.getByTestId('rtl-value')).toContainText('value=member');
    await expect(page.locator('#rtl-select .rv-select-value')).toContainText('Member');
  });
});

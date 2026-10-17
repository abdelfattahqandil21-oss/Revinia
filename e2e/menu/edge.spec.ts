import { test, expect } from '@playwright/test';

test.describe('viewport and ancestor clipping', () => {
  test('bottom-pinned trigger flips above', async ({ page }) => {
    await page.goto('/edge');
    await page.getByRole('button', { name: 'Edge menu' }).click();
    const panel = page.getByRole('menu', { name: 'Edge menu' });
    await expect(panel).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Edge menu' });
    const tr = await trigger.boundingBox();
    const pa = await panel.boundingBox();
    expect(tr).not.toBeNull();
    expect(pa).not.toBeNull();
    // panel opens above the trigger (bottom - top)
    expect(pa!.y + pa!.height).toBeLessThanOrEqual(tr!.y);
    await expect(panel).toHaveAttribute('data-flipped', 'true');
    await expect(panel).toHaveAttribute('data-top-layer', 'true');
  });

  test('panel escapes an overflow:hidden ancestor', async ({ page }) => {
    await page.goto('/edge');
    await page.getByRole('button', { name: 'Clipped ancestor' }).click();
    const panel = page.getByRole('menu', { name: 'Clipped menu' });
    await expect(panel).toBeVisible();
    // fully within viewport and not zero-sized
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(100);
    const vp = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
  });
});

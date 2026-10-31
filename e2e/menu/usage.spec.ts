import { test, expect, type Page } from '@playwright/test';
import { openMenu } from './support';

/**
 * Usage and display contract for 0.4.0 (docs/SPEC-menu-usage-display.md).
 * Every case here fails on the pre-change tree; jsdom cannot answer any of
 * them (form submission, painted backgrounds, layout caps, motion origin).
 */

/** Rows that paint a background of their own — at most one may exist. */
async function paintedRows(page: Page): Promise<string[]> {
  return page.locator('[rvmenuitem]').evaluateAll((rows) =>
    rows
      .filter((row) => {
        const bg = getComputedStyle(row).backgroundColor;
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      })
      .map((row) => (row.textContent ?? '').trim()),
  );
}

test.describe('usage — generated rows inside a form', () => {
  test('picking a rendered row never submits the form', async ({ page }) => {
    await page.goto('/api');
    await page.getByRole('button', { name: 'Data' }).click();
    await page.getByRole('menuitem', { name: 'Billing' }).click();

    await expect(page.locator('[data-testid="api-result"]')).toHaveText('picked=data=billing');
    // An implicit `type="submit"` row would have submitted the form.
    await expect(page.locator('[data-testid="form-submits"]')).toHaveText('submits=0');
  });
});

test.describe('display — one highlight at a time', () => {
  test('hovering then arrowing leaves exactly one painted row', async ({ page }) => {
    await page.goto('/basic');
    await openMenu(page, page.getByRole('button', { name: 'Actions' }));

    const duplicate = page.getByRole('menuitem', { name: 'Duplicate' });
    await duplicate.hover();
    await expect(duplicate).toHaveAttribute('data-active', 'true');

    // The pointer stays over 'Duplicate'; only the active row may be painted.
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
    expect(await paintedRows(page)).toEqual(['Delete']);
  });
});

test.describe('display — panel size', () => {
  test('a long label wraps inside a 352px cap instead of stretching the panel', async ({
    page,
  }) => {
    await page.goto('/api');
    await page.getByRole('button', { name: 'Long labels' }).click();
    const panel = page.getByRole('menu', { name: 'Long labels' });
    await expect(panel).toBeVisible();

    const box = await panel.evaluate((el) => {
      const row = el.querySelector('[rvmenuitem]') as HTMLElement;
      return {
        // 22rem at the default 16px root font.
        panelWidth: el.getBoundingClientRect().width,
        panelOverflow: el.scrollWidth - el.clientWidth,
        rowHeight: row.getBoundingClientRect().height,
        rowOverflow: row.scrollWidth - row.clientWidth,
        documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    expect(box.panelWidth).toBeLessThanOrEqual(352);
    // Wrapped, not ellipsized: three lines of 14px text beat the 40px row floor.
    expect(box.rowHeight).toBeGreaterThan(40);
    expect(box.rowOverflow).toBeLessThanOrEqual(0);
    expect(box.panelOverflow).toBeLessThanOrEqual(0);
    expect(box.documentOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe('usage — pointer versus keyboard open', () => {
  test('a click highlights nothing, Enter highlights the first row', async ({ page }) => {
    await page.goto('/basic');
    const trigger = page.getByRole('button', { name: 'Actions' });

    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.locator('[rvmenuitem][data-active="true"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Escape');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[rvmenuitem][data-active="true"]')).toHaveCount(1);
    await expect(page.getByRole('menuitem', { name: /New file/i })).toBeFocused();
  });
});

test.describe('a11y — aria-controls lifecycle', () => {
  test('the reference exists only while the panel does', async ({ page }) => {
    await page.goto('/basic');
    const trigger = page.getByRole('button', { name: 'Actions' });

    expect(await trigger.getAttribute('aria-controls')).toBeNull();
    await trigger.click();
    const id = await page.getByRole('menu').getAttribute('id');
    expect(id).toBeTruthy();
    await expect(trigger).toHaveAttribute('aria-controls', id!);
    expect(await page.locator(`#${id}`).count()).toBe(1);

    await page.keyboard.press('Escape');
    // Angular flushes the ARIA effect after the key handler returns.
    await expect.poll(() => trigger.getAttribute('aria-controls')).toBeNull();
  });
});

test.describe('design — motion origin follows the trigger corner', () => {
  async function origin(page: Page, name: string) {
    const panel = page.getByRole('menu', { name });
    await expect(panel).toBeVisible();
    // Layout dimensions, not the visual box: the entry animation scales the
    // panel to 0.96, and `transform-origin` is resolved against layout size.
    return panel.evaluate((el) => {
      const [x, y] = getComputedStyle(el)
        .transformOrigin.split(' ')
        .map((part) => Number.parseFloat(part));
      return { x, y, width: el.offsetWidth, height: el.offsetHeight };
    });
  }

  test('bottom-start LTR grows from its top-left corner', async ({ page }) => {
    await page.goto('/basic');
    await page.getByRole('button', { name: 'Actions' }).click();
    const o = await origin(page, 'Actions menu');
    expect(o.x).toBeCloseTo(0, 0);
    expect(o.y).toBeCloseTo(0, 0);
  });

  test('bottom-start RTL grows from its top-right corner', async ({ page }) => {
    await page.goto('/rtl');
    await page.getByRole('button', { name: 'البداية' }).click();
    const o = await origin(page, 'قائمة البداية');
    expect(o.x).toBeCloseTo(o.width, 0);
    expect(o.y).toBeCloseTo(0, 0);
  });

  test('a flipped panel grows from its bottom edge', async ({ page }) => {
    await page.goto('/edge');
    await page.getByRole('button', { name: 'Edge menu' }).click();
    const panel = page.getByRole('menu', { name: 'Edge menu' });
    await expect(panel).toHaveAttribute('data-flipped', 'true');
    const o = await origin(page, 'Edge menu');
    expect(o.y).toBeCloseTo(o.height, 0);
  });
});

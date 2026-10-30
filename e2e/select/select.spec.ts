import { test, expect } from '@playwright/test';

test.describe('select: single mode', () => {
  test('opens, filters, picks, and closes', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#single-select .rv-select-trigger');
    await trigger.click();
    const panel = page.locator('#single-select .rv-select-panel');
    await expect(panel).toBeVisible();

    // accessible name from menuLabel
    await expect(page.locator('#single-select .rv-select-popup-panel')).toHaveAttribute(
      'aria-label',
      'Invoice status options',
    );

    // searchable: filter
    const search = page.locator('#single-select .rv-select-search');
    await search.fill('paid');
    await expect(page.locator('#single-select .rv-select-popup-panel [role="menuitem"]')).toHaveCount(1);

    await page.keyboard.press('Enter');
    await expect(page.locator('#single-select .rv-select-panel')).toBeHidden();
    await expect(page.getByTestId('single-value')).toContainText('value=paid');
    await expect(page.locator('#single-select .rv-select-value')).toContainText('Paid');
  });

  test('disabled option is never picked', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#single-select .rv-select-trigger').click();
    const rows = page.locator('#single-select .rv-select-popup-panel [role="menuitem"]');
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
    // The harness page is taller than the 720px test viewport. Park the page at
    // its maximum scroll before opening: otherwise Playwright's scroll-to-click
    // on the top-layer row scrolls the document, and a document scroll closes
    // the panel by design.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const trigger = page.locator('#multi-select .rv-select-trigger');
    await trigger.click();
    const rows = page.locator('#multi-select .rv-select-popup-panel [role="menuitemcheckbox"]');
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
    const panel = page.locator('#single-select .rv-select-popup-panel');
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
    const panel = page.locator('#single-select .rv-select-popup-panel');
    await expect(panel).toHaveAttribute('aria-label', 'Invoice status options');
  });

  test('keeps label IDs and accessible names unique across application roots', async ({ page }) => {
    // Contract: Given two independent Angular roots with distinct APP_ID values
    // and different visible Select captions, when both triggers render, each
    // trigger must name itself from its own caption and all document IDs must
    // be unique. Must not pass on rendering/nonempty IDs alone. The prior
    // counterexample produced label-1 in both roots, making both names resolve
    // to the first caption.
    await page.goto('/select-multi-root');

    const first = page.getByRole('button', { name: 'First application label' });
    const second = page.getByRole('button', { name: 'Second application label' });
    await expect(first).toHaveCount(1);
    await expect(second).toHaveCount(1);
    await expect(first).toHaveAccessibleName('First application label');
    await expect(second).toHaveAccessibleName('Second application label');

    const documentIds = await page.locator('[id]').evaluateAll((elements) =>
      elements.map((element) => element.id).filter((id) => id.length > 0),
    );
    const duplicateIds = documentIds.filter((id, index) => documentIds.indexOf(id) !== index);
    expect(duplicateIds).toEqual([]);

    const ids = await page.locator('.rv-select-caption').evaluateAll((captions) =>
      captions.map((caption) => caption.id),
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);

    await expect(first).toHaveAttribute('aria-labelledby', ids[0]);
    await expect(second).toHaveAttribute('aria-labelledby', ids[1]);
    expect(
      await first.evaluate((trigger) =>
        document.getElementById(trigger.getAttribute('aria-labelledby')!)?.textContent?.trim(),
      ),
    ).toBe('First application label');
    expect(
      await second.evaluate((trigger) =>
        document.getElementById(trigger.getAttribute('aria-labelledby')!)?.textContent?.trim(),
      ),
    ).toBe('Second application label');
  });
});

test.describe('select: responsive width', () => {
  async function measure(page: import('@playwright/test').Page, id: string) {
    const trigger = page.locator(`#${id} .rv-select-trigger`);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const panel = page.locator(`#${id} .rv-select-popup-panel`);
    await expect(panel).toBeVisible();
    // The panel opens with a scale animation; a rect taken mid-animation is
    // 1–4px off and would look like a width mismatch.
    await panel.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    const triggerBox = (await trigger.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    const rowHeight = await panel
      .locator('[rvselectpopupitem]')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    const overflow = await panel.evaluate((el) => ({
      panel: el.scrollWidth > el.clientWidth,
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    return { triggerBox, panelBox, rowHeight, overflow };
  }

  test('the 14rem floor applies in a wide container and the panel follows it', async ({ page }) => {
    await page.goto('/select');
    const m = await measure(page, 'size-wide');
    // 0.6.1 sized the button to its content (measured 103px) because the
    // percentage in `min(14rem, 100%)` collapsed inside a shrink-to-fit chain.
    expect(m.triggerBox.width).toBeGreaterThanOrEqual(223);
    expect(Math.abs(m.panelBox.width - m.triggerBox.width)).toBeLessThanOrEqual(1);
    expect(m.overflow.panel).toBe(false);
  });

  test('at the 10rem design minimum a row still fits on one line', async ({ page }) => {
    await page.goto('/select');
    const m = await measure(page, 'size-160');
    expect(Math.abs(m.panelBox.width - m.triggerBox.width)).toBeLessThanOrEqual(1);
    // One line: the label and the panel padding fit exactly.
    expect(m.rowHeight).toBeLessThanOrEqual(44);
    expect(m.overflow.panel).toBe(false);
  });

  test('below the minimum the container wins, labels wrap, nothing overflows', async ({ page }) => {
    await page.goto('/select');
    const m = await measure(page, 'size-120');
    // The floor is capped by the container, so the select shrinks with it
    // instead of overflowing the cell or the page.
    expect(m.triggerBox.width).toBeLessThan(160);
    expect(Math.abs(m.panelBox.width - m.triggerBox.width)).toBeLessThanOrEqual(1);
    // The row grows instead of the panel getting wider.
    expect(m.rowHeight).toBeGreaterThan(44);
    expect(m.overflow.panel).toBe(false);
    expect(m.overflow.page).toBe(false);
  });
});

test.describe('select: virtualised list', () => {
  test('renders a window of 500 rows and scrolls the panel to the last one', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#virtual-select .rv-select-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const panel = page.locator('#virtual-select .rv-select-popup-panel');
    await expect(panel).toBeVisible();

    // `listTemplate` replaces the list and only the window is in the DOM.
    const windowed = await panel.locator('.virtual-row').count();
    expect(windowed).toBeGreaterThan(0);
    expect(windowed).toBeLessThan(40);

    const scroller = await panel.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      horizontal: el.scrollWidth > el.clientWidth,
    }));
    // The panel is the scroll container the consumer virtualiser needs.
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight * 10);
    expect(scroller.horizontal).toBe(false);

    await panel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(panel.locator('.virtual-row', { hasText: 'Row 500' })).toHaveCount(1);
  });

  test('keeps working after a close and reopen', async ({ page }) => {
    // The panel is destroyed on close and rebuilt on open. `panelReady` has to
    // hand over the NEW element each time; a once-per-instance emission left
    // the virtual list bound to a detached panel, so scrolls after reopening
    // no longer moved the window.
    await page.goto('/select');
    const trigger = page.locator('#virtual-select .rv-select-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const panel = page.locator('#virtual-select .rv-select-popup-panel');
    await expect(panel).toBeVisible();
    await panel.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(panel.locator('.virtual-row', { hasText: 'Row 500' })).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(panel).toBeVisible();
    await panel.evaluate((el) => {
      // A fresh panel already sits at 0, so 0 alone fires no scroll event. Nudge
      // it first: the consumer's window only moves on a scroll it can hear.
      el.scrollTop = 200;
      el.scrollTop = 0;
    });
    await expect(panel.locator('.virtual-row').first()).toHaveText('Row 1');
    await expect(panel.locator('.virtual-row', { hasText: 'Row 500' })).toHaveCount(0);
  });

  test('keeps the panel as wide as the trigger with the virtual list', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#virtual-select .rv-select-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const panel = page.locator('#virtual-select .rv-select-popup-panel');
    await expect(panel).toBeVisible();
    await panel.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      );
    });

    const triggerWidth = (await trigger.boundingBox())!.width;
    const panelWidth = (await panel.boundingBox())!.width;
    expect(Math.abs(panelWidth - triggerWidth)).toBeLessThanOrEqual(1);
    const horizontal = await panel.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(horizontal).toBe(false);
  });
});

test.describe('select: RTL placement', () => {
  test('aligns the panel to the trigger\'s leading (right) edge', async ({ page }) => {
    await page.goto('/select');
    const trigger = page.locator('#rtl-select .rv-select-trigger');
    await trigger.click();
    const panel = page.locator('#rtl-select .rv-select-popup-panel');
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
    const panel = page.locator('#rtl-select .rv-select-popup-panel');
    await expect(panel).toBeVisible();

    const p = await panel.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(p!.x).toBeGreaterThanOrEqual(-1);
    expect(p!.x + p!.width).toBeLessThanOrEqual(vw + 1);
  });

  test('picks work in RTL and the trigger shows the label', async ({ page }) => {
    await page.goto('/select');
    await page.locator('#rtl-select .rv-select-trigger').click();
    await page.locator('#rtl-select .rv-select-popup-panel [role="menuitem"]').nth(2).click();
    await expect(page.getByTestId('rtl-value')).toContainText('value=member');
    await expect(page.locator('#rtl-select .rv-select-value')).toContainText('Member');
  });
});

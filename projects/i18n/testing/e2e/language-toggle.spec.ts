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
    const first = button.firstElementChild;
    if (first === null) {
      throw new Error('the button renders no inline content');
    }
    const box = button.getBoundingClientRect();
    const content = first.getBoundingClientRect();
    const style = getComputedStyle(button);
    const border = button.clientLeft;
    return {
      direction: style.direction,
      paddingInlineStart: Number.parseFloat(style.paddingInlineStart),
      paddingInlineEnd: Number.parseFloat(style.paddingInlineEnd),
      gapStart:
        style.direction === 'rtl'
          ? box.right - content.right - border
          : content.left - box.left - border,
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
    const host = page.getByTestId('managed-toggle');
    const button = toggle(page, 'managed-toggle');

    // Page RTL, target English: the button is an LTR island.
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(host).toHaveCSS('direction', 'rtl');
    await expect(button).toHaveAttribute('lang', 'en');
    await expect(button).toHaveAttribute('dir', 'ltr');
    await expect(button).toHaveCSS('direction', 'ltr');
    await expectInlineStartPadding(page, 'managed-toggle');

    await button.click();

    // Page LTR, target Arabic: the button is an RTL island.
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(host).toHaveCSS('direction', 'ltr');
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

test.describe('theme tokens', () => {
  test('the semantic border colour and font family flow through the toggle', async ({ page }) => {
    await page.goto('/toggle');

    // `--rv-border` is a colour (D42): the declaration supplies `1px solid`.
    // Passing it straight to `border` would reset the style to `none`, and
    // `--rv-font` passed to the `font` shorthand would drop the declaration.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--rv-border', 'rgb(1, 2, 3)');
      document.documentElement.style.setProperty('--rv-font', 'monospace');
    });

    await expect
      .poll(() =>
        toggle(page, 'managed-toggle').evaluate((button) => {
          const style = getComputedStyle(button);
          return `${style.borderTopStyle} ${style.borderTopColor} ${style.fontFamily}`;
        }),
      )
      .toBe('solid rgb(1, 2, 3) monospace');
  });
});

test.describe('icon', () => {
  interface IconFacts {
    size: [number, number];
    box: [number, number];
    direction: string;
    /** The icon sits on the button's start side, next to the name. */
    leads: boolean;
  }

  const facts = (page: Page, testId: string): Promise<IconFacts> =>
    page.evaluate((id) => {
      const button = document.querySelector(`[data-testid="${id}"] button`);
      if (button === null) {
        throw new Error(`no button in ${id}`);
      }
      const box = button.querySelector('.rv-language-toggle__icon');
      const svg = box?.querySelector('svg');
      const name = button.querySelector('.rv-language-toggle__name, .toggle-name');
      if (!box || !svg || !name) {
        throw new Error(`${id} must render an icon, an svg and a name`);
      }
      const i = svg.getBoundingClientRect();
      const n = name.getBoundingClientRect();
      const direction = getComputedStyle(button).direction;
      return {
        size: [+i.width.toFixed(2), +i.height.toFixed(2)],
        box: [
          +box.getBoundingClientRect().width.toFixed(2),
          +box.getBoundingClientRect().height.toFixed(2),
        ],
        direction,
        leads: direction === 'rtl' ? i.left >= n.right : i.right <= n.left,
      };
    }, testId);

  test('the default globe is decorative and leads the name in both directions', async ({
    page,
  }) => {
    await page.goto('/toggle');
    const button = toggle(page, 'managed-toggle');
    const globe = page
      .getByTestId('managed-toggle')
      .locator('.rv-language-toggle__icon svg:not([data-testid])');

    await expect(globe).toHaveCount(1);
    await expect(globe).toHaveAttribute('aria-hidden', 'true');
    await expect(globe).toHaveAttribute('focusable', 'false');
    // The label is the accessible name; the mark contributes nothing to it.
    await expect(button).toHaveAttribute('aria-label', 'English, تغيير اللغة');

    // The page is RTL, but the button follows its target — English — so it is
    // an LTR island and the icon leads on the left.
    const ltr = await facts(page, 'managed-toggle');
    expect(ltr.direction).toBe('ltr');
    expect(ltr.leads, 'the icon leads in LTR').toBe(true);
    expect(ltr.size).toEqual(ltr.box);

    await button.click();
    // The click resolves before the zoneless app renders the new target.
    await expect(button).toHaveText('العربية');

    // One click moves the target to Arabic: the button is RTL, so "leading" is
    // the right-hand side.
    const rtl = await facts(page, 'managed-toggle');
    expect(rtl.direction).toBe('rtl');
    expect(rtl.leads, 'the icon leads in RTL').toBe(true);
    expect(rtl.size).toEqual(rtl.box);
  });

  test('a consumer template replaces the mark and is painted at the same size', async ({
    page,
  }) => {
    await page.goto('/toggle');
    const host = page.getByTestId('presentational-toggle');
    const custom = host.getByTestId('custom-icon');

    await expect(custom).toHaveCount(1);
    // Exactly one icon: the default mark is gone, not merely hidden.
    await expect(host.locator('.rv-language-toggle__icon svg')).toHaveCount(1);
    await expect(custom).toHaveAttribute('aria-hidden', 'true');

    // A consumer node carries no _ngcontent attribute, so no descendant rule
    // can size it; the stretched box is what makes it fill. WebKit resolves a
    // bare <svg> inside a flex item to 0x0, which is why this asserts the
    // painted box, not just the wrapper (WebKit is not in this config — D39 —
    // so the engines here prove the sizes agree, not the WebKit fix itself).
    const before = await facts(page, 'presentational-toggle');
    expect(before.size[0]).toBeGreaterThan(0);
    expect(before.size).toEqual(before.box);
    expect(before.leads).toBe(true);

    await host.locator('button').click();
    await expect(host.locator('button')).toContainText('العربية');
    const after = await facts(page, 'presentational-toggle');
    expect(after.size).toEqual(after.box);
    expect(after.leads, 'the icon leads after the direction flips').toBe(true);
  });

  test('the icon token resizes the box and the painted icon', async ({ page }) => {
    await page.goto('/toggle');
    await page.evaluate(() =>
      document.documentElement.style.setProperty('--rv-i18n-toggle-icon-size', '32px'),
    );

    for (const id of ['managed-toggle', 'presentational-toggle']) {
      await expect.poll(async () => (await facts(page, id)).size).toEqual([32, 32]);
      expect((await facts(page, id)).box).toEqual([32, 32]);
    }
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
    await expect(hint).toHaveText('Switch language');
    // The visible text is exactly the accessible name (§6).
    await expect(button).toHaveAttribute('aria-label', 'العربية, Switch language');

    // The comma belongs to the name's run. If it led the English fragment it
    // would be the first character of an LTR run — bidi pushes it to the far
    // edge of the button — and the flex `gap` would separate it from the name.
    const label = await button.evaluate((element) => {
      const name = element.querySelector('.toggle-name');
      const badge = element.querySelector('.toggle-badge');
      if (name === null || badge === null) {
        throw new Error('the trigger template must render .toggle-name and .toggle-badge');
      }

      // Everything in the name element that comes before the badge.
      const nodes = Array.from(name.childNodes);
      const before = nodes.slice(0, nodes.indexOf(badge));
      const run = before.map((node) => node.textContent ?? '').join('');

      // Where the comma is, and where the last name glyph ends.
      const texts = before.filter(
        (node): node is Text =>
          node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );
      const commaNode = texts.at(-1);
      if (commaNode === undefined) {
        throw new Error('the name element must hold text before the badge');
      }
      const commaIndex = (commaNode.textContent ?? '').trimEnd().length - 1;
      const firstText = texts[0];

      const commaRange = document.createRange();
      commaRange.setStart(commaNode, commaIndex);
      commaRange.setEnd(commaNode, commaIndex + 1);
      const beforeRange = document.createRange();
      beforeRange.setStart(firstText, 0);
      beforeRange.setEnd(commaNode, commaIndex);

      const commaBox = commaRange.getBoundingClientRect();
      const nameBox = beforeRange.getBoundingClientRect();
      const badgeBox = badge.getBoundingClientRect();
      // Horizontal distance between two boxes in the inline direction,
      // whichever way the button runs.
      const distance = (a: DOMRect, b: DOMRect): number =>
        Math.min(Math.abs(a.left - b.right), Math.abs(a.right - b.left));

      return {
        commaInName: run.trimEnd().endsWith(','),
        badgeInsideName: name.contains(badge),
        commaTouchesName: distance(commaBox, nameBox),
        commaTouchesBadge: distance(commaBox, badgeBox),
        replacesName: element.querySelector('.rv-language-toggle__name') === null,
      };
    });
    expect(label.commaInName).toBe(true);
    expect(label.badgeInsideName).toBe(true);
    expect(label.replacesName).toBe(true);
    // No flex item boundary (and so no `gap`) may fall between the name, its
    // comma and the badge in either direction. The badge is one word space
    // after the comma, never the 8px gap.
    expect(label.commaTouchesName, 'the comma must sit against the name').toBeLessThan(3);
    expect(label.commaTouchesBadge, 'only the word space may follow the comma').toBeLessThan(6);
  });
});

test.describe('feedback', () => {
  test('pressing changes the fill more than hovering does', async ({ page }) => {
    await page.goto('/toggle');

    // `color-mix(… transparent)` changes the fill's ALPHA, so the raw channel
    // values are identical in both states. What the eye sees is the fill
    // composited over the card, which is what this reads.
    const fill = (element: Element): number[] => {
      const parse = (colour: string) => {
        const numbers = (colour.match(/[\d.]+/g) ?? []).map(Number);
        if (numbers.length < 3) {
          throw new Error(`unparseable colour: ${colour}`);
        }
        const unit = colour.startsWith('color(') ? 255 : 1;
        return { rgb: numbers.slice(0, 3).map((value) => value * unit), alpha: numbers[3] ?? 1 };
      };
      let backdrop: number[] | null = null;
      for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const { rgb, alpha } = parse(getComputedStyle(node).backgroundColor);
        if (alpha === 1) {
          backdrop = rgb;
          break;
        }
      }
      if (backdrop === null) {
        throw new Error('no opaque backdrop behind the toggle');
      }
      const { rgb, alpha } = parse(getComputedStyle(element).backgroundColor);
      return rgb.map((channel, index) => channel * alpha + backdrop[index] * (1 - alpha));
    };

    const button = toggle(page, 'presentational-toggle');
    await button.hover();
    const hover = await button.evaluate(fill);

    const box = await button.boundingBox();
    if (box === null) {
      throw new Error('the toggle has no box');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = await button.evaluate(fill);
    await page.mouse.up();

    expect(hover).toHaveLength(3);
    expect(pressed).toHaveLength(3);

    // 8% -> 10% of the ink composites to ~4/255: present in the DOM, invisible
    // on screen. The press must read as a separate state.
    const delta = Math.max(...hover.map((channel, index) => Math.abs(channel - pressed[index])));
    expect(delta, `hover ${hover.join(',')} vs pressed ${pressed.join(',')}`).toBeGreaterThan(10);
  });

  test('hover keeps the base fill, so a dark button does not turn see-through', async ({
    page,
  }) => {
    await page.goto('/toggle');
    await page.evaluate(() =>
      document.documentElement.style.setProperty('--rv-bg', 'rgb(20, 20, 24)'),
    );

    const button = toggle(page, 'presentational-toggle');
    const read = () =>
      button.evaluate((element) => {
        const css = getComputedStyle(element).backgroundColor;
        const numbers = (css.match(/[\d.]+/g) ?? []).map(Number);
        return { css, alpha: numbers.length >= 4 ? numbers[3] : 1 };
      });

    const base = await read();
    await button.hover();
    const hovered = await read();

    // The default hover fill is 8% ink mixed OVER the base colour. Left as ink
    // alone — or applied with the `background` shorthand, which drops the base
    // fill — the hovered button is 8% opaque and the page shows through.
    expect(base.alpha).toBe(1);
    expect(hovered.alpha, `hover ${hovered.css} over base ${base.css}`).toBe(1);
    expect(hovered.css).not.toBe(base.css);
  });
});

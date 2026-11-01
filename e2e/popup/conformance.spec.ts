import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * S3 — one popup conformance suite, run against BOTH popup components.
 *
 * The select popup and the menu panel are the same module twice (D86 measures
 * the duplication; extracting the shared core is post-1.0). Two independent
 * suites let one component drift while the other stays green, which is exactly
 * what happened to the close behaviors before this file existed. Every test
 * here is written once and executed per adapter, so a behavior the two
 * components disagree about fails with the disagreement in its name.
 *
 * Eight behaviors run against three hosts — the select popup and the plain menu
 * on `/select`, and the same menu with a consumer input projected into its panel
 * on `/content` — so twenty-four cases. The adapters differ in the selectors and
 * in the one thing the components genuinely do not share: whether the panel has
 * an editable element inside it.
 *
 * The spec's eighth item — a server render that must not touch `window` or
 * `document` — is not here, because a browser cannot host one. It is covered by
 * `pnpm check:popup-ssr` (`scripts/check-popup-ssr.mjs`), which renders both
 * components with those globals undefined, so any actual use throws; see D86.
 */
type Adapter = {
  readonly name: string;
  readonly route: string;
  readonly root: string;
  readonly trigger: string;
  readonly panel: string;
  readonly row: string;
  /** An editable element inside the panel, or null when the panel has none. */
  readonly editable: string | null;
};

const SELECT: Adapter = {
  name: 'select popup',
  route: '/select',
  root: '#single-select',
  trigger: '#single-select .rv-select-trigger',
  panel: '#single-select .rv-select-popup-panel',
  row: '#single-select .rv-select-popup-menu [role="menuitemradio"]',
  editable: '#single-select .rv-select-search',
};

const MENU: Adapter = {
  name: 'menu panel',
  route: '/select',
  root: '#plain-menu',
  trigger: '#plain-menu .rv-menu-trigger button',
  panel: '#plain-menu .rv-menu-panel',
  row: '#plain-menu [rvmenuitem]',
  editable: null,
};

/**
 * The same menu component with a consumer `<input>` projected into its panel
 * (`/content`), which is the ONLY host where the menu's half of the resize
 * exemption can mean anything: the built-in panel has nothing editable, so with
 * `MENU` alone the rule is tested only in the direction where it does nothing.
 * Without this adapter the exemption could be deleted from `menu-panel.ts` and
 * the suite would stay green while the README kept advertising the behavior.
 */
const PROJECTED_MENU: Adapter = {
  name: 'menu panel with a projected field',
  route: '/content',
  root: '#projected-menu',
  trigger: '#projected-menu .rv-menu-trigger button',
  panel: '#projected-menu .rv-menu-panel',
  row: '#projected-menu [rvmenuitem]',
  editable: '#projected-menu .filter',
};

const ADAPTERS = [SELECT, MENU, PROJECTED_MENU];

const POPUP_GLOBALS = ['document:pointerdown', 'window:scroll', 'window:resize'] as const;

/**
 * Wrap `addEventListener`/`removeEventListener` on the page and keep a running
 * balance of the three globals a popup owns. Installed as an init script because
 * the app registers its listeners during boot: a script evaluated after
 * `goto()` would miss them and the balance would start from a lie.
 */
const listenerLedger = () => {
  const balance = new Map<string, number>();
  for (const key of ['document:pointerdown', 'window:scroll', 'window:resize']) {
    balance.set(key, 0);
  }
  const label = (target: EventTarget) =>
    target === window ? 'window' : target === document ? 'document' : null;
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    ...rest: unknown[]
  ) {
    const owner = label(this);
    if (owner) {
      const key = `${owner}:${type}`;
      balance.set(key, (balance.get(key) ?? 0) + 1);
    }
    return add.apply(this, [type, ...rest] as Parameters<typeof add>);
  };
  EventTarget.prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    ...rest: unknown[]
  ) {
    const owner = label(this);
    if (owner) {
      const key = `${owner}:${type}`;
      const next = (balance.get(key) ?? 0) - 1;
      balance.set(key, next);
    }
    return remove.apply(this, [type, ...rest] as Parameters<typeof remove>);
  };
  (window as unknown as Record<string, unknown>).__listenerLedger = () =>
    Object.fromEntries(balance);
};

/** A fresh page with the component under test centered in the viewport. */
async function gotoHost(page: Page, adapter: Adapter): Promise<void> {
  await page.addInitScript(listenerLedger);
  await page.goto(adapter.route);
  // Center the component rather than parking at the document bottom: the panel
  // has to be fully visible below its trigger, and Playwright scrolls into view
  // before clicking anything that is off-screen — a document scroll closes the
  // panel by design, so a harness scroll would answer the question before the
  // behavior under test ever ran.
  await page.evaluate((root) => {
    const host = document.querySelector(root);
    if (!host) throw new Error(`${root} is not on this page`);
    const box = host.getBoundingClientRect();
    scrollTo(0, window.scrollY + box.top - 180);
  }, adapter.root);
  await page.waitForTimeout(50);
}

/**
 * Give the document a scrollport before a test that scrolls it.
 *
 * `/content` ends a few lines below its toolbar, so a `scrollBy` there lands on
 * its own limit, fires no event, and the case would pass by never producing the
 * condition it claims to check. The suite appends the space rather than editing
 * the demo page: the other menu specs click around `/content`, and a document
 * that suddenly scrolls changes what those clicks do to an open panel. It runs
 * for every adapter, so all three measure the scroll rule on the same fixture.
 */
async function makeScrollable(page: Page): Promise<void> {
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.id = 'rv-conformance-scrollport';
    spacer.style.height = '300vh';
    document.body.appendChild(spacer);
  });
}

/** Pointer-open, then step into the rows the way a keyboard user would. */
async function openAndEnter(page: Page, adapter: Adapter): Promise<void> {
  await page.locator(adapter.trigger).click();
  await expect(page.locator(adapter.panel)).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.locator(`${adapter.root} [data-active="true"]`).first().waitFor();
}

/** Keyboard-open: focus the trigger and press Enter. */
async function openFromKeyboard(page: Page, adapter: Adapter): Promise<void> {
  await page.locator(adapter.trigger).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(adapter.panel)).toBeVisible();
}

/**
 * Resize the viewport and prove the resize did not also scroll the document.
 *
 * A document scroll closes the panel by design, so a clamped scroll offset
 * would close it for a reason this suite is not testing — and the "stays open"
 * case would fail while the "closes" case would pass with the policy deleted.
 * Throwing here is what keeps both tests measuring the resize rule.
 */
async function resizeViewport(page: Page, width: number, height: number): Promise<void> {
  const before = await page.evaluate(() => window.scrollY);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => window.scrollY);
  if (after !== before) {
    throw new Error(
      `the viewport change also scrolled the document (${before} -> ${after}): the panel could have closed on the scroll rule`,
    );
  }
}

function activeElementData(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return 'body';
    if (element.matches('.rv-select-trigger')) return 'select-trigger';
    if (element.matches('.rv-menu-trigger button')) return 'menu-trigger';
    return element.tagName.toLowerCase();
  });
}

for (const adapter of ADAPTERS) {
  test.describe(`popup conformance: ${adapter.name}`, () => {
    test('outside pointerdown closes without stealing focus back to the trigger', async ({
      page,
    }) => {
      await gotoHost(page, adapter);
      await openAndEnter(page, adapter);
      // Focus is inside the panel, so a close that "restores" it would land it
      // on the trigger. The pointer is heading somewhere else entirely, and the
      // browser must keep it there (APG non-modal, WCAG focus-visible).
      expect(await activeElementData(page)).not.toBe('body');

      // A raw pointer event at an empty corner of the page. `locator.click()`
      // on any element outside the fold scrolls the document first, and that
      // scroll closes the panel — the test would then measure the scroll rule
      // while claiming to measure the pointerdown rule.
      const size = page.viewportSize();
      if (!size) throw new Error('the test has no viewport to click in');
      await page.mouse.click(2, size.height - 8);

      await expect(page.locator(adapter.panel)).toHaveCount(0);
      const after = await activeElementData(page);
      expect(after).not.toContain('trigger');
    });

    test('Escape closes and returns focus to the trigger', async ({ page }) => {
      await gotoHost(page, adapter);
      await openFromKeyboard(page, adapter);

      await page.keyboard.press('Escape');

      await expect(page.locator(adapter.panel)).toHaveCount(0);
      expect(await activeElementData(page)).toContain('trigger');
    });

    test('scroll outside the panel closes it', async ({ page }) => {
      await gotoHost(page, adapter);
      await makeScrollable(page);
      await openAndEnter(page, adapter);

      // Prove the document really moved before asserting anything closed by it:
      // a scroll that lands on its own limit fires no event, and the test would
      // pass by never producing the condition it claims to check.
      const moved = await page.evaluate(() => {
        const before = window.scrollY;
        window.scrollBy(0, before > 120 ? -120 : 120);
        return { before, after: window.scrollY };
      });
      if (moved.after === moved.before) {
        throw new Error(
          `the fixture cannot scroll (scrollY stuck at ${moved.before}) — the assertion would be vacuous`,
        );
      }

      await expect(page.locator(adapter.panel)).toHaveCount(0);
    });

    test('scroll inside the panel leaves it open', async ({ page }) => {
      await gotoHost(page, adapter);
      await openAndEnter(page, adapter);

      // The panel's own scrollport. A `scroll` event does not bubble, but the
      // components listen on `window` with capture, which still sees it — and
      // their handler exempts any target inside the panel.
      await page.locator(adapter.panel).evaluate((panel) => {
        panel.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(50);

      await expect(page.locator(adapter.panel)).toBeVisible();
    });

    test('destroying the open panel removes every global listener', async ({ page }) => {
      // Counted on the page itself: every add on `window`/`document` of the
      // three types the popups use, minus every matching remove. The baseline is
      // read BEFORE the panel is ever opened, and the panel is then destroyed
      // while still open, so a cleanup that only runs on close cannot pass.
      await gotoHost(page, adapter);
      const before = await page.evaluate(() => window.__listenerLedger());
      expect(
        POPUP_GLOBALS.reduce((total, key) => total + before[key], 0),
        'the app boots with none of the popup globals registered',
      ).toBe(0);

      await openAndEnter(page, adapter);
      const open = await page.evaluate(() => window.__listenerLedger());
      // Per key, not summed: a total of 3 also matches a panel that added
      // `scroll` twice and never registered `resize`, and that panel leaks and
      // mis-listens while this assertion still reads "exactly three".
      expect(
        POPUP_GLOBALS.map((key) => `${key}=${open[key]}`).join(' '),
        'an open panel registers each of pointerdown + scroll + resize exactly once',
      ).toBe(POPUP_GLOBALS.map((key) => `${key}=1`).join(' '));

      // A route change destroys the component. The panel never gets a chance to
      // close itself, so only the effect cleanup can release the listeners.
      // `__probeMarker` is the guard against the vacuous pass this test would
      // otherwise have: a full page load resets the ledger to zero and looks
      // exactly like a clean cleanup, so the marker has to survive the jump.
      // The click is dispatched inside the page because Playwright would scroll
      // the nav link into view first, and that scroll would close the panel —
      // testing the close path while claiming to test the destroy path.
      await expect(page.locator(adapter.panel)).toBeVisible();
      await page.evaluate(() => {
        (window as unknown as Record<string, unknown>).__probeMarker = 'alive';
        const link = document.querySelector('nav a[href="/basic"]') as HTMLAnchorElement | null;
        if (!link) throw new Error('the fixture has no in-app link to navigate with');
        link.click();
      });
      await expect(page).toHaveURL(/\/basic$/);
      await expect(page.locator(adapter.root)).toHaveCount(0);
      expect(
        await page.evaluate(() => (window as unknown as Record<string, unknown>).__probeMarker),
        'an in-app navigation must not reload the page',
      ).toBe('alive');
      await page.waitForTimeout(50);

      expect(await page.evaluate(() => window.__listenerLedger())).toEqual(before);
    });

    if (adapter.editable) {
      test('a height-only resize while its filter has focus keeps the panel open', async ({
        page,
      }) => {
        // S4: the on-screen keyboard shrinks the viewport height without
        // changing a word about where the panel is anchored. Closing then would
        // take the filter away from the user mid-word.
        await gotoHost(page, adapter);
        await openAndEnter(page, adapter);
        await page.locator(adapter.editable!).focus();
        const size = page.viewportSize();
        if (!size) throw new Error('the test has no viewport to resize');

        await resizeViewport(page, size.width, size.height - 160);
        await expect(page.locator(adapter.panel)).toBeVisible();
      });
    } else {
      test('a height-only resize closes a panel that has nothing editable', async ({ page }) => {
        await gotoHost(page, adapter);
        await openAndEnter(page, adapter);
        const size = page.viewportSize();
        if (!size) throw new Error('the test has no viewport to resize');

        await resizeViewport(page, size.width, size.height - 160);
        await expect(page.locator(adapter.panel)).toHaveCount(0);
      });
    }

    test('a width change closes it, even with the filter focused', async ({ page }) => {
      // The exemption has to LOSE here: width is the axis the anchor sits on, so
      // the coordinates are stale no matter where the caret is. Without the
      // focus step this would pass even if the width check were deleted.
      await gotoHost(page, adapter);
      await openAndEnter(page, adapter);
      if (adapter.editable) await page.locator(adapter.editable).focus();
      const size = page.viewportSize();
      if (!size) throw new Error('the test has no viewport to resize');

      await resizeViewport(page, size.width - 120, size.height);
      await expect(page.locator(adapter.panel)).toHaveCount(0);
    });

    test('without the top layer it still opens, positions and picks', async ({ page }) => {
      // The flag is read once, when the component is constructed, so the
      // prototype has to lose the method before the app boots.
      await page.addInitScript(() => {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>).showPopover;
      });
      await gotoHost(page, adapter);
      await openAndEnter(page, adapter);

      await expect(page.locator(adapter.panel)).toBeVisible();
      const box = await page.locator(adapter.panel).boundingBox();
      const trigger = await page.locator(adapter.trigger).boundingBox();
      if (!box || !trigger) throw new Error('the fallback panel has no box to measure');
      // The absolute fallback still lands the panel against its trigger rather
      // than at the document origin.
      expect(Math.abs(box.x - trigger.x)).toBeLessThan(40);

      await page.keyboard.press('Enter');
      await expect(page.locator(adapter.panel)).toHaveCount(0);
    });
  });
}

declare global {
  interface Window {
    __listenerLedger(): Record<string, number>;
  }
}

/**
 * pnpm check:component-theme — S5b, proved in a browser against real components.
 *
 * `check:theme-dark` proves the THEME's own cascade on static documents. This
 * one proves the other half: that the shipped select, menu and i18n toggle read
 * those tokens, that `--rv-accent` reaches the three places D87 names, that
 * `forced-colors` replaces them with system colours, and — the claim that is
 * easiest to break and hardest to notice — that with no theme imported the
 * components look exactly as they did before the wiring.
 *
 * The apps under test are the real e2e fixtures (`dist/menu-e2e` and
 * `dist/i18n-e2e-csr`), so nothing here re-implements a component. Build them
 * first; the suite never builds:
 *
 *   npx ng build menu-e2e
 *   npx ng build i18n-e2e --configuration csr
 *
 * Two layers of checking:
 *
 *  1. EXPLICIT assertions per case — the value D87 promises, written down.
 *     They fail with the measured value, so a failure says what changed.
 *  2. SNAPSHOTS under scripts/fixtures/component-theme, one file per engine and
 *     case. The `light` snapshot is the identity proof: it was captured from
 *     the PRE-wiring CSS, and the procedure below re-derives it from those
 *     files at any time. If the two disagree, the wiring changed an unthemed
 *     page and the gate fails.
 *
 *     To re-derive (after a `--update` that touched `*-light.json`):
 *       git checkout <base> -- \
 *         projects/select/ui/src/lib/components/select/select-panel.css \
 *         projects/select/ui/src/lib/components/popup/select-popup.css \
 *         projects/menu/ui/src/lib/components/menu/menu-panel.css \
 *         projects/i18n/ui/src/lib/components/language-toggle/language-toggle.css
 *       pnpm build:select && pnpm build:menu && pnpm build:i18n
 *       npx ng build menu-e2e && npx ng build i18n-e2e --configuration csr
 *       node scripts/check-component-theme.mjs --update --only=light
 *       git diff --exit-code scripts/fixtures/component-theme
 *       git checkout HEAD -- <the same four files>            # restore
 *
 * Cases:
 *  - light          no theme imported; snapshot must equal the pre-change one.
 *  - dark           theme.css linked + data-rv-theme="dark"; all three libs.
 *  - dark-os        theme.css linked + prefers-color-scheme: dark; same values.
 *  - accent         theme.css + --rv-accent overridden; ring, indicator, toggle.
 *  - rtl            document direction rtl; the same snapshot fields.
 *  - forced-colors  system colours; Chromium only (Playwright emulates the
 *                   media feature there, and nowhere else reliably).
 *
 * `--update` rewrites the snapshots. The snapshot file name carries the engine,
 * because Chromium and Firefox serialise a few computed values differently by
 * design.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_DIR = join(ROOT, 'scripts', 'fixtures', 'component-theme');
const THEME_CSS = join(ROOT, 'projects', 'theme', 'styles', 'theme.css');

const APPS = [
  { name: 'menu', dir: join(ROOT, 'dist', 'menu-e2e', 'browser'), port: 4321 },
  { name: 'i18n', dir: join(ROOT, 'dist', 'i18n-e2e-csr', 'browser'), port: 4322 },
];

const TRIGGER_PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRadius'];
const PANEL_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRadius',
  'boxShadow',
  'direction',
];
const ROW_PROPS = ['color', 'backgroundColor', 'textAlign', 'direction', 'opacity'];
const OUTLINE_PROPS = ['outlineColor', 'outlineStyle', 'outlineWidth'];
const FOCUS_PROPS = [...ROW_PROPS, ...OUTLINE_PROPS];

/** The two dark paths must produce the same component colours. */
const assertDark = (measured) => {
  const plain = measured.menu.menu.panel;
  const toggle = measured.i18n.button;
  return [
    ['select panel is dark', measured.menu.premiumPanel.backgroundColor, 'rgb(22, 22, 22)'],
    ['select panel text is light', measured.menu.premiumPanel.color, 'rgb(242, 242, 242)'],
    ['menu panel is dark', plain.backgroundColor, 'rgb(22, 22, 22)'],
    ['menu panel text is light', plain.color, 'rgb(242, 242, 242)'],
    ['toggle is dark', toggle.backgroundColor, 'rgb(22, 22, 22)'],
    ['toggle text is light', toggle.color, 'rgb(242, 242, 242)'],
    ['premium trigger is dark', measured.menu.premiumTrigger.backgroundColor, 'rgb(22, 22, 22)'],
  ];
};

export const CASES = Object.freeze([
  {
    id: 'light',
    label: 'no theme imported',
    scheme: 'light',
    /**
     * The snapshot below is the identity proof: it was captured BEFORE the
     * accent wiring and was re-derived from that CSS afterwards (the procedure
     * is in the header). These assertions say WHY it must not drift: with no
     * theme there is no `--rv-accent`, so every wired surface falls back to
     * the ink it used before. A default such as `var(--rv-accent, #5b5bd6)`
     * would pass the snapshot's absence test on a fresh checkout but fail
     * here.
     */
    assert: (measured) => {
      const simple = measured.menu.simple;
      return [
        ['no-theme check mark keeps the row ink', simple.check.color, simple.row.color],
        // The tick off the active row keeps the muted token (0.7.x: #555555).
        ['no-theme idle tick keeps the muted ink', simple.checkIdle.color, 'rgb(85, 85, 85)'],
        // Hovering activates the row, so this is the pointer's normal state.
        // 8% of the row ink is exactly what 0.7.x painted there.
        [
          'no-theme hovered active row keeps the 8% ink',
          simple.activeHover.backgroundColor,
          'color(srgb 0.0666667 0.0666667 0.0666667 / 0.08)',
        ],
        ['no-theme row ring keeps the row ink', simple.active.outlineColor, simple.row.color],
        // Premium has a hover rule of its own at the same specificity as its
        // active-row rule: with no theme the pointer must not shift the tint.
        [
          'no-theme premium active row keeps its tint under the pointer',
          measured.menu.premiumActiveHover.backgroundColor,
          measured.menu.premiumActive.backgroundColor,
        ],
        [
          'no-theme menu row ring keeps the row ink',
          measured.menu.menu.active.outlineColor,
          simple.row.color,
        ],
        [
          'no-theme toggle ring keeps its ink',
          measured.i18n.focus.outlineColor,
          measured.i18n.button.color,
        ],
      ];
    },
  },
  {
    id: 'dark',
    label: 'theme.css + data-rv-theme=dark',
    scheme: 'light',
    theme: true,
    htmlAttrs: { 'data-rv-theme': 'dark' },
    assert: assertDark,
  },
  {
    id: 'dark-os',
    label: 'theme.css + prefers-color-scheme: dark',
    scheme: 'dark',
    theme: true,
    assert: assertDark,
  },
  {
    id: 'accent',
    label: 'theme.css + --rv-accent override',
    scheme: 'light',
    theme: true,
    accent: 'rgb(1, 2, 3)',
    assert: (measured) => {
      const simple = measured.menu.simple;
      const probes = measured.probes;
      return [
        ['select check mark', simple.check.color, 'rgb(1, 2, 3)'],
        ['select row ring', simple.active.outlineColor, 'rgb(1, 2, 3)'],
        ['select active row', simple.active.backgroundColor, probes.rowActive],
        // Hover activates the row, and the hover wash used to win over the
        // accent. The probe evaluates the 8% accent mix independently, so a
        // component that let `currentColor` win reads as an ink mix here.
        [
          'select active row under the pointer',
          simple.activeHover.backgroundColor,
          probes.rowActiveHover,
        ],
        ['select search ring', simple.search.outlineColor, 'rgb(1, 2, 3)'],
        ['premium trigger ring', measured.menu.premiumTrigger.outlineColor, 'rgb(1, 2, 3)'],
        // Premium's active tint is the 7% mix, and its own hover rule is the
        // same specificity, so both readings must land on the accent.
        [
          'premium active row',
          measured.menu.premiumActive.backgroundColor,
          probes.rowPremiumActive,
        ],
        [
          'premium active row under the pointer',
          measured.menu.premiumActiveHover.backgroundColor,
          probes.rowPremiumActive,
        ],
        ['menu row ring', measured.menu.menu.active.outlineColor, 'rgb(1, 2, 3)'],
        ['menu active row', measured.menu.menu.active.backgroundColor, probes.rowActive],
        ['toggle ring', measured.i18n.focus.outlineColor, 'rgb(1, 2, 3)'],
        // The :active mix is 16% accent over the button's own fill. The expected
        // value comes from an independent declaration with the same formula: a
        // component that kept `currentColor` cannot produce this number.
        ['toggle active fill', measured.i18n.active.backgroundColor, probes.toggleActive],
      ];
    },
  },
  {
    id: 'rtl',
    label: 'document direction rtl',
    scheme: 'light',
    documentDir: 'rtl',
    assert: (measured) => [
      ['rtl select panel direction', measured.menu.simple.panel.direction, 'rtl'],
      ['rtl select row text-align', measured.menu.simple.row.textAlign, 'start'],
      ['rtl toggle host direction', measured.i18n.host.direction, 'rtl'],
    ],
  },
  {
    id: 'forced-colors',
    label: 'forced colors',
    scheme: 'light',
    forcedColors: 'active',
    engines: ['chromium'],
    assert: (measured) => {
      const probe = measured.fcProbe;
      const panel = measured.menu.simple.panel;
      const active = measured.menu.simple.active;
      const disabled = measured.menu.simple.disabled;
      const menuActive = measured.menu.menu.active;
      const menuPanel = measured.menu.menu.panel;
      const toggle = measured.i18n.button;
      return [
        ['select panel background', panel.backgroundColor, probe.canvas],
        ['select panel text', panel.color, probe.canvasText],
        ['select panel shadow', panel.boxShadow, 'none'],
        // The discriminating reading: this probe declares a shadow and belongs
        // to no component, so `none` here is the UA forcing it away — the panels
        // reading `none` would look the same whether or not the UA did anything,
        // because their forced blocks declare it. That is why the explicit
        // `box-shadow: none` only backstops engines this suite cannot emulate.
        ['forced colors forces an author shadow', probe.authorShadow, 'none'],
        // The premium panel declares a two-layer shadow normally.
        ['select premium panel shadow', measured.menu.premiumPanel.boxShadow, 'none'],
        ['select active row background', active.backgroundColor, probe.highlight],
        ['select active row text', active.color, probe.highlightText],
        // The tick carries an accent rule at (0,3,1)/(0,4,1); if the forced
        // rules lose it, Chromium paints white on white.
        ['select tick on the band', measured.menu.simple.check.color, probe.highlightText],
        // A Highlight ring on the Highlight band is invisible.
        ['select active row ring', active.outlineColor, probe.canvasText],
        ['select disabled row', disabled.color, probe.grayText],
        [
          'select premium trigger background',
          measured.menu.premiumTrigger.backgroundColor,
          probe.canvas,
        ],
        ['select premium trigger text', measured.menu.premiumTrigger.color, probe.canvasText],
        ['select search background', measured.menu.simple.searchFill.backgroundColor, probe.canvas],
        ['select search text', measured.menu.simple.searchFill.color, probe.canvasText],
        ['menu panel background', menuPanel.backgroundColor, probe.canvas],
        ['menu panel text', menuPanel.color, probe.canvasText],
        ['menu active row background', menuActive.backgroundColor, probe.highlight],
        ['menu active row text', menuActive.color, probe.highlightText],
        ['menu active row ring', menuActive.outlineColor, probe.canvasText],
        ['toggle background', toggle.backgroundColor, probe.canvas],
        ['toggle text', toggle.color, probe.canvasText],
        ['toggle held fill', measured.i18n.active.backgroundColor, probe.highlight],
        ['toggle held text', measured.i18n.active.color, probe.highlightText],
      ];
    },
  },
]);

function styles(page, selector, props) {
  return page.evaluate(
    ({ selector, props }) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`missing ${selector}`);
      const computed = getComputedStyle(element);
      return Object.fromEntries(props.map((prop) => [prop, computed[prop]]));
    },
    { selector, props },
  );
}

function activeStyles(page, props) {
  return page.evaluate((props) => {
    const element = document.activeElement;
    if (!element || element === document.body) throw new Error('nothing is focused');
    const computed = getComputedStyle(element);
    return {
      ...Object.fromEntries(props.map((prop) => [prop, computed[prop]])),
      focusVisible: element.matches(':focus-visible'),
      row: element.getAttribute('rvselectpopupitem') !== null ? 'select' : 'menu',
      disabled: element.getAttribute('aria-disabled') === 'true',
    };
  }, props);
}

async function focusVisible(page, selector) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  // Any keydown puts the engine in keyboard modality; a programmatic focus
  // after it matches :focus-visible in Chromium. Firefox additionally needs
  // the focus to come FROM traversal, so it gets a Shift+Tab / Tab round trip.
  await page.keyboard.press('Shift');
  await locator.focus();
  if (await locator.evaluate((element) => element.matches(':focus-visible'))) return;
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const state = await locator.evaluate((element) => ({
    focused: element === document.activeElement,
    visible: element.matches(':focus-visible'),
  }));
  if (!state.focused || !state.visible) throw new Error(`${selector} did not match :focus-visible`);
}

/**
 * Scroll events are dispatched at the next animation frame. The popup closes
 * on an outside scroll by design, so a Playwright-driven scroll (focus,
 * scrollIntoViewIfNeeded, click auto-scroll) must be allowed to fire BEFORE
 * the panel opens — otherwise its own setup closes it a frame later.
 *
 * The same wait is needed between a panel opening and the first key press:
 * a key dispatched in the panel's opening frame is lost. Measured on the
 * select's reopen path (fresh Chromium page, `waitFor(panel)` then
 * ArrowDown): pressing immediately left `data-active` on the old row for the
 * whole 400 ms observation, while pressing one frame later moved both focus
 * and the attribute every time. Two frames cover the scroll event and the
 * opening render.
 */
function settleFrame(page) {
  return page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/**
 * Premium rows animate `background-color` (150ms in, 250ms out), so a read two
 * frames after the pointer moves lands mid-transition. Poll until the value
 * stops changing: the reading is then the state the row settles into, and a
 * hover that never settles fails with the last value it held.
 */
async function settledStyles(page, selector, props) {
  let previous = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = await styles(page, selector, props);
    if (previous && JSON.stringify(previous) === JSON.stringify(current)) return current;
    previous = current;
    await page.waitForTimeout(50);
  }
  throw new Error(`${selector} never stops changing: ${JSON.stringify(previous)}`);
}

/**
 * Change detection writes `data-active` after the key handler has already
 * moved focus, so a read in the same task can see the previous row. Wait for
 * the attribute instead of assuming a flush order. A panel that unmounted
 * (an outside scroll closed it) never reaches the state; the failure then
 * dumps the page state instead of a bare timeout.
 */
async function waitForActiveRow(page, kind) {
  try {
    await page.waitForFunction(
      (kind) => {
        const element = document.activeElement;
        if (!element) return false;
        const row = element.getAttribute('rvselectpopupitem') !== null ? 'select' : 'menu';
        return row === kind && element.getAttribute('data-active') === 'true';
      },
      kind,
      { timeout: 3000 },
    );
  } catch (error) {
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      const rowOf = (node) =>
        node && node.getAttribute('rvselectpopupitem') !== null ? 'select' : 'menu';
      return {
        activeTag: element ? element.tagName : null,
        activeClass: element ? element.className : null,
        activeId: element ? element.getAttribute('data-rv-id') : null,
        activeRow: rowOf(element),
        activeDataActive: element ? element.getAttribute('data-active') : null,
        panels: document.querySelectorAll('.rv-select-popup-panel, .rv-menu-panel').length,
        rows: [...document.querySelectorAll('[rvselectpopupitem], [rvmenuitem]')].map((item) => ({
          id: item.getAttribute('data-rv-id'),
          active: item.getAttribute('data-active'),
          focused: item === element,
        })),
        scrollTop: document.scrollingElement ? document.scrollingElement.scrollTop : null,
      };
    });
    throw new Error(`${kind} never became the active row: ${JSON.stringify(state, null, 2)}`, {
      cause: error,
    });
  }
}

async function setDocumentDir(page, dir) {
  if (!dir) return;
  await page.evaluate((value) => {
    document.documentElement.dir = value;
  }, dir);
}

async function measureMenu(page, testCase) {
  await page.goto(`http://127.0.0.1:${APPS[0].port}/select`);
  const trigger = page.locator('#single-select .rv-select-trigger');
  await trigger.waitFor();
  // After load: the app may set the document direction on boot.
  await setDocumentDir(page, testCase.documentDir);

  // Pick a row so the check mark exists, then reopen with the keyboard. The
  // keyboard matters: the row's ring is asserted against :focus-visible.
  await trigger.scrollIntoViewIfNeeded();
  await settleFrame(page);
  await trigger.click();
  await page.locator('#single-select .rv-select-popup-menu').waitFor();
  await page.locator('#single-select [rvselectpopupitem]', { hasText: 'Paid' }).click();
  await page.locator('#single-select .rv-select-popup-panel').waitFor({ state: 'detached' });

  await focusVisible(page, '#single-select .rv-select-trigger');
  await settleFrame(page);
  await page.keyboard.press('Enter');
  await page.locator('#single-select .rv-select-popup-panel').waitFor();
  // Let the opening render commit: a key in that frame would be lost (see
  // settleFrame).
  await settleFrame(page);

  // The searchable select focuses its filter box on open (afterRenderEffect).
  // Do NOT click it: Playwright's click auto-scrolls, and this popup closes on
  // an outside scroll by design, so the click could unmount the panel between
  // measurements. The ring assertions below need the box focus-visible, which
  // the keyboard-open already made true; assert it rather than assume it.
  const focusedSearch = await page.evaluate(() => {
    const box = document.querySelector('#single-select .rv-select-search');
    return !!box && box === document.activeElement && box.matches(':focus-visible');
  });
  if (!focusedSearch) throw new Error('the search box was not keyboard-focused on open');
  const simple = {
    trigger: await styles(page, '#single-select .rv-select-trigger', TRIGGER_PROPS),
    panel: await styles(page, '#single-select .rv-select-popup-panel', PANEL_PROPS),
    row: await styles(page, '#single-select [rvselectpopupitem]', ROW_PROPS),
    check: await styles(page, '#single-select .rv-select-check', ['color']),
    disabled: await styles(
      page,
      '#single-select [rvselectpopupitem][aria-disabled="true"]',
      ROW_PROPS,
    ),
    search: await styles(page, '#single-select .rv-select-search', OUTLINE_PROPS),
  };
  // Reopening activates the selected row ("Paid"), so one press moves the
  // active row to the first enabled option ("Outstanding", wrapping past the
  // disabled one): the tick's row is then off-active and the row that carries
  // the ring is not the selected one, which is what the light case pins.
  await page.keyboard.press('ArrowDown');
  await waitForActiveRow(page, 'select');
  simple.active = await activeStyles(page, FOCUS_PROPS);
  if (simple.active.row !== 'select') throw new Error('ArrowDown left the select rows');
  if (!simple.active.focusVisible) throw new Error('the active select row is not :focus-visible');
  if (simple.active.disabled) throw new Error('the active select row is disabled');
  // The tick now sits on a row that is NOT active: its pre-wiring ink was the
  // muted token, not the row's colour. This is what the `light` case pins.
  simple.checkIdle = await styles(page, '#single-select .rv-select-check', ['color']);
  // Hover ACTIVATES the row, so this is the state a pointer lives in, and the
  // hover wash used to paint over the active tint here. Move the mouse instead
  // of calling `hover()`: Playwright's hover scrolls the row into view and an
  // outside scroll closes this popup by design.
  const activeRow = page.locator('#single-select [rvselectpopupitem][data-active="true"]');
  const activeBox = await activeRow.boundingBox();
  if (!activeBox) throw new Error('the active select row has no box to hover');
  await page.mouse.move(activeBox.x + activeBox.width / 2, activeBox.y + activeBox.height / 2);
  await settleFrame(page);
  simple.activeHover = await styles(
    page,
    '#single-select [rvselectpopupitem][data-active="true"]',
    ['backgroundColor'],
  );
  // Park the pointer outside the panel so nothing after this reads a hover.
  await page.mouse.move(0, 0);
  await settleFrame(page);
  if (testCase.forcedColors) {
    // Measured only here so the other snapshots keep their captured shape.
    simple.searchFill = await styles(page, '#single-select .rv-select-search', [
      'backgroundColor',
      'color',
    ]);
  }
  await page.keyboard.press('Escape');

  await page.locator('#premium-select .rv-select-trigger').scrollIntoViewIfNeeded();
  await focusVisible(page, '#premium-select .rv-select-trigger');
  await settleFrame(page);
  const premiumTrigger = await styles(page, '#premium-select .rv-select-trigger', [
    ...TRIGGER_PROPS,
    ...OUTLINE_PROPS,
  ]);
  // Unscoped on purpose: #single-select lives inside `.select-scope`, whose
  // `--rv-select-bg` is a component token and must keep winning.
  await page.keyboard.press('Enter');
  await page.locator('#premium-select .rv-select-popup-panel').waitFor();
  await settleFrame(page);
  const premiumPanel = await styles(page, '#premium-select .rv-select-popup-panel', PANEL_PROPS);
  // Premium declares its OWN hover rule at (0,4,1) — the same specificity as its
  // active-row rule — so whether the accent tint survives the pointer there is
  // decided by source order alone. That is a thing to measure, not to argue.
  await page.locator('#premium-select [rvselectpopupitem][data-active="true"]').waitFor();
  const premiumActiveSelector = '#premium-select [rvselectpopupitem][data-active="true"]';
  const premiumActive = await settledStyles(page, premiumActiveSelector, ['backgroundColor']);
  const premiumBox = await page.locator(premiumActiveSelector).boundingBox();
  if (!premiumBox) throw new Error('the active premium row has no box to hover');
  await page.mouse.move(premiumBox.x + premiumBox.width / 2, premiumBox.y + premiumBox.height / 2);
  const premiumActiveHover = await settledStyles(page, premiumActiveSelector, ['backgroundColor']);
  await page.mouse.move(0, 0);
  await settleFrame(page);
  await page.keyboard.press('Escape');

  await focusVisible(page, '#plain-menu .rv-menu-trigger button');
  await settleFrame(page);
  await page.keyboard.press('Enter');
  await page.locator('#plain-menu .rv-menu-panel').waitFor();
  await settleFrame(page);
  const menu = {
    panel: await styles(page, '#plain-menu .rv-menu-panel', PANEL_PROPS),
    row: await styles(page, '#plain-menu [rvmenuitem]', ROW_PROPS),
  };
  await page.keyboard.press('ArrowDown');
  await waitForActiveRow(page, 'menu');
  menu.active = await activeStyles(page, FOCUS_PROPS);
  if (menu.active.row !== 'menu') throw new Error('ArrowDown left the menu rows');
  if (!menu.active.focusVisible) throw new Error('the active menu row is not :focus-visible');
  await page.keyboard.press('Escape');

  const rtlTrigger = page.locator('#rtl-select .rv-select-trigger');
  await rtlTrigger.scrollIntoViewIfNeeded();
  await settleFrame(page);
  await rtlTrigger.click();
  await page.locator('#rtl-select .rv-select-popup-panel').waitFor();
  await settleFrame(page);
  const rtl = {
    panel: await styles(page, '#rtl-select .rv-select-popup-panel', PANEL_PROPS),
    row: await styles(page, '#rtl-select [rvselectpopupitem]', ROW_PROPS),
  };
  await page.keyboard.press('Escape');

  return { simple, premiumTrigger, premiumPanel, premiumActive, premiumActiveHover, menu, rtl };
}

async function measureToggle(page, testCase) {
  await page.goto(`http://127.0.0.1:${APPS[1].port}/toggle`);
  const button = page.locator('.rv-language-toggle__button').first();
  await button.waitFor();
  await setDocumentDir(page, testCase.documentDir);

  const result = {
    host: await styles(page, 'rv-language-toggle', ['direction']),
    button: await styles(page, '.rv-language-toggle__button', [
      ...TRIGGER_PROPS,
      'boxShadow',
      'direction',
    ]),
  };
  await focusVisible(page, '.rv-language-toggle__button');
  result.focus = await styles(page, '.rv-language-toggle__button', OUTLINE_PROPS);

  // `:active` only exists while the button is held down.
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  result.active = await styles(page, '.rv-language-toggle__button', ['backgroundColor', 'color']);
  await page.mouse.up();
  return result;
}

/**
 * The expected accent tints, computed by the engine from an independent
 * declaration. Comparing against a hard-coded serialisation would pin the
 * engine's colour syntax (Chromium writes `color(srgb … / 0.1)` for a mix);
 * comparing against this probe pins the VALUE the component is supposed to
 * derive from `--rv-accent`, which is the claim under test.
 */
function measureAccentProbes(page) {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const read = (background) => {
      probe.style.background = background;
      return getComputedStyle(probe).backgroundColor;
    };
    const value = {
      rowActive: read('color-mix(in srgb, var(--rv-accent, currentColor) 10%, transparent)'),
      rowActiveHover: read('color-mix(in srgb, var(--rv-accent, currentColor) 8%, transparent)'),
      rowPremiumActive: read('color-mix(in srgb, var(--rv-accent, currentColor) 7%, transparent)'),
      toggleActive: read(
        'color-mix(in srgb, var(--rv-accent, currentColor) 16%, var(--rv-i18n-toggle-bg, var(--rv-bg, transparent)))',
      ),
    };
    probe.remove();
    return value;
  });
}

function measureForcedColorProbe(page) {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden';
    probe.innerHTML =
      '<i style="background:Canvas"></i><i style="background:Highlight;color:HighlightText"></i>' +
      '<i style="color:CanvasText"></i><i style="color:GrayText"></i>' +
      // A shadow declared by this gate, on an element no component owns: the
      // reading is the UA's doing alone, which is the only way to tell it apart
      // from the `box-shadow: none` the components themselves declare.
      '<i style="box-shadow:0 12px 32px -8px rgba(16, 24, 40, 0.18)"></i>';
    document.body.append(probe);
    const [canvas, highlight, canvasText, grayText, authorShadow] = probe.children;
    const value = {
      canvas: getComputedStyle(canvas).backgroundColor,
      highlight: getComputedStyle(highlight).backgroundColor,
      highlightText: getComputedStyle(highlight).color,
      canvasText: getComputedStyle(canvasText).color,
      grayText: getComputedStyle(grayText).color,
      authorShadow: getComputedStyle(authorShadow).boxShadow,
    };
    probe.remove();
    return value;
  });
}

function waitForServer(url, child) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      if (child.exitCode !== null) {
        reject(new Error(`server exited with ${child.exitCode}: ${url}`));
        return;
      }
      try {
        const response = await fetch(url);
        if (response.ok) return resolve();
      } catch {
        // not listening yet
      }
      if (Date.now() - started > 20_000) return reject(new Error(`server never answered: ${url}`));
      setTimeout(tick, 100);
    };
    tick();
  });
}

function snapshotPath(engine, testCase) {
  return join(SNAPSHOT_DIR, `${engine}-${testCase.id}.json`);
}

function stable(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

export async function run({
  engines = ['chromium', 'firefox'],
  cases = CASES,
  update = false,
  log = console.log,
} = {}) {
  for (const app of APPS) {
    if (!existsSync(app.dir)) {
      throw new Error(`missing ${app.dir} — build it first (see the header of this file)`);
    }
  }
  if (update) mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const themeCss = readFileSync(THEME_CSS, 'utf8');
  const { chromium, firefox } = await import('@playwright/test');
  const available = { chromium, firefox };
  const servers = APPS.map((app) =>
    spawn(process.execPath, ['e2e/serve.mjs', app.dir, String(app.port)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
  const failures = [];
  try {
    await Promise.all(
      APPS.map((app, index) => waitForServer(`http://127.0.0.1:${app.port}/`, servers[index])),
    );
    for (const engineName of engines) {
      const browser = await available[engineName].launch();
      try {
        for (const testCase of cases) {
          if (testCase.engines && !testCase.engines.includes(engineName)) continue;
          const context = await browser.newContext({
            colorScheme: testCase.scheme,
            ...(testCase.forcedColors ? { forcedColors: testCase.forcedColors } : {}),
          });
          const page = await context.newPage();
          if (testCase.htmlAttrs) {
            await page.addInitScript((attrs) => {
              // The document element does not exist yet when an init script runs.
              const apply = () => {
                for (const [name, value] of Object.entries(attrs)) {
                  document.documentElement.setAttribute(name, value);
                }
              };
              if (document.documentElement) apply();
              else document.addEventListener('readystatechange', apply, { once: true });
            }, testCase.htmlAttrs);
          }
          if (testCase.theme) {
            // The same file a consumer imports. Appended on DOMContentLoaded,
            // after the app's own stylesheet and before the lazy component
            // styles; the layer is what makes that order irrelevant.
            await page.addInitScript((css) => {
              document.addEventListener('DOMContentLoaded', () => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.append(style);
              });
            }, themeCss);
          }
          if (testCase.accent) {
            await page.addInitScript((accent) => {
              document.addEventListener('DOMContentLoaded', () => {
                document.documentElement.style.setProperty('--rv-accent', accent);
              });
            }, testCase.accent);
          }

          const measured = {
            menu: await measureMenu(page, testCase),
            i18n: await measureToggle(page, testCase),
          };
          if (testCase.forcedColors) measured.fcProbe = await measureForcedColorProbe(page);
          if (testCase.accent) measured.probes = await measureAccentProbes(page);
          await context.close();

          const checks = testCase.assert ? testCase.assert(measured) : [];
          const failed = checks.filter(([, actual, expected]) => actual !== expected);
          for (const [name, actual, expected] of failed) {
            failures.push(
              `${engineName}/${testCase.id}: ${name} — got ${actual}, expected ${expected}`,
            );
          }

          const file = snapshotPath(engineName, testCase);
          const serialised = stable(measured);
          if (update) {
            writeFileSync(file, serialised);
          } else if (!existsSync(file)) {
            failures.push(`${engineName}/${testCase.id}: no snapshot at ${file}; run --update`);
          } else if (readFileSync(file, 'utf8') !== serialised) {
            failures.push(`${engineName}/${testCase.id}: snapshot drifted (${file})`);
          }

          if (failed.length) {
            log(`FAIL ${engineName.padEnd(8)} ${testCase.label}`);
            for (const [name, actual, expected] of failed) {
              log(`     ${name}: got ${actual}, expected ${expected}`);
            }
          } else {
            log(`PASS ${engineName.padEnd(8)} ${testCase.label}`);
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    for (const server of servers) server.kill();
  }
  return failures;
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) {
  const update = process.argv.includes('--update');
  const only = process.argv.find((argument) => argument.startsWith('--only='))?.split('=')[1];
  const cases = only ? CASES.filter((testCase) => only.split(',').includes(testCase.id)) : CASES;
  if (only && cases.length !== only.split(',').length) {
    console.error(`check:component-theme — unknown case in --only=${only}`);
    process.exit(1);
  }
  const failures = await run({ cases, update });
  if (failures.length) {
    console.error(`check:component-theme — ${failures.length} failure(s)`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log('check:component-theme — ok');
}

import { expect, test, type ConsoleMessage } from '@playwright/test';

/**
 * Every test in this file also enforces "zero console errors": the listeners
 * are attached before the app boots, so a failed dictionary fetch, a hydration
 * mismatch or an uncaught exception fails the test that caused it rather than
 * a separate smoke test that might pass for the wrong reason.
 */
const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
});

test.afterEach(() => {
  expect(consoleErrors, 'console.error output').toEqual([]);
  expect(pageErrors, 'uncaught page errors').toEqual([]);
});

const AR = {
  title: 'ريفينيا للتعريب',
  hero: 'مدير لغات واحد لكل اللغات',
  plural: ['لا عناصر', 'عنصر واحد', 'عنصران', '٣ عناصر', '١١ عنصرًا', '١٠٠ عنصر'],
  compact: ['لا عناصر', 'عنصر واحد', 'عنصران', '٣ عناصر', '١١ عنصرًا', '١٠٠ عنصر'],
} as const;

const EN = {
  title: 'Rivinia i18n',
  hero: 'One language manager, every locale',
  plural: ['No items', '1 item', '2 items', '3 items', '11 items', '100 items'],
  compact: ['none', '1 item', '2 items', '3 items', '11 items', '100 items'],
  ordinal: ['1st', '2nd', '3rd', '4th', '11th', '21st'],
} as const;

test.describe('first load', () => {
  test('renders Arabic, RTL, and not a single raw key', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('app-title')).toHaveText(AR.title);
    await expect(page.getByTestId('hero')).toHaveText(AR.hero);
    await expect(page.getByTestId('state')).toContainText('ar · rtl · idle');

    // The loader finished before first paint (app initializer), so no key can
    // have been rendered as its own name.
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('home.hero');
    expect(body).not.toContain('icu.items');
    expect(body).not.toContain('app.title');
  });

  test('the default loader fetched the conventional public/i18n path', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.json')) requests.push(new URL(request.url()).pathname);
    });

    await page.goto('/');
    await expect(page.getByTestId('app-title')).toHaveText(AR.title);

    expect(requests).toContain('/i18n/ar.json');
    // The fallback dictionary is loaded in the background, in parallel.
    expect(requests).toContain('/i18n/en.json');
  });
});

test.describe('language switch', () => {
  test('switching to English changes the copy, lang, dir and persists across reloads', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('app-title')).toHaveText(EN.title);
    await expect(page.getByTestId('hero')).toHaveText(EN.hero);
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('lang-ar')).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('app-title')).toHaveText(EN.title);
  });

  test('switching back to Arabic restores RTL and the Arabic copy', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('app-title')).toHaveText(EN.title);

    await page.getByTestId('lang-ar').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('app-title')).toHaveText(AR.title);
  });
});

test.describe('ICU in a real browser', () => {
  test('Arabic plural categories: zero, one, two, few, many, other', async ({ page }) => {
    await page.goto('/');
    const rows = page.getByTestId('plural').locator('li');
    await expect(rows).toHaveCount(6);
    await expect(rows).toHaveText([...AR.plural]);
  });

  test('English plural categories, with =0 winning over `other`', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('plural').locator('li')).toHaveText([...EN.plural]);
  });

  test('compact ICU from translation tools renders (no space before `{`)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('compact-plural').locator('li')).toHaveText([
      ...EN.compact,
    ]);

    await page.getByTestId('lang-ar').click();
    await expect(page.getByTestId('compact-plural').locator('li')).toHaveText([
      ...AR.compact,
    ]);
  });

  test('ordinals use the locale ordinal rules', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('ordinal').locator('li')).toHaveText([...EN.ordinal]);

    // Arabic has a single ordinal category (`other`), so the `other` branch is
    // the correct result — the point is that the CATEGORY is locale-driven.
    await page.getByTestId('lang-ar').click();
    await expect(page.getByTestId('ordinal').locator('li').first()).toHaveText('١th');
  });

  test('plural offset: the category sees value - offset, =N sees the raw value', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('guests').locator('li')).toHaveText([
      'Nobody',
      'Only you',
      'You and 1 other',
      'You and 2 others',
    ]);
  });

  test('numbers and dates are formatted by the active locale', async ({ page }) => {
    await page.goto('/');

    // Arabic-Indic digits, Arabic separators, and the bidi marks Intl emits.
    await expect(page.getByTestId('amount')).toContainText('١٬٢٣٤٫٥٠');
    await expect(page.getByTestId('amount')).toContainText('US$');
    await expect(page.getByTestId('ratio')).toContainText('٢٦٪');
    await expect(page.getByTestId('day')).toHaveText('٢٥ أكتوبر ٢٠٢٦');

    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('amount')).toHaveText('US$1,234.50');
    await expect(page.getByTestId('ratio')).toHaveText('26%');
    await expect(page.getByTestId('day')).toHaveText('25 October 2026');
  });
});

test.describe('fallback and missing keys', () => {
  test('a key missing from Arabic resolves from the English fallback dictionary', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByTestId('fallback-text')).toHaveText('English-only fallback text');
  });

  test('a key in neither dictionary renders the key and is reported once', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('missing-text')).toHaveText('missing.nowhere');
    await expect(page.getByTestId('missing-count')).toHaveText('1');
    await expect(page.getByTestId('missing-list').locator('li')).toHaveText(['missing.nowhere']);

    // A re-render must not report it again (once per key per session).
    await page.getByTestId('lang-en').click();
    await page.getByTestId('lang-ar').click();
    await expect(page.getByTestId('missing-count')).toHaveText('1');
  });
});

test.describe('t() signal', () => {
  test('re-renders when the signal read by its params function changes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('live')).toHaveText('تحديث واحد');

    await page.getByTestId('bump').click();
    await expect(page.getByTestId('live')).toHaveText('تحديثان');

    await page.getByTestId('bump').click();
    await expect(page.getByTestId('live')).toHaveText('٣ تحديثات');
  });

  test('re-renders on a language switch, keeping the current params', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('bump').click();
    await page.getByTestId('bump').click();
    await expect(page.getByTestId('live')).toHaveText('٣ تحديثات');

    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('live')).toHaveText('3 live updates');
  });
});

import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * The i18n suite runs against a CLIENT-SIDE build (`--configuration csr`) on
 * 4301, so the browser really executes the default `jsonLoader()` fetch,
 * `localStorage` persistence and the client-side language switch.
 *
 * The SSR proof is `e2e/ssr-smoke.mjs` (raw HTML + server logs + hydration),
 * because it also needs the server process's stdout, which a Playwright
 * `webServer` does not expose.
 *
 * Build first (the suite never builds):
 *   npx ng build i18n && npx ng build i18n-e2e --configuration csr
 */
const PORT = 4301;

function executable(variable: string, fallback?: string) {
  const path = process.env[variable] ?? fallback;
  return path && existsSync(path) ? { launchOptions: { executablePath: path } } : {};
}

/** System Chrome when it exists, so the real engine is covered locally. */
const systemChrome = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] ?? '/usr/bin/google-chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // The suite runs from the workspace root (`ng test`/`npx playwright test`
    // are both invoked there), so the shared static server is at `e2e/`.
    command: `node e2e/serve.mjs dist/i18n-e2e-csr/browser ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // A stale server serves an old bundle and masquerades as a product bug
    // (D37). Always start fresh; the build is a separate, documented step.
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: process.cwd(),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(existsSync(systemChrome)
      ? [
          {
            name: 'chrome',
            use: {
              ...devices['Desktop Chrome'],
              ...executable('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', systemChrome),
            },
          },
        ]
      : []),
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], ...executable('PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH') },
    },
    // WebKit and the system Firefox cannot launch in this environment (D39);
    // they are not defined here rather than defined and skipped silently.
  ],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4299',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.mjs dist/menu-e2e/browser 4299',
    url: 'http://127.0.0.1:4299',
    // A stale server silently serves an old bundle, which masquerades as
    // product bugs (measured: every arrow assertion reported 'inactive'
    // because the served app predated aria-controls/label). Always start
    // fresh; the build is a separate documented step.
    reuseExistingServer: false,
    timeout: 120000,
    cwd: process.cwd(),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: '/usr/bin/google-chrome' },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          executablePath:
            '/home/abdelfattahqandi/.cache/ms-playwright/firefox-1555/firefox/firefox',
        },
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

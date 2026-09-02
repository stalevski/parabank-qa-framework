import { defineConfig, devices } from '@playwright/test';
import { activeRegion } from './src/config/regions.config';

/**
 * Multi-region Playwright config for the ParaBank demo app.
 *
 * The active region is resolved once from the REGION env var (default `us`) in
 * `src/config/regions.config.ts`. Switching regions therefore requires no test
 * code changes — only configuration:
 *
 *   REGION=eu npx playwright test --project=parabank-api
 *
 * Web and API layers are independently runnable via `--project`, and run
 * together when `playwright test` is invoked without a project filter.
 *
 * ParaBank is a public shared demo with no state we own, so tests run with full
 * parallelism. Flakiness from the shared demo is expected and handled by CI
 * (`continue-on-error`), never by hiding it.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'parabank-web-chromium',
      testMatch: /tests\/parabank\/web\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: activeRegion.uiBaseUrl },
    },
    {
      name: 'parabank-web-firefox',
      testMatch: /tests\/parabank\/web\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], baseURL: activeRegion.uiBaseUrl },
    },
    {
      name: 'parabank-web-webkit',
      testMatch: /tests\/parabank\/web\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'], baseURL: activeRegion.uiBaseUrl },
    },
    {
      name: 'parabank-api',
      testMatch: /tests\/parabank\/api\/.*\.spec\.ts/,
      use: {
        baseURL: activeRegion.apiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
    {
      name: 'parabank-regions',
      testMatch: /tests\/parabank\/regions\.spec\.ts/,
    },
  ],
  outputDir: 'test-results',
});

import { defineConfig, devices } from '@playwright/test';
import { activeRegion } from './src/config/regions.config';

// Region comes from the REGION env var (see src/config/regions.config.ts);
// layers run independently via --project. Public demo → full parallelism; CI
// handles flakiness with continue-on-error.
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
      },
    },
    {
      name: 'parabank-regions',
      testMatch: /tests\/parabank\/regions\.spec\.ts/,
    },
  ],
  outputDir: 'test-results',
});

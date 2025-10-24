import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ClippyJS React testing
 *
 * Test types:
 * - Integration tests: tests/integration/**/*.spec.ts
 * - Visual tests: tests/visual/**/*.spec.ts
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: process.env.CI
    ? [['html'], ['github']]
    : [['html'], ['list']],

  /* Shared settings for all projects */
  use: {
    /* Base URL for tests */
    baseURL: 'http://localhost:6006', // Storybook

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Run Firefox and WebKit only in CI for critical tests
    ...(process.env.CI ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
        testMatch: /.*\.critical\.spec\.ts/, // Only critical tests
      },

      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
        testMatch: /.*\.critical\.spec\.ts/, // Only critical tests
      },
    ] : []),
  ],

  /* Run Storybook dev server before starting tests */
  webServer: {
    command: 'yarn workspace @clippyjs/storybook storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

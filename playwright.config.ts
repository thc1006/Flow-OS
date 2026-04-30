import { defineConfig, devices } from '@playwright/test';

// vite preview honours the build-time `base`. Tests must hit the project
// sub-path; override with PW_BASE_URL when serving from a different prefix.
const PW_BASE_URL = process.env.PW_BASE_URL ?? 'http://localhost:3000/Flow-OS/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: PW_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --port 3000',
    url: PW_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

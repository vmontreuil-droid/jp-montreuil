import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — minimaal: chromium + mobile chrome.
 *
 * Run lokaal:
 *   npx playwright install chromium
 *   npm run dev          # in 1 terminal
 *   npx playwright test  # in een andere
 *
 * Of via CI: zie README sectie "E2E".
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
})

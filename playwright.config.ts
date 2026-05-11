import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — chromium + mobile chrome.
 *
 * Lokaal:
 *   npx playwright install chromium
 *   npm run e2e        # auto-start van prod-server via webServer
 *
 * Tegen productie:
 *   E2E_BASE_URL=https://montreuil.be npx playwright test --project=chromium
 *
 * Dev-server vermijden — Turbopack compileert on-demand, wat 296
 * parallelle tests crippelt. We bouwen 1× (cached) en starten met
 * `next start` zodat alle routes warm zijn.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Beperk parallelisme tegen lokale prod-server (single Node process)
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  // Globale timeout per test
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Reuse als er al iets op port 3000 draait (bv. handmatige
        // dev-server). Anders: build + start cold.
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
})

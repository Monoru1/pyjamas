import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:3000' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000/panier',
    reuseExistingServer: false,
    env: { FEDAPAY_ENABLED: 'false', PAYMENT_CHECKOUT_ENABLED: 'false', ORDER_NOTIFICATIONS_ENABLED: 'false' },
  },
});

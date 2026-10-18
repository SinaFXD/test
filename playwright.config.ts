import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use the pre-installed Chromium when present (cloud dev containers); otherwise Playwright's own.
const localChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = existsSync(localChromium) ? { executablePath: localChromium } : {};

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Build with base "/" so the preview server serves the app at the root.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { VITE_BASE: '/' },
  },
});

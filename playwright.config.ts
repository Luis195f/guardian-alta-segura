import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) {
  for (const name of [
    "DATABASE_URL",
    "APP_BASE_URL",
    "DEMO_MODE",
    "DEMO_SESSION_TTL_HOURS",
    "SESSION_COOKIE_SECURE",
  ]) {
    delete process.env[name];
  }
  process.loadEnvFile(".env");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Playwright e2e");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    actionTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      testMatch: /foundation-ui\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "pnpm exec next dev --webpack --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_BASE_URL: "http://127.0.0.1:3000",
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "true",
      DEMO_SESSION_TTL_HOURS: "8",
      // Excepción exclusiva del servidor e2e sobre HTTP loopback.
      SESSION_COOKIE_SECURE: "false",
    },
  },
});

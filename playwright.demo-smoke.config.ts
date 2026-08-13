import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the isolated demo smoke test");
const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /demo-smoke\.p15\.ts/,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "off",
    actionTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec next dev --webpack --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...inheritedEnvironment,
      APP_BASE_URL: "http://127.0.0.1:3000",
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "true",
      DEMO_SESSION_TTL_HOURS: "8",
      CAREGIVER_DEMO_INVITATION_TTL_MINUTES: "30",
      CAREGIVER_DEMO_SESSION_TTL_HOURS: "8",
      SESSION_COOKIE_SECURE: "false",
      EXPLAINABLE_TRAFFIC_LIGHT: "false",
      COMMITMENT_ENGINE_ENABLED: "false",
    },
  },
});

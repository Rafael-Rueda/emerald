import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 6,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @emerald/docs dev -- --port 3100",
      port: 3100,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @emerald/workspace dev -- --port 3101",
      port: 3101,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

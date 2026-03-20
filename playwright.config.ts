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
      command: "pnpm storybook",
      port: 6100,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx next dev --port 3100",
      cwd: "./apps/docs",
      port: 3100,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx next dev --port 3101",
      cwd: "./apps/workspace",
      port: 3101,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

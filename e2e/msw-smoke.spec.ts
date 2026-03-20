import { test, expect } from "@playwright/test";

/**
 * Smoke test that verifies the docs app starts and serves a page.
 * MSW handlers run in the browser via the service worker initialized
 * by the app. This validates the Playwright ↔ MSW integration path.
 */
test.describe("MSW + Playwright Smoke", () => {
  test("docs app loads and renders the shell", async ({ page }) => {
    await page.goto("http://localhost:3100");
    // The docs app should render the public shell with the welcome message
    await expect(
      page.getByRole("heading", { name: /Emerald Docs/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("workspace app loads and renders the shell", async ({ page }) => {
    await page.goto("http://localhost:3101");
    // The workspace app should render the admin shell with the heading
    await expect(
      page.getByRole("heading", { name: /Emerald Workspace/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E: Public docs default route behavior.
 *
 * Validates VAL-CROSS-001: Opening the public app entry URL lands on
 * or redirects to the canonical default docs route.
 */
test.describe("public docs default route", () => {
  test("visiting / redirects to the canonical default docs route", async ({
    page,
  }) => {
    // Visit the root entry point
    await page.goto("http://localhost:3100/");

    // Wait for redirect to settle
    await page.waitForURL("**/guides/v1/getting-started", { timeout: 15000 });

    // Verify the resolved URL
    expect(page.url()).toContain("/guides/v1/getting-started");
  });

  test("resolved default route renders the expected document context", async ({
    page,
  }) => {
    await page.goto("http://localhost:3100/");
    await page.waitForURL("**/guides/v1/getting-started", { timeout: 15000 });

    // Verify route segments are shown in the page content
    const title = page.locator('[data-testid="doc-title"]');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText("guides/v1/getting-started");
  });

  test("there is a single canonical entry path for the public reading experience", async ({
    page,
  }) => {
    // Visit root and track the final URL
    await page.goto("http://localhost:3100/");
    await page.waitForURL("**/guides/v1/getting-started", { timeout: 15000 });
    const resolvedUrl = page.url();

    // Visit the canonical URL directly
    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await page.waitForLoadState("networkidle");

    // Both should resolve to the same canonical URL
    expect(page.url()).toBe(resolvedUrl);
  });
});

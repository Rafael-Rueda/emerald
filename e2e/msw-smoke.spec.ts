import { test, expect } from "@playwright/test";

/**
 * Smoke tests that verify apps start and MSW intercepts API calls in the browser.
 * The MswInit component in each app initializes the MSW service worker,
 * which intercepts fetch requests matching the handler patterns.
 */
test.describe("MSW + Playwright Smoke", () => {
  test("docs app loads and renders the shell", async ({ page }) => {
    await page.goto("http://localhost:3100");
    await expect(
      page.getByRole("heading", { name: /Emerald Docs/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("workspace app loads and renders the shell", async ({ page }) => {
    await page.goto("http://localhost:3101");
    await expect(
      page.getByRole("heading", { name: /Emerald Workspace/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("docs app MSW intercepts a document API call", async ({ page }) => {
    await page.goto("http://localhost:3100");
    // Wait for the app to fully load with MSW initialized
    await expect(
      page.getByRole("heading", { name: /Emerald Docs/i }),
    ).toBeVisible({ timeout: 15000 });

    // Execute a fetch inside the browser context to hit the MSW handler
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/docs/guides/v1/getting-started");
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.document).toBeDefined();
    expect(result.data.document.title).toBe("Getting Started");
    expect(result.data.document.slug).toBe("getting-started");
  });

  test("docs app MSW returns 404 for unknown document", async ({ page }) => {
    await page.goto("http://localhost:3100");
    await expect(
      page.getByRole("heading", { name: /Emerald Docs/i }),
    ).toBeVisible({ timeout: 15000 });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/docs/guides/v1/nonexistent-slug");
      return { status: res.status };
    });

    expect(result.status).toBe(404);
  });

  test("workspace app MSW intercepts workspace documents API call", async ({
    page,
  }) => {
    await page.goto("http://localhost:3101");
    await expect(
      page.getByRole("heading", { name: /Emerald Workspace/i }),
    ).toBeVisible({ timeout: 15000 });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/workspace/documents");
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.documents).toBeDefined();
    expect(result.data.documents.length).toBeGreaterThanOrEqual(2);
    expect(result.data.documents[0].title).toBe("Getting Started");
  });

  test("workspace app MSW intercepts search API call", async ({ page }) => {
    await page.goto("http://localhost:3101");
    await expect(
      page.getByRole("heading", { name: /Emerald Workspace/i }),
    ).toBeVisible({ timeout: 15000 });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/search?q=getting");
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.query).toBe("getting");
    expect(result.data.results.length).toBeGreaterThan(0);
  });

  test("docs app MSW intercepts navigation and versions API calls", async ({
    page,
  }) => {
    await page.goto("http://localhost:3100");
    await expect(
      page.getByRole("heading", { name: /Emerald Docs/i }),
    ).toBeVisible({ timeout: 15000 });

    // Test navigation endpoint
    const navResult = await page.evaluate(async () => {
      const res = await fetch("/api/navigation/guides/v1");
      return { status: res.status, data: await res.json() };
    });

    expect(navResult.status).toBe(200);
    expect(navResult.data.navigation).toBeDefined();
    expect(navResult.data.navigation.space).toBe("guides");
    expect(navResult.data.navigation.items.length).toBeGreaterThan(0);

    // Test versions endpoint
    const versionsResult = await page.evaluate(async () => {
      const res = await fetch("/api/versions/guides");
      return { status: res.status, data: await res.json() };
    });

    expect(versionsResult.status).toBe(200);
    expect(versionsResult.data.versions).toBeDefined();
    expect(versionsResult.data.versions.length).toBeGreaterThan(0);
  });
});

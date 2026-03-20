import { test, expect } from "@playwright/test";

test.describe("public docs search flow", () => {
  test("searches with disambiguating context and navigates to selected result", async ({
    page,
  }) => {
    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(page.getByTestId("search-input")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("search-input").fill("getting");
    await page.getByTestId("search-submit").click();

    await expect(page.getByTestId("search-results")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId("search-result-context-sr-getting-started"),
    ).toContainText("guides / v1");
    await expect(
      page.getByTestId("search-result-context-sr-getting-started-v2"),
    ).toContainText("guides / v2");

    await page.getByTestId("search-result-link-sr-getting-started-v2").click();

    await page.waitForURL("**/guides/v2/getting-started", { timeout: 10000 });
    await expect(page.getByTestId("doc-meta")).toContainText(
      "guides / v2 / getting-started",
    );
    await expect(page.getByTestId("breadcrumb-version")).toContainText("v2");
    await expect(page.getByTestId("sidebar-item-getting-started")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

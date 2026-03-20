import { expect, test } from "@playwright/test";

test.describe("workspace navigation inspector", () => {
  test("renders at least two distinguishable navigation records", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/navigation");

    await expect(page.getByText("Workspace Admin · Navigation")).toBeVisible();
    await expect(page.getByTestId("navigation-list")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Getting Started/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /API Reference/i })).toBeVisible();
  });

  test("updates detail view when selecting a different navigation item", async ({
    page,
  }) => {
    await page.goto("http://localhost:3101/admin/navigation");

    await expect(page.getByTestId("navigation-detail-id")).toHaveText(
      "nav-getting-started",
    );

    await page.getByRole("button", { name: /API Reference/i }).click();

    await expect(page.getByTestId("navigation-detail-id")).toHaveText(
      "nav-api-reference",
    );
    await expect(page.getByTestId("navigation-detail-label")).toHaveText(
      "API Reference",
    );
    await expect(page.getByTestId("navigation-detail-order")).toHaveText("1");
    await expect(page.getByText("Workspace Admin · Navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: "Navigation" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

import { test, expect } from "@playwright/test";

test.describe("workspace shell routing", () => {
  test("/admin resolves to the canonical default section", async ({ page }) => {
    await page.goto("http://localhost:3101/admin");

    await expect(page.getByText("Workspace Admin · Documents")).toBeVisible();
    await expect(page.getByTestId("admin-section-documents")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Documents" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("direct admin sub-routes land in the correct active section", async ({
    page,
  }) => {
    const routes = [
      {
        path: "/admin/documents",
        heading: "Workspace Admin · Documents",
        activeLink: "Documents",
      },
      {
        path: "/admin/navigation",
        heading: "Workspace Admin · Navigation",
        activeLink: "Navigation",
      },
      {
        path: "/admin/versions",
        heading: "Workspace Admin · Versions",
        activeLink: "Versions",
      },
      {
        path: "/admin/ai-context",
        heading: "Workspace Admin · AI Context",
        activeLink: "AI Context",
      },
    ];

    for (const route of routes) {
      await page.goto(`http://localhost:3101${route.path}`);
      await expect(page.getByText(route.heading)).toBeVisible();
      await expect(
        page.getByRole("link", { name: route.activeLink }),
      ).toHaveAttribute("aria-current", "page");
    }
  });

  test("moving between sections keeps the shell mounted", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:3101/admin/documents");

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Versions" }).click();
    await page.waitForURL("**/admin/versions", { timeout: 15000 });

    await expect(page.getByText("Workspace Admin · Versions")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toBeVisible();
  });
});

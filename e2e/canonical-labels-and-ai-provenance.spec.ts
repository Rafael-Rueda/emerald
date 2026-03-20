import { expect, test } from "@playwright/test";

test.describe("canonical labels and AI provenance", () => {
  test("workspace and public surfaces show matching canonical labels for the same record", async ({
    page,
  }) => {
    await page.goto("http://localhost:3101/admin/documents");

    await expect(page.getByTestId("document-detail-title")).toHaveText(
      "Getting Started",
    );
    const workspaceDocumentTitle =
      (await page.getByTestId("document-detail-title").textContent())?.trim() ?? "";
    const workspaceDocumentPath =
      (await page.getByTestId("document-detail-path-label").textContent())?.trim() ?? "";

    await page.goto("http://localhost:3101/admin/navigation");
    await expect(page.getByTestId("navigation-detail-label")).toHaveText(
      "Getting Started",
    );
    const workspaceNavigationLabel =
      (await page.getByTestId("navigation-detail-label").textContent())?.trim() ?? "";

    await page.goto("http://localhost:3101/admin/versions");
    await expect(page.getByTestId("version-detail-label")).toHaveText("v1");
    const workspaceVersionLabel =
      (await page.getByTestId("version-detail-label").textContent())?.trim() ?? "";

    await page.goto("http://localhost:3100/guides/v1/getting-started");

    const publicTitle = (await page.getByTestId("doc-title").textContent())?.trim() ?? "";
    const publicPath =
      (await page.getByTestId("doc-path-label").textContent())?.trim() ?? "";
    const publicVersion =
      (await page.getByTestId("version-active-label").textContent())?.trim() ?? "";
    const publicNavigationLabel =
      (await page.getByTestId("sidebar-item-getting-started").textContent())?.trim() ?? "";

    expect(workspaceDocumentTitle).toBe(publicTitle);
    expect(workspaceDocumentPath).toBe(publicPath);
    expect(workspaceVersionLabel).toBe(publicVersion);
    expect(workspaceNavigationLabel).toBe(publicNavigationLabel);
  });

  test("AI provenance maps to the same canonical public entity chain", async ({ page }) => {
    await page.goto(
      "http://localhost:3101/admin/ai-context?entityType=document&entityId=doc-getting-started",
    );

    await expect(page.getByTestId("ai-context-chunks")).toBeVisible();

    const aiDocument =
      (await page
        .getByTestId("ai-context-source-document-chunk-installation")
        .textContent())?.trim() ?? "";
    const aiVersion =
      (await page
        .getByTestId("ai-context-source-version-chunk-installation")
        .textContent())?.trim() ?? "";
    const aiPath =
      (await page
        .getByTestId("ai-context-source-path-chunk-installation")
        .textContent())?.trim() ?? "";
    const aiNavigation =
      (await page
        .getByTestId("ai-context-source-navigation-chunk-installation")
        .textContent())?.trim() ?? "";
    const aiSection =
      (await page
        .getByTestId("ai-context-source-section-chunk-installation")
        .textContent())?.trim() ?? "";
    const aiChunk =
      (await page
        .getByTestId("ai-context-source-chunk-chunk-installation")
        .textContent())?.trim() ?? "";

    await page.goto("http://localhost:3100/guides/v1/getting-started");

    await expect(page.getByTestId("doc-title")).toHaveText("Getting Started");
    await expect(page.getByTestId("doc-version-label")).toHaveText("v1");
    await expect(page.getByTestId("doc-path-label")).toHaveText(
      "guides/getting-started",
    );
    await expect(page.getByTestId("sidebar-item-getting-started")).toContainText(
      "Getting Started",
    );
    await expect(page.locator("#installation")).toHaveText("Installation");

    expect(aiDocument).toContain("Getting Started");
    expect(aiVersion).toContain("v1");
    expect(aiPath).toBe("guides/getting-started");
    expect(aiNavigation).toBe("Getting Started");
    expect(aiSection).toBe("Installation (installation)");
    expect(aiChunk).toBe("chunk-installation");
  });
});

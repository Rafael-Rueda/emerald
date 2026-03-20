import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const evidenceDir = "C:\\Users\\rafae\\.factory\\missions\\90873c85-f376-4669-b8a5-a7ed7eec901e\\evidence\\mocked-workspace-surface\\group4\\";
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

test.describe("Cross Surface Validation (VAL-CROSS-006, VAL-CROSS-008)", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
  });

  test("VAL-CROSS-006: Workspace and public surfaces use matching canonical entity labels", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/documents");
    await expect(page.getByTestId("document-detail-title")).toHaveText("Getting Started");
    const workspaceDocumentTitle = (await page.getByTestId("document-detail-title").textContent())?.trim() ?? "";
    const workspaceDocumentPath = (await page.getByTestId("document-detail-path-label").textContent())?.trim() ?? "";
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-006-workspace-document-labels.png") });

    await page.goto("http://localhost:3101/admin/navigation");
    await expect(page.getByTestId("navigation-detail-label")).toHaveText("Getting Started");
    const workspaceNavigationLabel = (await page.getByTestId("navigation-detail-label").textContent())?.trim() ?? "";
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-006-workspace-navigation-labels.png") });

    await page.goto("http://localhost:3101/admin/versions");
    await expect(page.getByTestId("version-detail-label")).toHaveText("v1");
    const workspaceVersionLabel = (await page.getByTestId("version-detail-label").textContent())?.trim() ?? "";
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-006-workspace-version-labels.png") });

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    const publicTitle = (await page.getByTestId("doc-title").textContent())?.trim() ?? "";
    const publicPath = (await page.getByTestId("doc-path-label").textContent())?.trim() ?? "";
    const publicVersion = (await page.getByTestId("version-active-label").textContent())?.trim() ?? "";
    const publicNavigationLabel = (await page.getByTestId("sidebar-item-getting-started").textContent())?.trim() ?? "";
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-006-public-labels.png") });

    expect(workspaceDocumentTitle).toBe(publicTitle);
    expect(workspaceDocumentPath).toBe(publicPath);
    expect(workspaceVersionLabel).toBe(publicVersion);
    expect(workspaceNavigationLabel).toBe(publicNavigationLabel);

    fs.writeFileSync(
      path.join(evidenceDir, "VAL-CROSS-006-console.json"),
      JSON.stringify(consoleErrors, null, 2)
    );
  });

  test("VAL-CROSS-008: AI provenance maps to the same canonical public entity chain", async ({ page }) => {
    await page.goto("http://localhost:3101/admin/ai-context?entityType=document&entityId=doc-getting-started");
    await expect(page.getByTestId("ai-context-chunks")).toBeVisible();
    
    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-008-ai-provenance-labels.png") });

    const aiDocument = (await page.getByTestId("ai-context-source-document-chunk-installation").textContent())?.trim() ?? "";
    const aiVersion = (await page.getByTestId("ai-context-source-version-chunk-installation").textContent())?.trim() ?? "";
    const aiPath = (await page.getByTestId("ai-context-source-path-chunk-installation").textContent())?.trim() ?? "";
    const aiNavigation = (await page.getByTestId("ai-context-source-navigation-chunk-installation").textContent())?.trim() ?? "";
    const aiSection = (await page.getByTestId("ai-context-source-section-chunk-installation").textContent())?.trim() ?? "";
    const aiChunk = (await page.getByTestId("ai-context-source-chunk-chunk-installation").textContent())?.trim() ?? "";

    await page.goto("http://localhost:3100/guides/v1/getting-started");
    await expect(page.getByTestId("doc-title")).toHaveText("Getting Started");
    await expect(page.getByTestId("doc-version-label")).toHaveText("v1");
    await expect(page.getByTestId("doc-path-label")).toHaveText("guides/getting-started");
    await expect(page.getByTestId("sidebar-item-getting-started")).toContainText("Getting Started");
    await expect(page.locator("#installation")).toHaveText("Installation");

    await page.screenshot({ path: path.join(evidenceDir, "VAL-CROSS-008-corresponding-public-labels.png") });

    expect(aiDocument).toContain("Getting Started");
    expect(aiVersion).toContain("v1");
    expect(aiPath).toBe("guides/getting-started");
    expect(aiNavigation).toBe("Getting Started");
    expect(aiSection).toBe("Installation (installation)");
    expect(aiChunk).toBe("chunk-installation");

    fs.writeFileSync(
      path.join(evidenceDir, "VAL-CROSS-008-console.json"),
      JSON.stringify(consoleErrors, null, 2)
    );
  });
});

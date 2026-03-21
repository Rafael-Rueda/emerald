import { expect, test, type Page } from "@playwright/test";

const DOCS_URL = "http://localhost:3100";
const WORKSPACE_URL = "http://localhost:3101";
const API_URL = "http://localhost:3333";

async function loginWorkspace(page: Page) {
  await page.goto(`${WORKSPACE_URL}/admin/documents`);

  if (page.url().includes("/admin/login")) {
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await expect(page).toHaveURL(/\/admin\/documents/);
  await expect(page.getByTestId("admin-section-documents")).toBeVisible();
}

async function ensureDarkTheme(page: Page) {
  const darkToggle = page.getByRole("button", { name: "Switch to dark mode" });
  if (await darkToggle.isVisible()) {
    await darkToggle.click();
  }

  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBeTruthy();
}

test.describe("cross-surface end-to-end", () => {
  test("validates publish, nav propagation, versions, search handoff, and shared theme cookie", async ({ page, request }) => {
    const runId = Date.now().toString();
    const title = `Cross Surface ${runId}`;

    await loginWorkspace(page);

    const authToken = (await page.context().cookies())
      .find((cookie) => cookie.name === "emerald_workspace_auth_token_client")
      ?.value;
    expect(authToken).toBeTruthy();

    const authHeaders = {
      Authorization: `Bearer ${authToken}`,
    };

    const spacesResponse = await page.request.get(`${API_URL}/api/workspace/spaces`, {
      headers: authHeaders,
    });
    expect(spacesResponse.ok()).toBeTruthy();
    const spacesPayload = await spacesResponse.json() as {
      spaces: Array<{ id: string; key: string }>;
    };
    const targetSpace = spacesPayload.spaces[0];
    expect(targetSpace).toBeTruthy();

    // VAL-CROSS-001 + VAL-CROSS-008: create + publish in workspace, then visible in docs quickly.
    await page.getByRole("link", { name: "Create Document" }).click();
    await expect(page).toHaveURL(/\/admin\/documents\/new/);
    await page.getByTestId("document-editor-space").selectOption(targetSpace.id);
    await page.getByTestId("document-editor-title").fill(title);

    const slug = (await page.getByTestId("document-editor-slug").inputValue()).trim();
    expect(slug.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Create Document" }).click();
    await expect(page).toHaveURL(/\/admin\/documents\/[0-9a-fA-F-]{36}$/);

    const editorUrl = page.url();
    const documentId = editorUrl.split("/").at(-1) ?? "";
    expect(documentId).toMatch(/^[0-9a-fA-F-]{36}$/);

    const documentEditorResponse = await page.request.get(
      `${API_URL}/api/workspace/documents/${documentId}`,
      { headers: authHeaders },
    );
    expect(documentEditorResponse.ok()).toBeTruthy();
    const documentEditorPayload = await documentEditorResponse.json() as {
      space: string;
      spaceId: string;
      releaseVersionId: string;
    };

    const versionsResponse = await page.request.get(
      `${API_URL}/api/workspace/versions?spaceId=${encodeURIComponent(documentEditorPayload.spaceId)}`,
      { headers: authHeaders },
    );
    expect(versionsResponse.ok()).toBeTruthy();
    const versionsPayload = await versionsResponse.json() as {
      versions: Array<{ id: string; key: string }>;
    };
    const matchedVersion = versionsPayload.versions.find(
      (version) => version.id === documentEditorPayload.releaseVersionId,
    );
    expect(matchedVersion).toBeTruthy();

    await page.getByRole("button", { name: "Publish" }).click();
    await page.getByTestId("document-editor-publish-confirmation").getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByTestId("document-editor-status-badge")).toContainText("Published");

    const publicPath = `/${documentEditorPayload.space}/${matchedVersion?.key ?? "v1"}/${slug}`;
    await expect
      .poll(async () => {
        const response = await request.get(`${DOCS_URL}${publicPath}`);
        if (!response.ok()) return "";
        return await response.text();
      }, { timeout: 5_000, intervals: [500, 500, 1000, 1000, 2000] })
      .toContain(title);

    await page.goto(`${DOCS_URL}${publicPath}`);
    await expect(page.getByTestId("doc-title")).toHaveText(title);

    // VAL-CROSS-002: reorder workspace navigation and verify docs sidebar reflects new order.
    const navLabelA = `Cross Nav A ${runId.slice(-4)}`;
    const navLabelB = `Cross Nav B ${runId.slice(-4)}`;
    const navCreateA = await page.request.post(`${API_URL}/api/workspace/navigation`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      data: {
        spaceId: documentEditorPayload.spaceId,
        releaseVersionId: documentEditorPayload.releaseVersionId,
        parentId: null,
        documentId,
        label: navLabelA,
        slug: `${slug}-a-${runId.slice(-4)}`,
        order: 900,
        nodeType: "document",
        externalUrl: null,
      },
    });
    expect(navCreateA.ok()).toBeTruthy();
    await navCreateA.json() as { id: string };

    const navCreateB = await page.request.post(`${API_URL}/api/workspace/navigation`, {
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      data: {
        spaceId: documentEditorPayload.spaceId,
        releaseVersionId: documentEditorPayload.releaseVersionId,
        parentId: null,
        documentId,
        label: navLabelB,
        slug: `${slug}-b-${runId.slice(-4)}`,
        order: 901,
        nodeType: "document",
        externalUrl: null,
      },
    });
    expect(navCreateB.ok()).toBeTruthy();
    const navNodeB = await navCreateB.json() as { id: string };

    await page.goto(`${DOCS_URL}${publicPath}`);
    await expect.poll(async () => page.locator("[data-testid^='sidebar-item-']").count()).toBeGreaterThan(1);
    const sidebarBefore = (await page.locator("[data-testid^='sidebar-item-']").allTextContents())
      .map((value) => value.trim());

    const navigationResponse = await request.get(
      `${API_URL}/api/public/spaces/${encodeURIComponent(documentEditorPayload.space)}/versions/${encodeURIComponent(matchedVersion?.key ?? "")}/navigation`,
    );
    expect(navigationResponse.ok()).toBeTruthy();
    const navigationPayload = await navigationResponse.json() as {
      items: Array<{ label: string; order: number; children?: Array<unknown> }>;
    };

    const candidate = navigationPayload.items.find((item) => item.order > 0) ?? navigationPayload.items[1];
    const targetTopLabel = candidate?.label ?? "";
    expect(targetTopLabel.length).toBeGreaterThan(0);
    expect(sidebarBefore).toContain(targetTopLabel);
    const sidebarBeforeSignature = sidebarBefore.join("|");

    const moveResponse = await page.request.post(
      `${API_URL}/api/workspace/navigation/${encodeURIComponent(navNodeB.id)}/move`,
      {
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        data: {
          parentId: null,
          order: 0,
        },
      },
    );
    expect(moveResponse.ok()).toBeTruthy();

    await expect.poll(async () => {
      await page.goto(`${DOCS_URL}${publicPath}?navAfter=${Date.now()}`);
      const labels = (await page.locator("[data-testid^='sidebar-item-']").allTextContents())
        .map((value) => value.trim());
      return labels.join("|");
    }, { timeout: 10_000, intervals: [500, 1000, 2000, 3000, 3500] }).not.toBe(sidebarBeforeSignature);

    // VAL-CROSS-004: create + publish new version and verify version selector contains it.
    await page.goto(`${WORKSPACE_URL}/admin/versions`);
    await expect(page.getByTestId("admin-section-versions")).toBeVisible();
    await page.getByRole("button", { name: "New Version" }).click();
    await expect(page.getByTestId("versions-create-dialog")).toBeVisible();

    const createdVersionKey = `v2-${runId.slice(-4)}`;
    await page.getByTestId("versions-create-label").fill(createdVersionKey);
    await page.getByTestId("versions-create-key").fill(createdVersionKey);
    await page.getByRole("button", { name: "Create version" }).click();

    await expect(page.getByTestId("version-action-feedback-success")).toContainText("created");

    const versionRow = page
      .locator("li[data-testid^='version-list-item-']")
      .filter({ hasText: createdVersionKey })
      .first();
    await expect(versionRow).toBeVisible();
    await versionRow.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByTestId("version-action-feedback-success")).toContainText("published");

    await page.goto(`${DOCS_URL}${publicPath}`);
    await expect(
      page.getByTestId("version-select").locator("option").filter({ hasText: createdVersionKey }),
    ).toHaveCount(1);

    // VAL-CROSS-005: search result navigates to expected document page.
    await page.getByTestId("search-input").fill(title);
    await page.getByTestId("search-submit").click();
    const searchResultLink = page.locator("[data-testid^='search-result-link-']").filter({ hasText: title }).first();
    await expect(searchResultLink).toBeVisible();
    await searchResultLink.click();
    await expect(page).toHaveURL(new RegExp(`${documentEditorPayload.space}/${matchedVersion?.key}/${slug}$`));
    await expect(page.getByTestId("doc-title")).toHaveText(title);

    // VAL-CROSS-007: theme cookie shared across docs/workspace ports.
    await ensureDarkTheme(page);
    await page.goto(`${WORKSPACE_URL}/admin/documents`);
    await expect(page).toHaveURL(/\/admin\/documents/);
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBeTruthy();
  });
});

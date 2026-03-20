import { expect, test } from "@playwright/test";

function withAiScenario(scenario: string): string {
  return `http://localhost:3101/admin/ai-context?aiScenario=${scenario}`;
}

test.describe("workspace AI context surface", () => {
  test("switching entity selection re-scopes AI context and request path", async ({
    page,
  }) => {
    const aiRequests: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/workspace/ai-context/")) {
        aiRequests.push(request.url());
      }
    });

    await page.goto("http://localhost:3101/admin/ai-context");

    await expect(page.getByText("Workspace Admin · AI Context")).toBeVisible();
    await expect(page.getByRole("link", { name: "AI Context" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("admin-section-ai-context")).toBeVisible();

    await expect(page.getByTestId("ai-context-scope")).toHaveText(
      "document/doc-getting-started",
    );
    await expect(page.getByTestId("ai-context-chunks")).toBeVisible();

    await page.getByRole("button", { name: /API Reference/i }).click();

    await expect(page.getByTestId("ai-context-scope")).toHaveText(
      "document/doc-api-reference",
    );
    await expect(page).toHaveURL(/entityId=doc-api-reference/);

    await expect
      .poll(() => aiRequests.some((url) => url.includes("/api/workspace/ai-context/document/doc-getting-started")))
      .toBeTruthy();
    await expect
      .poll(() => aiRequests.some((url) => url.includes("/api/workspace/ai-context/document/doc-api-reference")))
      .toBeTruthy();
  });

  test("loading, empty, error, and malformed AI scenarios render safe states", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();

        const url = new URL(requestUrl, window.location.origin);
        const scenario = new URL(window.location.href).searchParams.get("aiScenario");
        const isAiContextRequest = url.pathname.startsWith("/api/workspace/ai-context/");

        if (isAiContextRequest) {
          if (scenario === "loading") {
            return new Promise<Response>(() => {
              /* intentionally unresolved */
            });
          }

          const [, , , , entityType, entityId] = url.pathname.split("/");

          if (scenario === "empty") {
            return new Response(
              JSON.stringify({
                entityType,
                entityId,
                chunks: [],
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          if (scenario === "error") {
            return new Response(JSON.stringify({ error: "forced ai error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (scenario === "malformed") {
            return new Response(
              JSON.stringify({
                entityType: 999,
                entityId,
                chunks: "not-an-array",
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }

        return originalFetch(input, init);
      };
    });

    const cases = [
      { scenario: "loading", expectedTestId: "ai-context-loading" },
      { scenario: "empty", expectedTestId: "ai-context-empty" },
      { scenario: "error", expectedTestId: "ai-context-error" },
      {
        scenario: "malformed",
        expectedTestId: "ai-context-validation-error",
      },
    ];

    for (const scenarioCase of cases) {
      await page.goto(withAiScenario(scenarioCase.scenario));

      await expect(page.getByText("Workspace Admin · AI Context")).toBeVisible();
      await expect(page.getByRole("link", { name: "AI Context" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByTestId("admin-section-ai-context")).toBeVisible();

      await expect(page.getByTestId("ai-context-scope")).toBeVisible();
      await expect(page.getByTestId(scenarioCase.expectedTestId)).toBeVisible();
      await expect(page.getByTestId("ai-context-chunks")).toHaveCount(0);
    }
  });
});

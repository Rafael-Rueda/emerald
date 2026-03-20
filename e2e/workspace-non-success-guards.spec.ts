import { expect, test } from "@playwright/test";

interface WorkspaceDomainSpec {
  name: string;
  path: string;
  shellHeading: string;
  activeLink: string;
  sectionTestId: string;
  listPath: string;
  listTestId: string;
  listLoadingTestId: string;
  listEmptyTestId: string;
  listErrorTestId: string;
  listValidationErrorTestId: string;
  detailLoadingTestId: string;
  detailErrorTestId: string;
  detailValidationErrorTestId: string;
  detailTrustedDataTestId: string;
  listEmptyBody: Record<string, unknown>;
  listMalformedBody: Record<string, unknown>;
  detailMalformedBody: Record<string, unknown>;
}

const workspaceDomains: WorkspaceDomainSpec[] = [
  {
    name: "documents",
    path: "/admin/documents",
    shellHeading: "Workspace Admin · Documents",
    activeLink: "Documents",
    sectionTestId: "admin-section-documents",
    listPath: "/api/workspace/documents",
    listTestId: "documents-list",
    listLoadingTestId: "documents-list-loading",
    listEmptyTestId: "documents-list-empty",
    listErrorTestId: "documents-list-error",
    listValidationErrorTestId: "documents-list-validation-error",
    detailLoadingTestId: "document-detail-loading",
    detailErrorTestId: "document-detail-error",
    detailValidationErrorTestId: "document-detail-validation-error",
    detailTrustedDataTestId: "document-detail-id",
    listEmptyBody: { documents: [] },
    listMalformedBody: { documents: "broken" },
    detailMalformedBody: { id: 999, title: null },
  },
  {
    name: "navigation",
    path: "/admin/navigation",
    shellHeading: "Workspace Admin · Navigation",
    activeLink: "Navigation",
    sectionTestId: "admin-section-navigation",
    listPath: "/api/workspace/navigation",
    listTestId: "navigation-list",
    listLoadingTestId: "navigation-list-loading",
    listEmptyTestId: "navigation-list-empty",
    listErrorTestId: "navigation-list-error",
    listValidationErrorTestId: "navigation-list-validation-error",
    detailLoadingTestId: "navigation-detail-loading",
    detailErrorTestId: "navigation-detail-error",
    detailValidationErrorTestId: "navigation-detail-validation-error",
    detailTrustedDataTestId: "navigation-detail-id",
    listEmptyBody: { items: [] },
    listMalformedBody: { items: 42 },
    detailMalformedBody: { id: 999, label: null },
  },
  {
    name: "versions",
    path: "/admin/versions",
    shellHeading: "Workspace Admin · Versions",
    activeLink: "Versions",
    sectionTestId: "admin-section-versions",
    listPath: "/api/workspace/versions",
    listTestId: "versions-list",
    listLoadingTestId: "versions-list-loading",
    listEmptyTestId: "versions-list-empty",
    listErrorTestId: "versions-list-error",
    listValidationErrorTestId: "versions-list-validation-error",
    detailLoadingTestId: "version-detail-loading",
    detailErrorTestId: "version-detail-error",
    detailValidationErrorTestId: "version-detail-validation-error",
    detailTrustedDataTestId: "version-detail-id",
    listEmptyBody: { versions: [] },
    listMalformedBody: { versions: "not-array" },
    detailMalformedBody: { id: 999, label: null },
  },
];

function withScenario(path: string, scenario: string): string {
  return `http://localhost:3101${path}?wsScenario=${scenario}`;
}

test.describe("workspace non-success guards", () => {
  for (const domain of workspaceDomains) {
    test(`${domain.name}: list non-success states keep shell context mounted`, async ({
      page,
    }) => {
      await page.addInitScript(
        ({ listPath, listEmptyBody, listMalformedBody, detailMalformedBody }) => {
          const originalFetch = window.fetch.bind(window);

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestUrl =
              typeof input === "string"
                ? input
                : input instanceof Request
                  ? input.url
                  : input.toString();
            const url = new URL(requestUrl, window.location.origin);
            const pathname = url.pathname;
            const scenario = new URL(window.location.href).searchParams.get("wsScenario");
            const isListRequest = pathname === listPath;
            const isDetailRequest =
              pathname.startsWith(`${listPath}/`) &&
              !pathname.endsWith("/publish") &&
              !pathname.endsWith("/reorder");

            if (isListRequest) {
              if (scenario === "list-loading") {
                return new Promise<Response>(() => {
                  /* intentionally unresolved */
                });
              }

              if (scenario === "list-empty") {
                return new Response(JSON.stringify(listEmptyBody), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              }

              if (scenario === "list-error") {
                return new Response(JSON.stringify({ error: "forced list failure" }), {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
                });
              }

              if (scenario === "list-malformed") {
                return new Response(JSON.stringify(listMalformedBody), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              }
            }

            if (isDetailRequest && scenario === "detail-malformed") {
              return new Response(JSON.stringify(detailMalformedBody), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            return originalFetch(input, init);
          };
        },
        {
          listPath: domain.listPath,
          listEmptyBody: domain.listEmptyBody,
          listMalformedBody: domain.listMalformedBody,
          detailMalformedBody: domain.detailMalformedBody,
        },
      );

      const listCases = [
        { scenario: "list-loading", expectedTestId: domain.listLoadingTestId },
        { scenario: "list-empty", expectedTestId: domain.listEmptyTestId },
        { scenario: "list-error", expectedTestId: domain.listErrorTestId },
        { scenario: "list-malformed", expectedTestId: domain.listValidationErrorTestId },
      ];

      for (const listCase of listCases) {
        await page.goto(withScenario(domain.path, listCase.scenario));

        await expect(page.getByText(domain.shellHeading)).toBeVisible();
        await expect(page.getByTestId(domain.sectionTestId)).toBeVisible();
        await expect(page.getByRole("link", { name: domain.activeLink })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(page.getByTestId(listCase.expectedTestId)).toBeVisible();
        await expect(page.getByTestId(domain.detailTrustedDataTestId)).toHaveCount(0);
      }
    });

    test(`${domain.name}: detail non-success states keep shell context mounted`, async ({
      page,
    }) => {
      await page.addInitScript(
        ({ listPath, detailMalformedBody }) => {
          const originalFetch = window.fetch.bind(window);

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const requestUrl =
              typeof input === "string"
                ? input
                : input instanceof Request
                  ? input.url
                  : input.toString();
            const url = new URL(requestUrl, window.location.origin);
            const pathname = url.pathname;
            const scenario = new URL(window.location.href).searchParams.get("wsScenario");
            const isDetailRequest =
              pathname.startsWith(`${listPath}/`) &&
              pathname !== listPath &&
              !pathname.endsWith("/publish") &&
              !pathname.endsWith("/reorder");

            if (isDetailRequest) {
              if (scenario === "detail-loading") {
                return new Promise<Response>(() => {
                  /* intentionally unresolved */
                });
              }

              if (scenario === "detail-error") {
                return new Response(JSON.stringify({ error: "forced detail failure" }), {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
                });
              }

              if (scenario === "detail-malformed") {
                return new Response(JSON.stringify(detailMalformedBody), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                });
              }
            }

            return originalFetch(input, init);
          };
        },
        {
          listPath: domain.listPath,
          detailMalformedBody: domain.detailMalformedBody,
        },
      );

      const detailCases = [
        { scenario: "detail-loading", expectedTestId: domain.detailLoadingTestId },
        { scenario: "detail-error", expectedTestId: domain.detailErrorTestId },
        { scenario: "detail-malformed", expectedTestId: domain.detailValidationErrorTestId },
      ];

      for (const detailCase of detailCases) {
        await page.goto(withScenario(domain.path, detailCase.scenario));

        await expect(page.getByText(domain.shellHeading)).toBeVisible();
        await expect(page.getByTestId(domain.sectionTestId)).toBeVisible();
        await expect(page.getByRole("link", { name: domain.activeLink })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(page.getByTestId(domain.listTestId)).toBeVisible();
        await expect(page.getByTestId(detailCase.expectedTestId)).toBeVisible();
        await expect(page.getByTestId(domain.detailTrustedDataTestId)).toHaveCount(0);
      }
    });
  }
});

import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { createAllHandlers } from "@emerald/mocks";
import { AppProviders } from "@emerald/ui/providers";
import { DocumentInspector } from "./document-inspector";

describe("DocumentInspector", () => {
  const server = setupServer(
    ...createAllHandlers({ workspaceDocuments: "success" }),
  );

  function renderInspector() {
    return render(
      <AppProviders defaultTheme="light">
        <DocumentInspector />
      </AppProviders>,
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders at least two visibly distinguishable records", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Getting Started/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /API Reference/i }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("document-list-item-doc-getting-started")).toHaveTextContent(
      "getting-started",
    );
    expect(screen.getByTestId("document-list-item-doc-api-reference")).toHaveTextContent(
      "api-reference",
    );
  });

  it("updates detail rendering when selecting a different record", async () => {
    const user = userEvent.setup();
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("document-detail-id")).toHaveTextContent(
        "doc-getting-started",
      );
    });

    await user.click(screen.getByRole("button", { name: /API Reference/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-detail-id")).toHaveTextContent(
        "doc-api-reference",
      );
    });

    expect(screen.getByTestId("document-detail-title")).toHaveTextContent(
      "API Reference",
    );
    expect(screen.getByTestId("document-detail-slug")).toHaveTextContent(
      "api-reference",
    );
    expect(screen.getByTestId("document-detail-path-label")).toHaveTextContent(
      "guides/api-reference",
    );
    expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
      "draft",
    );
    expect(screen.getByTestId("document-detail-space")).toHaveTextContent("guides");
  });

  it("shows a shared loading feedback state while the document list request is pending", async () => {
    server.use(...createAllHandlers({ workspaceDocuments: "loading" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("documents-list-loading").querySelector("[role='alert']")).not.toBeNull();
    expect(screen.getByTestId("admin-section-documents")).toBeInTheDocument();
  });

  it("shows intentional list and detail empty states when no document records are returned", async () => {
    server.use(...createAllHandlers({ workspaceDocuments: "not-found" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list-empty")).toBeInTheDocument();
    });

    expect(screen.getByTestId("document-detail-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("documents-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("documents-list-empty").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure list state without rendering stale records", async () => {
    server.use(...createAllHandlers({ workspaceDocuments: "error" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("documents-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("documents-list-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure list state for malformed document payloads", async () => {
    server.use(...createAllHandlers({ workspaceDocuments: "malformed" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("documents-list")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("documents-list-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
  });

  it("shows a loading state while selected document detail is pending", async () => {
    server.use(
      http.get("*/api/workspace/documents/:id", async () => {
        await delay("infinite");
        return HttpResponse.json({ id: "never-resolves" }, { status: 200 });
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("documents-list")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("document-detail-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("document-detail-loading").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure detail state for the selected document", async () => {
    server.use(
      http.get("*/api/workspace/documents/:id", () =>
        HttpResponse.json({ error: "Failed detail" }, { status: 500 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("document-detail-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("document-detail-id")).not.toBeInTheDocument();
    expect(screen.getByTestId("document-detail-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure detail state for malformed selected document payloads", async () => {
    server.use(
      http.get("*/api/workspace/documents/:id", () =>
        HttpResponse.json({ id: 123, title: null }, { status: 200 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("document-detail-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("document-detail-id")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("document-detail-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
  });

  it("publishes the selected document and updates list/detail status", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-id")).toHaveTextContent(
          "doc-getting-started",
        );
      });

      await user.click(screen.getByRole("button", { name: /API Reference/i }));

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Publish selected document/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
          "published",
        );
      });

      expect(
        screen.getByTestId("document-list-item-doc-api-reference-status"),
      ).toHaveTextContent("published");
      expect(screen.getByTestId("document-action-feedback-success")).toHaveTextContent(
        "Operation completed successfully.",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/documents/doc-api-reference/publish" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rolls back an optimistic document publish when the mutation fails", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.post("*/api/workspace/documents/:id/publish", () =>
        HttpResponse.json({ error: "Mutation failed" }, { status: 500 }),
      ),
    );

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-id")).toHaveTextContent(
          "doc-getting-started",
        );
      });

      await user.click(screen.getByRole("button", { name: /API Reference/i }));

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Publish selected document/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      expect(
        screen.getByTestId("document-list-item-doc-api-reference-status"),
      ).toHaveTextContent("draft");
      expect(screen.getByTestId("document-action-feedback-error")).toHaveTextContent(
        "Request failed with status 500",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/documents/doc-api-reference/publish" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

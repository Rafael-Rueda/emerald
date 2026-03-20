import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
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
import { AiContextInspector } from "./ai-context-inspector";

describe("AiContextInspector", () => {
  const server = setupServer(
    ...createAllHandlers({
      workspaceDocuments: "success",
      aiContext: "success",
    }),
  );

  function renderInspector() {
    return render(
      <AppProviders defaultTheme="light">
        <AiContextInspector />
      </AppProviders>,
    );
  }

  function setRoute(search = "") {
    window.history.replaceState({}, "", `/admin/ai-context${search}`);
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  beforeEach(() => setRoute());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("loads AI context for the scoped entity from the route", async () => {
    setRoute("?entityType=document&entityId=doc-api-reference");

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("ai-context-scope")).toHaveTextContent(
        "document/doc-api-reference",
      );
    });

    expect(screen.getByTestId("ai-context-entity-title")).toHaveTextContent(
      "API Reference",
    );
    expect(screen.getByTestId("ai-context-chunks")).toBeInTheDocument();
    expect(
      screen.getByTestId("ai-context-source-document-chunk-installation"),
    ).toHaveTextContent("Getting Started");
    expect(
      screen.getByTestId("ai-context-source-version-chunk-installation"),
    ).toHaveTextContent("v1");
    expect(
      screen.getByTestId("ai-context-source-path-chunk-installation"),
    ).toHaveTextContent("guides/getting-started");
    expect(
      screen.getByTestId("ai-context-source-navigation-chunk-installation"),
    ).toHaveTextContent("Getting Started");
    expect(
      screen.getByTestId("ai-context-source-section-chunk-installation"),
    ).toHaveTextContent("Installation (installation)");
    expect(
      screen.getByTestId("ai-context-source-chunk-chunk-installation"),
    ).toHaveTextContent("chunk-installation");
  });

  it("switches entity scope and updates URL + request path", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("ai-context-scope")).toHaveTextContent(
          "document/doc-getting-started",
        );
      });

      await user.click(screen.getByRole("button", { name: /API Reference/i }));

      await waitFor(() => {
        expect(screen.getByTestId("ai-context-scope")).toHaveTextContent(
          "document/doc-api-reference",
        );
      });

      expect(window.location.search).toContain("entityType=document");
      expect(window.location.search).toContain("entityId=doc-api-reference");

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input]) =>
              input === "/api/workspace/ai-context/document/doc-api-reference",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("shows an intentional loading state while the scoped AI request is pending", async () => {
    server.use(
      http.get("*/api/workspace/ai-context/:entityType/:entityId", async () => {
        await delay("infinite");
        return HttpResponse.json({ never: "resolves" }, { status: 200 });
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("ai-context-loading")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("ai-context-chunks")).not.toBeInTheDocument();
  });

  it("shows an intentional empty state when no AI chunks are returned", async () => {
    server.use(
      ...createAllHandlers({
        workspaceDocuments: "success",
        aiContext: "not-found",
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("ai-context-empty")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("ai-context-chunks")).not.toBeInTheDocument();
  });

  it("shows an error state when the AI request fails", async () => {
    server.use(
      ...createAllHandlers({
        workspaceDocuments: "success",
        aiContext: "error",
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("ai-context-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("ai-context-chunks")).not.toBeInTheDocument();
  });

  it("shows a schema-failure state for malformed AI payloads", async () => {
    server.use(
      ...createAllHandlers({
        workspaceDocuments: "success",
        aiContext: "malformed",
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("ai-context-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("ai-context-chunks")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ai-context-chunk-chunk-installation"),
    ).not.toBeInTheDocument();
  });
});

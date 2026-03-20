import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByTestId("document-detail-status")).toHaveTextContent(
      "draft",
    );
    expect(screen.getByTestId("document-detail-space")).toHaveTextContent("guides");
  });
});

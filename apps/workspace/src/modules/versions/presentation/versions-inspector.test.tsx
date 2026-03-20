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
import { VersionsInspector } from "./versions-inspector";

describe("VersionsInspector", () => {
  const server = setupServer(...createAllHandlers({ workspaceVersions: "success" }));

  function renderInspector() {
    return render(
      <AppProviders defaultTheme="light">
        <VersionsInspector />
      </AppProviders>,
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders at least two visibly distinguishable records", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /^v1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^v2/i })).toBeInTheDocument();

    expect(screen.getByTestId("version-list-item-ver-v1")).toHaveTextContent(
      "published",
    );
    expect(screen.getByTestId("version-list-item-ver-v2")).toHaveTextContent("draft");
  });

  it("updates detail rendering when selecting a different record", async () => {
    const user = userEvent.setup();
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("version-detail-id")).toHaveTextContent("ver-v1");
    });

    await user.click(screen.getByRole("button", { name: /^v2/i }));

    await waitFor(() => {
      expect(screen.getByTestId("version-detail-id")).toHaveTextContent("ver-v2");
    });

    expect(screen.getByTestId("version-detail-label")).toHaveTextContent("v2");
    expect(screen.getByTestId("version-detail-slug")).toHaveTextContent("v2");
    expect(screen.getByTestId("version-detail-space")).toHaveTextContent("guides");
    expect(screen.getByTestId("version-detail-status")).toHaveTextContent("draft");
    expect(screen.getByTestId("version-detail-default")).toHaveTextContent("No");
    expect(screen.getByTestId("admin-section-versions")).toBeInTheDocument();
    expect(screen.getByText("Versions")).toBeInTheDocument();
  });
});

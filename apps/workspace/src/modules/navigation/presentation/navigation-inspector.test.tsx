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
import { NavigationInspector } from "./navigation-inspector";

describe("NavigationInspector", () => {
  const server = setupServer(
    ...createAllHandlers({ workspaceNavigation: "success" }),
  );

  function renderInspector() {
    return render(
      <AppProviders defaultTheme="light">
        <NavigationInspector />
      </AppProviders>,
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("renders at least two visibly distinguishable records", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Getting Started/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /API Reference/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("navigation-list-item-nav-getting-started"),
    ).toHaveTextContent("getting-started");
    expect(
      screen.getByTestId("navigation-list-item-nav-api-reference"),
    ).toHaveTextContent("api-reference");
  });

  it("updates detail rendering when selecting a different record", async () => {
    const user = userEvent.setup();
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-detail-id")).toHaveTextContent(
        "nav-getting-started",
      );
    });

    await user.click(screen.getByRole("button", { name: /API Reference/i }));

    await waitFor(() => {
      expect(screen.getByTestId("navigation-detail-id")).toHaveTextContent(
        "nav-api-reference",
      );
    });

    expect(screen.getByTestId("navigation-detail-label")).toHaveTextContent(
      "API Reference",
    );
    expect(screen.getByTestId("navigation-detail-slug")).toHaveTextContent(
      "api-reference",
    );
    expect(screen.getByTestId("navigation-detail-space")).toHaveTextContent(
      "guides",
    );
    expect(screen.getByTestId("navigation-detail-parent")).toHaveTextContent(
      "Root",
    );
    expect(screen.getByTestId("navigation-detail-order")).toHaveTextContent("1");
  });
});

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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { createAllHandlers } from "@emerald/mocks";
import { AppProviders } from "@emerald/ui/providers";
import { WorkspaceContextProvider } from "../../shared/application/workspace-context";
import { NavigationInspector } from "./navigation-inspector";

describe("NavigationInspector", () => {
  const server = setupServer(...createAllHandlers({ workspaceNavigation: "success" }));

  function renderInspector() {
    return render(
      <AppProviders defaultTheme="light">
        <WorkspaceContextProvider>
          <NavigationInspector />
        </WorkspaceContextProvider>
      </AppProviders>,
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  beforeEach(() => {
    server.resetHandlers(...createAllHandlers({ workspaceNavigation: "success" }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  it("renders the navigation hierarchy and linked document titles", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-tree")).toBeInTheDocument();
    });

    expect(screen.getByTestId("navigation-node-nav-getting-started")).toBeInTheDocument();
    expect(screen.getByTestId("navigation-node-nav-installation")).toBeInTheDocument();
    expect(screen.getByTestId("navigation-node-nav-api-reference")).toBeInTheDocument();

    expect(
      screen.getByTestId("navigation-node-document-title-nav-getting-started"),
    ).toHaveTextContent("Linked document: Getting Started");
    expect(
      screen.getByTestId("navigation-node-document-title-nav-api-reference"),
    ).toHaveTextContent("Linked document: API Reference");
  });

  it("reorders within the same level and calls the move endpoint", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-tree")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("navigation-select-node-nav-api-reference"));
    await user.keyboard("{Escape}");
    await user.click(screen.getByTestId("navigation-move-selected-to-top-button"));

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(
          ([input, init]) =>
            typeof input === "string" &&
            input.includes("/api/workspace/navigation/nav-api-reference/move") &&
            init?.method === "POST",
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTestId("navigation-node-order-nav-api-reference")).toHaveTextContent(
        "order 0",
      );
    });
  });

  it("opens edit dialog with document selector and persists PATCH updates", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-tree")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("navigation-select-node-nav-api-reference"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Linked document/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Getting Started" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "API Reference" })).toBeInTheDocument();

    const labelInput = screen.getByLabelText("Label");
    await user.clear(labelInput);
    await user.type(labelInput, "API Guides");

    await user.click(screen.getByTestId("navigation-edit-submit"));

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(
          ([input, init]) =>
            typeof input === "string" &&
            input.includes("/api/workspace/navigation/nav-api-reference") &&
            init?.method === "PATCH",
        ),
      ).toBe(true);
    });

    expect(screen.getByTestId("navigation-action-feedback-success")).toHaveTextContent(
      "Navigation node updated.",
    );
  });

  it("creates a root navigation node", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-create-node-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("navigation-create-node-button"));

    const labelInput = screen.getByLabelText("Label");
    await user.type(labelInput, "Changelog");

    const createUnderParentCheckbox = screen.getByLabelText(
      "Create under selected parent",
    );
    if ((createUnderParentCheckbox as HTMLInputElement).checked) {
      await user.click(createUnderParentCheckbox);
    }

    await user.click(screen.getByTestId("navigation-create-submit"));

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(
          ([input, init]) =>
            typeof input === "string" &&
            input.endsWith("/api/workspace/navigation") &&
            init?.method === "POST",
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText("Changelog")).toBeInTheDocument();
    });
  });

  it("collapses and expands a parent node", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-node-nav-installation")).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByRole("button", { name: "Toggle collapsed" });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(screen.queryByTestId("navigation-node-nav-installation")).not.toBeInTheDocument();
    });

    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("navigation-node-nav-installation")).toBeInTheDocument();
    });
  });
});

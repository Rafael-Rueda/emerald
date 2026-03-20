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
import { HttpResponse, http } from "msw";
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

  it("moves the selected navigation record to the top and updates order indicators", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-id")).toHaveTextContent(
          "nav-getting-started",
        );
      });

      await user.click(screen.getByRole("button", { name: /API Reference/i }));

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-order")).toHaveTextContent(
          "1",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Move selected item to top/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-order")).toHaveTextContent(
          "0",
        );
      });

      expect(
        screen.getByTestId("navigation-list-item-nav-api-reference-order"),
      ).toHaveTextContent("0");
      expect(
        screen.getByTestId("navigation-action-feedback-success"),
      ).toHaveTextContent("Operation completed successfully.");

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/navigation/nav-api-reference/reorder" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rolls back optimistic reorder when the navigation mutation fails", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.post("*/api/workspace/navigation/:id/reorder", () =>
        HttpResponse.json({ error: "Mutation failed" }, { status: 500 }),
      ),
    );

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-id")).toHaveTextContent(
          "nav-getting-started",
        );
      });

      await user.click(screen.getByRole("button", { name: /API Reference/i }));

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-order")).toHaveTextContent(
          "1",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Move selected item to top/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("navigation-detail-order")).toHaveTextContent(
          "1",
        );
      });

      expect(
        screen.getByTestId("navigation-list-item-nav-api-reference-order"),
      ).toHaveTextContent("1");
      expect(screen.getByTestId("navigation-action-feedback-error")).toHaveTextContent(
        "Request failed with status 500",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/navigation/nav-api-reference/reorder" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

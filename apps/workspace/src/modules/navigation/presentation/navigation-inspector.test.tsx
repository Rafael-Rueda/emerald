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

  it("shows a shared loading feedback state while the navigation list request is pending", async () => {
    server.use(...createAllHandlers({ workspaceNavigation: "loading" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("navigation-list-loading").querySelector("[role='alert']")).not.toBeNull();
    expect(screen.getByTestId("admin-section-navigation")).toBeInTheDocument();
  });

  it("shows intentional list and detail empty states when no navigation records are returned", async () => {
    server.use(...createAllHandlers({ workspaceNavigation: "not-found" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list-empty")).toBeInTheDocument();
    });

    expect(screen.getByTestId("navigation-detail-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("navigation-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigation-list-empty").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure list state without rendering stale records", async () => {
    server.use(...createAllHandlers({ workspaceNavigation: "error" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("navigation-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigation-list-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure list state for malformed navigation payloads", async () => {
    server.use(...createAllHandlers({ workspaceNavigation: "malformed" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("navigation-list")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("navigation-list-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
  });

  it("shows a loading state while selected navigation detail is pending", async () => {
    server.use(
      http.get("*/api/workspace/navigation/:id", async () => {
        await delay("infinite");
        return HttpResponse.json({ id: "never-resolves" }, { status: 200 });
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-list")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("navigation-detail-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("navigation-detail-loading").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure detail state for the selected navigation item", async () => {
    server.use(
      http.get("*/api/workspace/navigation/:id", () =>
        HttpResponse.json({ error: "Failed detail" }, { status: 500 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-detail-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("navigation-detail-id")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigation-detail-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure detail state for malformed selected navigation payloads", async () => {
    server.use(
      http.get("*/api/workspace/navigation/:id", () =>
        HttpResponse.json({ id: 123, label: null }, { status: 200 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("navigation-detail-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("navigation-detail-id")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("navigation-detail-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
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

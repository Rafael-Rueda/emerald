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

  it("shows a shared loading feedback state while the versions list request is pending", async () => {
    server.use(...createAllHandlers({ workspaceVersions: "loading" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("versions-list-loading").querySelector("[role='alert']")).not.toBeNull();
    expect(screen.getByTestId("admin-section-versions")).toBeInTheDocument();
  });

  it("shows intentional list and detail empty states when no version records are returned", async () => {
    server.use(...createAllHandlers({ workspaceVersions: "not-found" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list-empty")).toBeInTheDocument();
    });

    expect(screen.getByTestId("version-detail-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("versions-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("versions-list-empty").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure list state without rendering stale records", async () => {
    server.use(...createAllHandlers({ workspaceVersions: "error" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("versions-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("versions-list-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure list state for malformed version payloads", async () => {
    server.use(...createAllHandlers({ workspaceVersions: "malformed" }));

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("versions-list")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("versions-list-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
  });

  it("shows a loading state while selected version detail is pending", async () => {
    server.use(
      http.get("*/api/workspace/versions/:id", async () => {
        await delay("infinite");
        return HttpResponse.json({ id: "never-resolves" }, { status: 200 });
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("version-detail-loading")).toBeInTheDocument();
    });

    expect(screen.getByTestId("version-detail-loading").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a request-failure detail state for the selected version", async () => {
    server.use(
      http.get("*/api/workspace/versions/:id", () =>
        HttpResponse.json({ error: "Failed detail" }, { status: 500 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("version-detail-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("version-detail-id")).not.toBeInTheDocument();
    expect(screen.getByTestId("version-detail-error").querySelector("[role='alert']")).not.toBeNull();
  });

  it("shows a schema-failure detail state for malformed selected version payloads", async () => {
    server.use(
      http.get("*/api/workspace/versions/:id", () =>
        HttpResponse.json({ id: 123, label: null }, { status: 200 }),
      ),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("version-detail-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("version-detail-id")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("version-detail-validation-error").querySelector("[role='alert']"),
    ).not.toBeNull();
  });

  it("publishes the selected version and updates visible status indicators", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-id")).toHaveTextContent("ver-v1");
      });

      await user.click(screen.getByRole("button", { name: /^v2/i }));

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Publish selected version/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-status")).toHaveTextContent(
          "published",
        );
      });

      expect(screen.getByTestId("version-list-item-ver-v2-status")).toHaveTextContent(
        "published",
      );
      expect(screen.getByTestId("version-action-feedback-success")).toHaveTextContent(
        "Operation completed successfully.",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/versions/ver-v2/publish" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rolls back optimistic version publish when the mutation fails", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.post("*/api/workspace/versions/:id/publish", () =>
        HttpResponse.json({ error: "Mutation failed" }, { status: 500 }),
      ),
    );

    try {
      renderInspector();

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-id")).toHaveTextContent("ver-v1");
      });

      await user.click(screen.getByRole("button", { name: /^v2/i }));

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      await user.click(
        screen.getByRole("button", { name: /Publish selected version/i }),
      );

      await waitFor(() => {
        expect(screen.getByTestId("version-detail-status")).toHaveTextContent(
          "draft",
        );
      });

      expect(screen.getByTestId("version-list-item-ver-v2-status")).toHaveTextContent(
        "draft",
      );
      expect(screen.getByTestId("version-action-feedback-error")).toHaveTextContent(
        "Request failed with status 500",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/versions/ver-v2/publish" &&
              init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

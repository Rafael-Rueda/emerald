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

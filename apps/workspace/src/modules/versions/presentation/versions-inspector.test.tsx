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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { AppProviders } from "@emerald/ui/providers";
import type { WorkspaceReleaseVersion } from "@emerald/data-access";
import { VersionsInspector } from "./versions-inspector";

const baseVersions: WorkspaceReleaseVersion[] = [
  {
    id: "ver-v1",
    spaceId: "space-guides",
    key: "v1",
    label: "Version 1",
    status: "published",
    isDefault: true,
    publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ver-v2",
    spaceId: "space-guides",
    key: "v2-draft",
    label: "Version 2 Draft",
    status: "draft",
    isDefault: false,
    publishedAt: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
];

describe("VersionsInspector", () => {
  let versions = structuredClone(baseVersions);

  const server = setupServer(
    http.get("*/api/workspace/spaces", () =>
      HttpResponse.json([
        {
          id: "space-guides",
          key: "guides",
          name: "Guides",
          description: "Workspace guides",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    ),
    http.get("*/api/workspace/versions", () =>
      HttpResponse.json({ versions }),
    ),
    http.post("*/api/workspace/versions", async ({ request }) => {
      const body = await request.json() as {
        spaceId: string;
        key: string;
        label: string;
      };

      const duplicate = versions.some((version) => version.key === body.key);
      if (duplicate) {
        return HttpResponse.json({ message: "Version key already exists" }, { status: 409 });
      }

      const now = "2026-03-21T00:00:00.000Z";
      const created: WorkspaceReleaseVersion = {
        id: "ver-created",
        spaceId: body.spaceId,
        key: body.key,
        label: body.label,
        status: "draft",
        isDefault: false,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      versions = [...versions, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.post("*/api/workspace/versions/:id/publish", ({ params }) => {
      const versionId = String(params.id ?? "");
      const targetVersion = versions.find((version) => version.id === versionId);

      if (!targetVersion) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }

      const published: WorkspaceReleaseVersion = {
        ...targetVersion,
        status: "published",
        publishedAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
      };

      versions = versions.map((version) => (
        version.id === versionId ? published : version
      ));

      return HttpResponse.json(published);
    }),
    http.post("*/api/workspace/versions/:id/set-default", ({ params }) => {
      const versionId = String(params.id ?? "");
      const targetVersion = versions.find((version) => version.id === versionId);

      if (!targetVersion) {
        return HttpResponse.json({ message: "Not found" }, { status: 404 });
      }

      versions = versions.map((version) => ({
        ...version,
        isDefault: version.id === versionId,
      }));

      const updatedTarget = versions.find((version) => version.id === versionId);

      return HttpResponse.json(updatedTarget);
    }),
  );

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

  beforeEach(() => {
    versions = structuredClone(baseVersions);
  });

  it("lists versions with label, key, status, and default badge", async () => {
    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("versions-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("version-label-ver-v1")).toHaveTextContent("Version 1");
    expect(screen.getByTestId("version-key-ver-v1")).toHaveTextContent("v1");
    expect(screen.getByTestId("version-status-ver-v1")).toHaveTextContent("published");
    expect(screen.getByTestId("version-default-badge-ver-v1")).toBeInTheDocument();

    expect(screen.getByTestId("version-label-ver-v2")).toHaveTextContent("Version 2 Draft");
    expect(screen.getByTestId("version-key-ver-v2")).toHaveTextContent("v2-draft");
    expect(screen.getByTestId("version-status-ver-v2")).toHaveTextContent("draft");
  });

  it("auto-generates a key from label and creates a new version", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderInspector();

      await user.click(screen.getByRole("button", { name: /New Version/i }));

      await waitFor(() => {
        expect(screen.getByTestId("versions-create-dialog")).toBeInTheDocument();
      });

      await user.type(screen.getByTestId("versions-create-label"), "Version 3");

      expect(screen.getByTestId("versions-create-key")).toHaveValue("v3");

      await user.click(screen.getByRole("button", { name: /Create version/i }));

      await waitFor(() => {
        expect(screen.getByTestId("version-key-ver-created")).toHaveTextContent("v3");
      });

      expect(screen.getByTestId("version-action-feedback-success")).toHaveTextContent(
        "Version v3 created successfully.",
      );

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/versions" && init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("shows duplicate key error when creating a version with an existing key", async () => {
    const user = userEvent.setup();

    renderInspector();

    await user.click(screen.getByRole("button", { name: /New Version/i }));

    await waitFor(() => {
      expect(screen.getByTestId("versions-create-dialog")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("versions-create-label"), "Version 1");
    await user.clear(screen.getByTestId("versions-create-key"));
    await user.type(screen.getByTestId("versions-create-key"), "v1");

    await user.click(screen.getByRole("button", { name: /Create version/i }));

    await waitFor(() => {
      expect(screen.getByTestId("versions-create-error")).toHaveTextContent(
        'Version key "v1" already exists for this space.',
      );
    });
  });

  it("publishes draft versions with optimistic status update", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("*/api/workspace/versions/:id/publish", async ({ params }) => {
        const versionId = String(params.id ?? "");
        await delay(180);

        const current = versions.find((version) => version.id === versionId);
        if (!current) {
          return HttpResponse.json({ message: "Not found" }, { status: 404 });
        }

        const updated: WorkspaceReleaseVersion = {
          ...current,
          status: "published",
          publishedAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z",
        };

        versions = versions.map((version) => (
          version.id === versionId ? updated : version
        ));

        return HttpResponse.json(updated);
      }),
    );

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("version-status-ver-v2")).toHaveTextContent("draft");
    });

    await user.click(
      within(screen.getByTestId("version-list-item-ver-v2")).getByRole("button", {
        name: /^Publish$/i,
      }),
    );

    expect(screen.getByTestId("version-status-ver-v2")).toHaveTextContent("published");

    await waitFor(() => {
      expect(screen.getByTestId("version-action-feedback-success")).toHaveTextContent(
        "Version v2-draft is now published.",
      );
    });
  });

  it("sets selected version as default and removes default from previous one", async () => {
    const user = userEvent.setup();

    renderInspector();

    await waitFor(() => {
      expect(screen.getByTestId("version-default-badge-ver-v1")).toBeInTheDocument();
    });

    const targetVersionItem = screen.getByTestId("version-list-item-ver-v2");
    await user.click(
      within(targetVersionItem).getByRole("button", { name: /^Set default$/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("version-default-badge-ver-v2")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("version-default-badge-ver-v1")).not.toBeInTheDocument();
  });
});

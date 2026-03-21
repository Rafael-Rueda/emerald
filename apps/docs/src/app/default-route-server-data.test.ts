import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCKED_DEFAULT_CONTEXT } from "@/modules/documentation/domain/default-document-context";

const { fetchVersionsMock, fetchNavigationMock } = vi.hoisted(() => ({
  fetchVersionsMock: vi.fn(),
  fetchNavigationMock: vi.fn(),
}));

vi.mock("@/modules/versioning/infrastructure/version-api", () => ({
  fetchVersions: fetchVersionsMock,
}));

vi.mock("@/modules/navigation/infrastructure/navigation-api", () => ({
  fetchNavigation: fetchNavigationMock,
}));

import {
  resolveDefaultDocumentContext,
  resolveDefaultRedirectPath,
} from "./default-route-server-data";

describe("default-route-server-data", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the redirect context using API default version and first navigable slug", async () => {
    fetchVersionsMock.mockResolvedValue({
      status: "success",
      data: {
        space: "guides",
        versions: [
          {
            id: "version-v1",
            label: "Version 1",
            slug: "v1",
            status: "published",
            isDefault: false,
            createdAt: "2026-03-20T00:00:00.000Z",
          },
          {
            id: "version-v2",
            label: "Version 2",
            slug: "v2",
            status: "published",
            isDefault: true,
            createdAt: "2026-03-21T00:00:00.000Z",
          },
        ],
      },
    });

    fetchNavigationMock.mockResolvedValue({
      status: "success",
      data: {
        navigation: {
          space: "guides",
          version: "v2",
          items: [
            {
              id: "group",
              label: "Group",
              slug: "",
              children: [
                {
                  id: "quickstart",
                  label: "Quickstart",
                  slug: "quickstart",
                  children: [],
                },
              ],
            },
          ],
        },
      },
    });

    await expect(resolveDefaultDocumentContext()).resolves.toEqual({
      space: "guides",
      version: "v2",
      slug: "quickstart",
    });

    await expect(resolveDefaultRedirectPath()).resolves.toBe("/guides/v2/quickstart");
    expect(fetchVersionsMock).toHaveBeenCalledWith("guides");
    expect(fetchNavigationMock).toHaveBeenCalledWith("guides", "v2");
  });

  it("falls back to MOCKED_DEFAULT_CONTEXT when versions fetch fails", async () => {
    fetchVersionsMock.mockResolvedValue({
      status: "error",
      message: "offline",
    });

    await expect(resolveDefaultDocumentContext()).resolves.toEqual(
      MOCKED_DEFAULT_CONTEXT,
    );
    expect(fetchNavigationMock).not.toHaveBeenCalled();
  });

  it("falls back when no default version is present in API response", async () => {
    fetchVersionsMock.mockResolvedValue({
      status: "success",
      data: {
        space: "guides",
        versions: [
          {
            id: "version-v1",
            label: "Version 1",
            slug: "v1",
            status: "published",
            isDefault: false,
            createdAt: "2026-03-20T00:00:00.000Z",
          },
        ],
      },
    });

    await expect(resolveDefaultDocumentContext()).resolves.toEqual(
      MOCKED_DEFAULT_CONTEXT,
    );
    expect(fetchNavigationMock).not.toHaveBeenCalled();
  });

  it("falls back when navigation has no navigable slug", async () => {
    fetchVersionsMock.mockResolvedValue({
      status: "success",
      data: {
        space: "guides",
        versions: [
          {
            id: "version-v1",
            label: "Version 1",
            slug: "v1",
            status: "published",
            isDefault: true,
            createdAt: "2026-03-20T00:00:00.000Z",
          },
        ],
      },
    });

    fetchNavigationMock.mockResolvedValue({
      status: "success",
      data: {
        navigation: {
          space: "guides",
          version: "v1",
          items: [
            {
              id: "group",
              label: "Group",
              slug: "",
              children: [],
            },
          ],
        },
      },
    });

    await expect(resolveDefaultDocumentContext()).resolves.toEqual(
      MOCKED_DEFAULT_CONTEXT,
    );
  });
});

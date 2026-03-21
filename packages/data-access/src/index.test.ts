import type { Document, NavigationTree } from "@emerald/contracts";
import { describe, expect, it, vi, afterEach } from "vitest";

import {
  createApiClient,
  documentQueryKeys,
  navigationQueryKeys,
  searchQueryKeys,
  spacesQueryKeys,
  versionQueryKeys,
  workspaceQueryKeys,
  type FetchResult,
} from "./index";

const mockDocument = {
  id: "doc-getting-started",
  title: "Getting Started",
  slug: "getting-started",
  space: "guides",
  version: "v1",
  body: "<p>Hello Emerald</p>",
  headings: [{ id: "h1", text: "Getting Started", level: 1 }],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockNavigationTree = {
  space: "guides",
  version: "v1",
  items: [],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createApiClient", () => {
  it("uses the provided base URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ document: mockDocument }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://localhost:3333/");
    const result = await client.getDocument("guides", "v1", "getting-started");

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/docs/guides/v1/getting-started",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("falls back to NEXT_PUBLIC_API_URL when base URL is omitted", async () => {
    const globalWithProcess = globalThis as typeof globalThis & {
      process?: {
        env: Record<string, string | undefined>;
      } | null;
    };

    if (!globalWithProcess.process) {
      (globalWithProcess as { process: { env: Record<string, string | undefined> } }).process = { env: {} };
    }

    globalWithProcess.process.env.NEXT_PUBLIC_API_URL = "http://env-api.local";

    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ navigation: mockNavigationTree }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    const result = await client.getNavigation("guides", "v1");

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://env-api.local/api/navigation/guides/v1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("retries workspace requests on relative path when absolute API is offline", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        jsonResponse({
          documents: [
            {
              id: "doc-getting-started",
              title: "Getting Started",
              slug: "getting-started",
              space: "guides",
              status: "published",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://localhost:3333");
    const result = await client.getWorkspaceDocuments("space-guides");

    expect(result.status).toBe("success");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3333/api/workspace/documents?spaceId=space-guides",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/workspace/documents?spaceId=space-guides",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("accepts publish responses returned as a workspace document payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          id: "doc-1",
          title: "Getting Started",
          slug: "getting-started",
          space: "guides",
          spaceId: "space-guides",
          releaseVersionId: "ver-v1",
          status: "published",
          content_json: null,
          currentRevisionId: null,
          createdBy: "author@test.com",
          updatedBy: "author@test.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient("http://localhost:3333");
    const result = await client.publishWorkspaceDocument("doc-1");

    expect(result).toEqual({
      status: "success",
      data: {
        success: true,
        message: "Document published successfully.",
      },
    });
  });
});

describe("query key factories", () => {
  it("returns stable tuples", () => {
    expect(documentQueryKeys.all()).toBe(documentQueryKeys.all());
    expect(navigationQueryKeys.all()).toBe(navigationQueryKeys.all());
    expect(versionQueryKeys.all()).toBe(versionQueryKeys.all());
    expect(searchQueryKeys.all()).toBe(searchQueryKeys.all());
    expect(spacesQueryKeys.all()).toBe(spacesQueryKeys.all());
    expect(workspaceQueryKeys.all()).toBe(workspaceQueryKeys.all());

    expect(
      documentQueryKeys.detail("guides", "v1", "getting-started"),
    ).toEqual(["documents", "detail", "guides", "v1", "getting-started"]);

    expect(navigationQueryKeys.detail("guides", "v1")).toEqual([
      "navigation",
      "detail",
      "guides",
      "v1",
    ]);

    expect(versionQueryKeys.detail("guides")).toEqual([
      "versions",
      "detail",
      "guides",
    ]);
    expect(searchQueryKeys.detail("getting started")).toEqual([
      "search",
      "detail",
      "getting started",
    ]);
    expect(spacesQueryKeys.detail("space-guides")).toEqual([
      "spaces",
      "detail",
      "space-guides",
    ]);
    expect(workspaceQueryKeys.aiContext("document", "doc-1")).toEqual([
      "workspace",
      "ai-context",
      "document",
      "doc-1",
    ]);
  });
});

type SuccessData<TResult extends Promise<FetchResult<unknown>>> = Extract<
  Awaited<TResult>,
  { status: "success" }
>["data"];

type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() =>
  T extends B ? 1 : 2
  ? true
  : false;

type Assert<T extends true> = T;

type Client = ReturnType<typeof createApiClient>;
type DocumentData = SuccessData<ReturnType<Client["getDocument"]>>;
type NavigationData = SuccessData<ReturnType<Client["getNavigation"]>>;

type _documentDataMatchesContract = Assert<IsEqual<DocumentData, Document>>;
type _navigationDataMatchesContract = Assert<
  IsEqual<NavigationData, NavigationTree>
>;

const _documentAssignmentCompiles: Document = {} as DocumentData;

// @ts-expect-error getDocument success data is a Document, not an arbitrary object
const _documentAssignmentFails: { foo: string } = {} as DocumentData;

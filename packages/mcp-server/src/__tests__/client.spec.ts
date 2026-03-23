import { AiContextResponseSchema } from "@emerald/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { searchDocumentation } from "../client";

describe("searchDocumentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts semantic search payload to the default API URL", async () => {
    const mockResponseBody = {
      entityId: "how to deploy",
      entityType: "semantic-search",
      chunks: [],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await searchDocumentation(
      {
        query: "how to deploy",
        space: "guides",
        version: "v1",
      },
      {
        fetchImplementation: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/public/ai-context/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "how to deploy",
          space: "guides",
          version: "v1",
        }),
      },
    );

    expect(result).toEqual(mockResponseBody);
    expect(AiContextResponseSchema.parse(result)).toEqual(mockResponseBody);
  });

  it("respects API_URL overrides and trims trailing slashes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ entityId: "q", entityType: "semantic-search", chunks: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await searchDocumentation(
      {
        query: "q",
        space: "docs",
        version: "v2",
      },
      {
        apiUrl: "http://localhost:9999///",
        fetchImplementation: fetchMock,
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:9999/api/public/ai-context/search",
      expect.any(Object),
    );
  });

  it("throws a clear error for non-2xx HTTP responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("Bad Request", {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    await expect(
      searchDocumentation(
        {
          query: "q",
          space: "docs",
          version: "v1",
        },
        {
          fetchImplementation: fetchMock,
        },
      ),
    ).rejects.toThrow("Semantic search API request failed (400 Bad Request)");
  });

  it("throws a clear error for network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(
      searchDocumentation(
        {
          query: "q",
          space: "docs",
          version: "v1",
        },
        {
          apiUrl: "http://localhost:9999",
          fetchImplementation: fetchMock,
        },
      ),
    ).rejects.toThrow(
      "Failed to call http://localhost:9999/api/public/ai-context/search: connect ECONNREFUSED",
    );
  });
});

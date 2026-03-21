import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { createTestServer } from "@emerald/test-utils";
import { fetchSearch } from "./search-api";

describe("fetchSearch — success scenario", () => {
  const server = createTestServer({ search: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns validated search results for matching queries", async () => {
    const result = await fetchSearch("getting");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.query).toBe("getting");
      expect(result.data.results.length).toBeGreaterThan(0);
      expect(result.data.totalCount).toBe(result.data.results.length);
    }
  });

  it("returns a valid empty result set when no documents match", async () => {
    const result = await fetchSearch("zzzzzzzzzzz");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.query).toBe("zzzzzzzzzzz");
      expect(result.data.results).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    }
  });
});

describe("fetchSearch — error scenario", () => {
  const server = createTestServer({ search: "error" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns error when the request fails", async () => {
    const result = await fetchSearch("getting");

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("500");
    }
  });
});

describe("fetchSearch — malformed payload scenario", () => {
  const server = createTestServer({ search: "malformed" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns validation-error when payload schema validation fails", async () => {
    const result = await fetchSearch("getting");

    expect(result.status).toBe("validation-error");
    if (result.status === "validation-error") {
      expect(result.message).toContain("Invalid search response");
    }
  });
});

describe("fetchSearch — public payload adaptation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("adapts public responses shaped as { results: [...] }", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: "sr-getting-started",
              title: "Getting Started",
              slug: "getting-started",
              space: "guides",
              version: "v1",
              snippet: "Start building with Emerald",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSearch("getting");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/api/public/search?q=getting");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.query).toBe("getting");
      expect(result.data.totalCount).toBe(1);
      expect(result.data.results[0]?.slug).toBe("getting-started");
    }
  });
});

describe("fetchSearch URL resolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("uses NEXT_PUBLIC_API_URL as an absolute origin when configured", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333///";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    await fetchSearch("getting started");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/public/search?q=getting%20started",
    );
  });

  it("falls back to relative MSW endpoint when offline fallback mode is active", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";
    (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__ = true;

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    await fetchSearch("getting started");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search?q=getting%20started",
    );
  });
});

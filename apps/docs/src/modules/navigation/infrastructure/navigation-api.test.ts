import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { createTestServer } from "@emerald/test-utils";
import { fetchNavigation } from "./navigation-api";

describe("fetchNavigation — success", () => {
  const server = createTestServer({ navigation: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns success with validated navigation for a valid space/version", async () => {
    const result = await fetchNavigation("guides", "v1");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.navigation.space).toBe("guides");
      expect(result.data.navigation.version).toBe("v1");
      expect(result.data.navigation.items.length).toBeGreaterThan(0);
      expect(result.data.navigation.items[0].label).toBe("Getting Started");
    }
  });

  it("returns not-found for a non-existent navigation tree", async () => {
    const result = await fetchNavigation("nonexistent", "v1");
    expect(result.status).toBe("not-found");
  });
});

describe("fetchNavigation — error", () => {
  const server = createTestServer({ navigation: "error" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns error for server failures", async () => {
    const result = await fetchNavigation("guides", "v1");

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("500");
    }
  });
});

describe("fetchNavigation — malformed", () => {
  const server = createTestServer({ navigation: "malformed" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns validation-error for malformed payloads", async () => {
    const result = await fetchNavigation("guides", "v1");

    expect(result.status).toBe("validation-error");
    if (result.status === "validation-error") {
      expect(result.message).toContain("Invalid navigation response");
    }
  });
});

describe("fetchNavigation URL resolution", () => {
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

    await fetchNavigation("guides", "v1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/public/spaces/guides/versions/v1/navigation",
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

    await fetchNavigation("guides", "v1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/navigation/guides/v1",
    );
  });

  it("adapts public API navigation payloads into the docs contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            space: "guides",
            version: "v1",
            items: [
              {
                id: "node-1",
                label: "Getting Started",
                slug: "getting-started",
                nodeType: "document",
                documentId: "doc-1",
                externalUrl: null,
                children: [],
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchNavigation("guides", "v1");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.navigation.items).toEqual([
        {
          id: "node-1",
          label: "Getting Started",
          slug: "getting-started",
          nodeType: "document",
          documentId: "doc-1",
          externalUrl: null,
          children: [],
        },
      ]);
    }
  });
});

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { createTestServer } from "@emerald/test-utils";
import { fetchDocument } from "./document-api";

describe("fetchDocument", () => {
  const server = createTestServer({ document: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns success with validated document for a valid identity", async () => {
    const result = await fetchDocument({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.document.title).toBe("Getting Started");
      expect(result.data.document.space).toBe("guides");
      expect(result.data.document.version).toBe("v1");
      expect(result.data.document.slug).toBe("getting-started");
    }
  });

  it("returns not-found for a non-existent document", async () => {
    const result = await fetchDocument({
      space: "guides",
      version: "v1",
      slug: "nonexistent",
    });

    expect(result.status).toBe("not-found");
  });
});

describe("fetchDocument error scenarios", () => {
  describe("server error", () => {
    const server = createTestServer({ document: "error" });

    beforeAll(() => server.start());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.stop());

    it("returns error for server failures", async () => {
      const result = await fetchDocument({
        space: "guides",
        version: "v1",
        slug: "getting-started",
      });

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.message).toContain("500");
      }
    });
  });

  describe("malformed payload", () => {
    const server = createTestServer({ document: "malformed" });

    beforeAll(() => server.start());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.stop());

    it("returns validation-error for malformed payloads", async () => {
      const result = await fetchDocument({
        space: "guides",
        version: "v1",
        slug: "getting-started",
      });

      expect(result.status).toBe("validation-error");
      if (result.status === "validation-error") {
        expect(result.message).toContain("Invalid document response");
      }
    });
  });
});

describe("fetchDocument URL resolution", () => {
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

    await fetchDocument({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/public/spaces/guides/versions/v1/documents/getting-started",
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

    await fetchDocument({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/docs/guides/v1/getting-started",
    );
  });

  it("adapts public API document payloads into the docs contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            document: {
              id: "doc-1",
              title: "Getting Started",
              slug: "getting-started",
              space: "guides",
              version: "v1",
              rendered_html: "<h2 id=\"intro\">Introduction</h2><p>Hello</p>",
              updatedAt: "2026-03-21T00:00:00.000Z",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchDocument({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.document.body).toContain("<p>Hello</p>");
      expect(result.data.document.headings).toEqual([
        {
          id: "intro",
          text: "Introduction",
          level: 2,
        },
      ]);
    }
  });
});

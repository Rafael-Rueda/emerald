import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { createTestServer } from "@emerald/test-utils";
import { fetchVersions } from "./version-api";

describe("fetchVersions — success", () => {
  const server = createTestServer({ versions: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns validated version metadata for a known docs space", async () => {
    const result = await fetchVersions("guides");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.space).toBe("guides");
      expect(result.data.versions.length).toBeGreaterThan(0);
      expect(result.data.versions.some((version) => version.isDefault)).toBe(true);
    }
  });

  it("returns not-found for an unknown docs space", async () => {
    const result = await fetchVersions("unknown-space");
    expect(result.status).toBe("not-found");
  });
});

describe("fetchVersions — error", () => {
  const server = createTestServer({ versions: "error" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns error when the request fails", async () => {
    const result = await fetchVersions("guides");

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toContain("500");
    }
  });
});

describe("fetchVersions — malformed payload", () => {
  const server = createTestServer({ versions: "malformed" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("returns validation-error for malformed version metadata", async () => {
    const result = await fetchVersions("guides");

    expect(result.status).toBe("validation-error");
    if (result.status === "validation-error") {
      expect(result.message).toContain("Invalid version metadata response");
    }
  });
});

describe("fetchVersions URL resolution", () => {
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

    await fetchVersions("guides");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/api/public/spaces/guides/versions",
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

    await fetchVersions("guides");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/versions/guides",
    );
  });

  it("adapts public API version payloads into the docs contract", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            space: "guides",
            versions: [
              {
                id: "version-1",
                key: "v1",
                label: "Version 1",
                status: "published",
                isDefault: true,
                createdAt: "2026-03-20T00:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchVersions("guides");

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.versions[0]?.slug).toBe("v1");
      expect(result.data.versions[0]?.label).toBe("Version 1");
    }
  });
});

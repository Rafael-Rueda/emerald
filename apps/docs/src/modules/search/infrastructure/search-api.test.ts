import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
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

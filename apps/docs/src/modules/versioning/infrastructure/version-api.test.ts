import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
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

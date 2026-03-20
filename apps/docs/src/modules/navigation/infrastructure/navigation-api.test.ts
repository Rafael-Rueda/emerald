import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
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

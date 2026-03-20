import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
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

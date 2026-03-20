import { describe, it, expect } from "vitest";
import {
  buildDocumentIdentity,
  buildDocumentApiPath,
  isValidDocumentIdentity,
} from "./document-identity";

describe("buildDocumentIdentity", () => {
  it("normalizes route params to lowercase trimmed values", () => {
    const identity = buildDocumentIdentity("  Guides ", " V1 ", " Getting-Started ");
    expect(identity).toEqual({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });
  });

  it("preserves already-normalized values", () => {
    const identity = buildDocumentIdentity("guides", "v1", "getting-started");
    expect(identity).toEqual({
      space: "guides",
      version: "v1",
      slug: "getting-started",
    });
  });
});

describe("buildDocumentApiPath", () => {
  it("builds the expected API path", () => {
    const identity = { space: "guides", version: "v1", slug: "getting-started" };
    expect(buildDocumentApiPath(identity)).toBe("/api/docs/guides/v1/getting-started");
  });

  it("builds path for arbitrary identity", () => {
    const identity = { space: "api", version: "v2", slug: "overview" };
    expect(buildDocumentApiPath(identity)).toBe("/api/docs/api/v2/overview");
  });
});

describe("isValidDocumentIdentity", () => {
  it("returns true for valid identity", () => {
    const identity = { space: "guides", version: "v1", slug: "getting-started" };
    expect(isValidDocumentIdentity(identity)).toBe(true);
  });

  it("returns false when space is empty", () => {
    const identity = { space: "", version: "v1", slug: "getting-started" };
    expect(isValidDocumentIdentity(identity)).toBe(false);
  });

  it("returns false when version is empty", () => {
    const identity = { space: "guides", version: "", slug: "getting-started" };
    expect(isValidDocumentIdentity(identity)).toBe(false);
  });

  it("returns false when slug is empty", () => {
    const identity = { space: "guides", version: "v1", slug: "" };
    expect(isValidDocumentIdentity(identity)).toBe(false);
  });
});

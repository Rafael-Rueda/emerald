import { describe, expect, it } from "vitest";
import { generateDocumentSlug } from "./slug";

describe("generateDocumentSlug", () => {
  it("slugifies title values", () => {
    expect(generateDocumentSlug("Hello World")).toBe("hello-world");
  });

  it("normalizes repeated whitespace and punctuation", () => {
    expect(generateDocumentSlug("  API   Guides!!! v2 ")).toBe("api-guides-v2");
  });
});

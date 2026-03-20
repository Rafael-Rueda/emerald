import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const showBar = false;
    expect(cn("foo", showBar && "bar", "baz")).toBe("foo baz");
  });

  it("resolves Tailwind conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles undefined/null inputs", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

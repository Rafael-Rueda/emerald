import { describe, it, expect } from "vitest";
import AdminEntryPage from "./page";

describe("/admin entry page", () => {
  it("exports a page component for the default admin section", () => {
    expect(typeof AdminEntryPage).toBe("function");
  });
});

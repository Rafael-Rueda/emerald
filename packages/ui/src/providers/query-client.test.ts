import { describe, it, expect } from "vitest";
import { createQueryClient } from "./query-client";

describe("createQueryClient", () => {
  it("returns a QueryClient instance", () => {
    const client = createQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe("function");
    expect(typeof client.getMutationCache).toBe("function");
  });

  it("returns a new instance each time", () => {
    const client1 = createQueryClient();
    const client2 = createQueryClient();
    expect(client1).not.toBe(client2);
  });

  it("uses shared default query options", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60_000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it("uses shared default mutation options", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(0);
  });
});

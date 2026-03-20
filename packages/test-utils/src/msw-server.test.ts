import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { createTestServer } from "./msw-server";

describe("createTestServer", () => {
  const server = createTestServer();

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("creates a server that intercepts API requests", async () => {
    const res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.document).toBeDefined();
    expect(data.document.title).toBe("Getting Started");
  });

  it("supports runtime handler overrides via use()", async () => {
    server.use(
      http.get("http://localhost/api/docs/:space/:version/:slug", () => {
        return HttpResponse.json({ custom: true }, { status: 200 });
      }),
    );

    const res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
    const data = await res.json();
    expect(data.custom).toBe(true);
  });

  it("resets to original handlers after resetHandlers()", async () => {
    // Use a custom override
    server.use(
      http.get("http://localhost/api/docs/:space/:version/:slug", () => {
        return HttpResponse.json({ custom: true });
      }),
    );

    // Verify override is active
    let res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
    let data = await res.json();
    expect(data.custom).toBe(true);

    // Reset
    server.resetHandlers();

    // Verify original handler is restored
    res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
    data = await res.json();
    expect(data.document).toBeDefined();
    expect(data.document.title).toBe("Getting Started");
  });

  it("exposes the raw MSW server for advanced usage", () => {
    expect(server.raw).toBeDefined();
    expect(typeof server.raw.listen).toBe("function");
    expect(typeof server.raw.close).toBe("function");
  });
});

describe("createTestServer with error scenario", () => {
  const server = createTestServer({ document: "error" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("applies error scenario from config", async () => {
    const res = await fetch("http://localhost/api/docs/guides/v1/getting-started");
    expect(res.status).toBe(500);
  });
});

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { createTestServer } from "@emerald/test-utils/msw-server";
import { createAllHandlers } from "./handlers";
import { DocumentResponseSchema } from "@emerald/contracts";

const API_BASE = "http://localhost";

describe("Scenario switching and handler reapply", () => {
  const server = createTestServer({ document: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("starts with success scenario from config", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = DocumentResponseSchema.safeParse(data);
    expect(parsed.success).toBe(true);
  });

  it("supports runtime override to error scenario via use()", async () => {
    server.use(
      http.get(`${API_BASE}/api/docs/:space/:version/:slug`, () => {
        return HttpResponse.json({ error: "Server Error" }, { status: 500 });
      }),
    );

    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(500);
  });

  it("restores original handlers after resetHandlers", async () => {
    // Apply override
    server.use(
      http.get(`${API_BASE}/api/docs/:space/:version/:slug`, () => {
        return HttpResponse.json({ error: "Server Error" }, { status: 500 });
      }),
    );

    // Verify override active
    let res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(500);

    // Reset
    server.resetHandlers();

    // Verify original success scenario restored
    res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.document.title).toBe("Getting Started");
  });

  it("can reapply handlers with a different scenario config", async () => {
    // Replace all handlers with error config
    const errorHandlers = createAllHandlers({ document: "error" });
    server.resetHandlers(...errorHandlers);

    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(500);
  });

  it("can reapply handlers with malformed scenario config", async () => {
    const malformedHandlers = createAllHandlers({ document: "malformed" });
    server.resetHandlers(...malformedHandlers);

    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Malformed returns 200 but fails schema validation
    const parsed = DocumentResponseSchema.safeParse(data);
    expect(parsed.success).toBe(false);
  });

  it("can reapply handlers with not-found scenario config", async () => {
    const notFoundHandlers = createAllHandlers({ document: "not-found" });
    server.resetHandlers(...notFoundHandlers);

    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(404);
  });

  it("supports mixed scenario configs across domains", async () => {
    const mixedHandlers = createAllHandlers({
      document: "success",
      search: "error",
      workspaceDocuments: "malformed",
    });
    server.resetHandlers(...mixedHandlers);

    // Document: success
    const docRes = await fetch(
      `${API_BASE}/api/docs/guides/v1/getting-started`,
    );
    expect(docRes.status).toBe(200);
    const docData = await docRes.json();
    expect(docData.document.title).toBe("Getting Started");

    // Search: error
    const searchRes = await fetch(`${API_BASE}/api/search?q=test`);
    expect(searchRes.status).toBe(500);

    // Workspace documents: malformed (returns { documents: "broken" })
    const wsRes = await fetch(`${API_BASE}/api/workspace/documents`);
    expect(wsRes.status).toBe(200);
    const wsData = await wsRes.json();
    // Malformed data: documents is a string "broken" instead of an array
    expect(wsData.documents).toBe("broken");
  });
});

describe("resolveScenarios", () => {
  it("defaults all scenarios to success", async () => {
    const { resolveScenarios } = await import("./scenarios");
    const resolved = resolveScenarios({});
    expect(resolved.document).toBe("success");
    expect(resolved.navigation).toBe("success");
    expect(resolved.versions).toBe("success");
    expect(resolved.search).toBe("success");
    expect(resolved.aiContext).toBe("success");
    expect(resolved.workspaceDocuments).toBe("success");
    expect(resolved.workspaceNavigation).toBe("success");
    expect(resolved.workspaceVersions).toBe("success");
    expect(resolved.workspaceMutation).toBe("success");
  });

  it("overrides specified scenarios while keeping defaults", async () => {
    const { resolveScenarios } = await import("./scenarios");
    const resolved = resolveScenarios({ document: "error", search: "loading" });
    expect(resolved.document).toBe("error");
    expect(resolved.search).toBe("loading");
    expect(resolved.navigation).toBe("success");
  });
});

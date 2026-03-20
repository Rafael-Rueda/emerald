import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import {
  DocumentResponseSchema,
  NavigationResponseSchema,
  VersionListResponseSchema,
  SearchResponseSchema,
  AiContextResponseSchema,
  WorkspaceDocumentListSchema,
  WorkspaceDocumentSchema,
  WorkspaceNavigationListSchema,
  WorkspaceNavigationSchema,
  WorkspaceVersionListSchema,
  WorkspaceVersionSchema,
  MutationResultSchema,
} from "@emerald/contracts";
import { createTestServer } from "@emerald/test-utils/msw-server";

const API_BASE = "http://localhost";

describe("MSW Handlers: Public Success Scenarios", () => {
  const server = createTestServer({ document: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("resolves a known document", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = DocumentResponseSchema.parse(data);
    expect(parsed.document.title).toBe("Getting Started");
    expect(parsed.document.slug).toBe("getting-started");
  });

  it("returns 404 for unknown document", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/nonexistent`);
    expect(res.status).toBe(404);
  });

  it("resolves a navigation tree", async () => {
    const res = await fetch(`${API_BASE}/api/navigation/guides/v1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = NavigationResponseSchema.parse(data);
    expect(parsed.navigation.space).toBe("guides");
    expect(parsed.navigation.items.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown navigation tree", async () => {
    const res = await fetch(`${API_BASE}/api/navigation/unknown/v1`);
    expect(res.status).toBe(404);
  });

  it("resolves a version list", async () => {
    const res = await fetch(`${API_BASE}/api/versions/guides`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = VersionListResponseSchema.parse(data);
    expect(parsed.versions.length).toBeGreaterThan(0);
  });

  it("returns 404 for unknown version space", async () => {
    const res = await fetch(`${API_BASE}/api/versions/unknown`);
    expect(res.status).toBe(404);
  });

  it("resolves search results", async () => {
    const res = await fetch(`${API_BASE}/api/search?q=getting`);
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = SearchResponseSchema.parse(data);
    expect(parsed.query).toBe("getting");
    expect(parsed.results.length).toBeGreaterThan(0);
  });

  it("returns empty results for no-match search", async () => {
    const res = await fetch(`${API_BASE}/api/search?q=zzzzzzzzzzz`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(0);
    expect(data.totalCount).toBe(0);
  });
});

describe("MSW Handlers: Workspace Success Scenarios", () => {
  const server = createTestServer();

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("resolves workspace document list", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/documents`);
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceDocumentListSchema.parse(data);
  });

  it("resolves workspace document detail", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/documents/doc-getting-started`,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceDocumentSchema.parse(data);
    expect(data.title).toBe("Getting Started");
  });

  it("returns 404 for unknown workspace document", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/documents/nonexistent`);
    expect(res.status).toBe(404);
  });

  it("resolves workspace navigation list", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/navigation`);
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceNavigationListSchema.parse(data);
  });

  it("resolves workspace navigation detail", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/navigation/nav-getting-started`,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceNavigationSchema.parse(data);
    expect(data.label).toBe("Getting Started");
  });

  it("resolves workspace version list", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/versions`);
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceVersionListSchema.parse(data);
  });

  it("resolves workspace version detail", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/versions/ver-v1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    WorkspaceVersionSchema.parse(data);
    expect(data.label).toBe("v1");
  });

  it("resolves mutation success", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/documents/doc-getting-started/publish`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    MutationResultSchema.parse(data);
    expect(data.success).toBe(true);
  });

  it("resolves navigation reorder mutation", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/navigation/nav-getting-started/reorder`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("resolves version publish mutation", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/versions/ver-v2/publish`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

describe("MSW Handlers: AI Context Success Scenarios", () => {
  const server = createTestServer();

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("resolves AI context for an entity", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/ai-context/document/doc-getting-started`,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const parsed = AiContextResponseSchema.parse(data);
    expect(parsed.entityId).toBe("doc-getting-started");
    expect(parsed.entityType).toBe("document");
    expect(parsed.chunks.length).toBeGreaterThan(0);
  });

  it("AI context chunks include source references with provenance", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/ai-context/document/doc-getting-started`,
    );
    const data = await res.json();
    const parsed = AiContextResponseSchema.parse(data);
    for (const chunk of parsed.chunks) {
      expect(chunk.source.documentId).toBeTruthy();
      expect(chunk.source.versionLabel).toBeTruthy();
      expect(chunk.source.navigationLabel).toBeTruthy();
      expect(chunk.source.sectionId).toBeTruthy();
    }
  });
});

describe("MSW Handlers: Error Scenarios", () => {
  const server = createTestServer({
    document: "error",
    navigation: "error",
    versions: "error",
    search: "error",
    aiContext: "error",
    workspaceDocuments: "error",
    workspaceNavigation: "error",
    workspaceVersions: "error",
    workspaceMutation: "error",
  });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("public document returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(500);
  });

  it("navigation returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/navigation/guides/v1`);
    expect(res.status).toBe(500);
  });

  it("versions returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/versions/guides`);
    expect(res.status).toBe(500);
  });

  it("search returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/search?q=test`);
    expect(res.status).toBe(500);
  });

  it("ai context returns 500", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/ai-context/document/doc-1`,
    );
    expect(res.status).toBe(500);
  });

  it("workspace documents returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/documents`);
    expect(res.status).toBe(500);
  });

  it("workspace navigation returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/navigation`);
    expect(res.status).toBe(500);
  });

  it("workspace versions returns 500", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/versions`);
    expect(res.status).toBe(500);
  });

  it("workspace mutation returns 500", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/documents/doc-1/publish`,
      { method: "POST" },
    );
    expect(res.status).toBe(500);
  });
});

describe("MSW Handlers: Malformed Scenarios", () => {
  const server = createTestServer({
    document: "malformed",
    navigation: "malformed",
    versions: "malformed",
    search: "malformed",
    aiContext: "malformed",
    workspaceDocuments: "malformed",
    workspaceNavigation: "malformed",
    workspaceVersions: "malformed",
    workspaceMutation: "malformed",
  });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("malformed document returns 200 but fails schema validation", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => DocumentResponseSchema.parse(data)).toThrow();
  });

  it("malformed navigation returns 200 but fails schema validation", async () => {
    const res = await fetch(`${API_BASE}/api/navigation/guides/v1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => NavigationResponseSchema.parse(data)).toThrow();
  });

  it("malformed versions returns 200 but fails schema validation", async () => {
    const res = await fetch(`${API_BASE}/api/versions/guides`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => VersionListResponseSchema.parse(data)).toThrow();
  });

  it("malformed search returns 200 but fails schema validation", async () => {
    const res = await fetch(`${API_BASE}/api/search?q=test`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => SearchResponseSchema.parse(data)).toThrow();
  });

  it("malformed AI context returns 200 but fails schema validation", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/ai-context/document/doc-1`,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => AiContextResponseSchema.parse(data)).toThrow();
  });

  it("malformed workspace documents returns 200 but fails schema validation", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/documents`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => WorkspaceDocumentListSchema.parse(data)).toThrow();
  });

  it("malformed workspace mutation returns 200 but fails schema validation", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/documents/doc-1/publish`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(() => MutationResultSchema.parse(data)).toThrow();
  });
});

describe("MSW Handlers: Not-Found Scenarios", () => {
  const server = createTestServer({
    document: "not-found",
    navigation: "not-found",
    versions: "not-found",
    search: "not-found",
    aiContext: "not-found",
    workspaceDocuments: "not-found",
    workspaceNavigation: "not-found",
    workspaceVersions: "not-found",
    workspaceMutation: "not-found",
  });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("document not-found returns 404", async () => {
    const res = await fetch(`${API_BASE}/api/docs/guides/v1/getting-started`);
    expect(res.status).toBe(404);
  });

  it("navigation not-found returns 404", async () => {
    const res = await fetch(`${API_BASE}/api/navigation/guides/v1`);
    expect(res.status).toBe(404);
  });

  it("versions not-found returns 404", async () => {
    const res = await fetch(`${API_BASE}/api/versions/guides`);
    expect(res.status).toBe(404);
  });

  it("search not-found returns empty results", async () => {
    const res = await fetch(`${API_BASE}/api/search?q=anything`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toHaveLength(0);
  });

  it("AI context not-found returns empty chunks", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/ai-context/document/doc-1`,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chunks).toHaveLength(0);
  });

  it("workspace documents not-found returns empty list", async () => {
    const res = await fetch(`${API_BASE}/api/workspace/documents`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.documents).toHaveLength(0);
  });

  it("workspace mutation not-found returns failure", async () => {
    const res = await fetch(
      `${API_BASE}/api/workspace/documents/doc-1/publish`,
      { method: "POST" },
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

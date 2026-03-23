import { describe, it, expect } from "vitest";
import {
  DocumentSchema,
  WorkspaceDocumentSchema,
  DocumentContentSchema,
  RevisionSchema,
  NavigationNodeSchema,
  ReleaseVersionSchema,
  SpaceSchema,
  AssetSchema,
  DocumentResponseSchema,
  NavigationResponseSchema,
  VersionListResponseSchema,
  SearchResponseSchema,
  AiContextResponseSchema,
  SemanticSearchQuerySchema,
  WorkspaceDocumentListSchema,
  WorkspaceNavigationListSchema,
  WorkspaceVersionListSchema,
  MutationResultSchema,
} from "./index";

const validDocumentContent = {
  type: "doc",
  version: 1,
  children: [
    {
      type: "heading",
      id: "intro",
      level: 2,
      children: [{ type: "text", text: "Introduction" }],
    },
    {
      type: "paragraph",
      children: [{ type: "text", text: "Welcome to Emerald." }],
    },
    {
      type: "ordered_list",
      items: [
        { children: [{ type: "text", text: "Step 1" }] },
        { children: [{ type: "text", text: "Step 2" }] },
      ],
    },
    {
      type: "unordered_list",
      items: [
        { children: [{ type: "text", text: "A" }] },
        { children: [{ type: "text", text: "B" }] },
      ],
    },
    {
      type: "callout",
      tone: "info",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Helpful note" }],
        },
      ],
    },
    {
      type: "code_block",
      language: "ts",
      code: "console.log('hi')",
    },
    {
      type: "image",
      assetId: "asset-1",
      alt: "Architecture diagram",
      caption: "Figure 1",
    },
    {
      type: "table",
      columns: ["Feature", "Status"],
      rows: [["Contracts", "Done"]],
    },
    {
      type: "tabs",
      items: [
        {
          label: "Overview",
          children: [
            {
              type: "callout",
              tone: "success",
              children: [
                {
                  type: "code_block",
                  language: "bash",
                  code: "pnpm test -- --run",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("Zod Contracts", () => {
  describe("DocumentResponseSchema", () => {
    it("accepts valid document response", () => {
      const result = DocumentResponseSchema.safeParse({
        document: {
          id: "doc-1",
          title: "Test",
          slug: "test",
          space: "guides",
          version: "v1",
          body: "<p>Hello</p>",
          headings: [{ id: "h1", text: "Heading", level: 2 }],
          updatedAt: "2025-01-01T00:00:00Z",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid document response", () => {
      const result = DocumentResponseSchema.safeParse({
        document: { id: 123, title: null },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Slug validation", () => {
    it("accepts URL-safe slug on DocumentSchema", () => {
      const result = DocumentSchema.safeParse({
        id: "doc-1",
        title: "Test",
        slug: "hello-world",
        space: "guides",
        version: "v1",
        body: "<p>test</p>",
        headings: [],
        updatedAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(true);
    });

    it("rejects non URL-safe slugs on DocumentSchema", () => {
      expect(
        DocumentSchema.safeParse({
          id: "doc-1",
          title: "Test",
          slug: "Hello World",
          space: "guides",
          version: "v1",
          body: "<p>test</p>",
          headings: [],
          updatedAt: "2025-01-01T00:00:00Z",
        }).success,
      ).toBe(false);

      expect(
        DocumentSchema.safeParse({
          id: "doc-1",
          title: "Test",
          slug: "a/b",
          space: "guides",
          version: "v1",
          body: "<p>test</p>",
          headings: [],
          updatedAt: "2025-01-01T00:00:00Z",
        }).success,
      ).toBe(false);
    });

    it("rejects non URL-safe slugs on WorkspaceDocumentSchema", () => {
      expect(
        WorkspaceDocumentSchema.safeParse({
          id: "doc-1",
          title: "Test",
          slug: "Hello World",
          space: "guides",
          status: "draft",
          updatedAt: "2025-01-01T00:00:00Z",
        }).success,
      ).toBe(false);
    });
  });

  describe("NavigationResponseSchema", () => {
    it("accepts valid navigation response", () => {
      const result = NavigationResponseSchema.safeParse({
        navigation: {
          space: "guides",
          version: "v1",
          items: [
            {
              id: "nav-1",
              label: "Getting Started",
              slug: "getting-started",
              nodeType: "document",
              documentId: "doc-1",
              externalUrl: null,
              children: [],
            },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid navigation response", () => {
      const result = NavigationResponseSchema.safeParse({
        navigation: "broken",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("VersionListResponseSchema", () => {
    it("accepts valid version list response", () => {
      const result = VersionListResponseSchema.safeParse({
        space: "guides",
        versions: [
          {
            id: "v1",
            label: "v1",
            slug: "v1",
            status: "published",
            isDefault: true,
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid version list response", () => {
      const result = VersionListResponseSchema.safeParse({
        versions: [{ broken: true }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SearchResponseSchema", () => {
    it("accepts valid search response", () => {
      const result = SearchResponseSchema.safeParse({
        query: "test",
        results: [
          {
            id: "sr-1",
            title: "Test",
            slug: "test",
            space: "guides",
            version: "v1",
            snippet: "Test snippet",
          },
        ],
        totalCount: 1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid search response", () => {
      const result = SearchResponseSchema.safeParse({
        results: "not-an-array",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AiContextResponseSchema", () => {
    it("accepts valid AI context response", () => {
      const result = AiContextResponseSchema.safeParse({
        entityId: "doc-1",
        entityType: "document",
        chunks: [
          {
            id: "chunk-1",
            content: "Some content",
            relevanceScore: 0.9,
            source: {
              documentId: "doc-1",
              documentTitle: "Test",
              versionId: "v1",
              versionLabel: "v1",
              navigationLabel: "Test",
              sectionId: "sec-1",
              sectionTitle: "Section",
              slug: "test",
              space: "guides",
            },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid AI context response", () => {
      const result = AiContextResponseSchema.safeParse({
        chunks: "not-an-array",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SemanticSearchQuerySchema", () => {
    it("accepts valid semantic search query", () => {
      const result = SemanticSearchQuerySchema.safeParse({
        query: "x",
        space: "guides",
        version: "v1",
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty and malformed semantic search query payloads", () => {
      expect(SemanticSearchQuerySchema.safeParse({}).success).toBe(false);
      expect(SemanticSearchQuerySchema.safeParse({ query: "" }).success).toBe(false);
      expect(
        SemanticSearchQuerySchema.safeParse({
          q: "x",
          space: "guides",
          version: "v1",
        }).success,
      ).toBe(false);
    });
  });

  describe("WorkspaceDocumentListSchema", () => {
    it("accepts valid workspace document list", () => {
      const result = WorkspaceDocumentListSchema.safeParse({
        documents: [
          {
            id: "doc-1",
            title: "Test",
            slug: "test",
            space: "guides",
            status: "published",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid workspace document list", () => {
      const result = WorkspaceDocumentListSchema.safeParse({
        documents: "broken",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("WorkspaceNavigationListSchema", () => {
    it("accepts valid workspace navigation list", () => {
      const result = WorkspaceNavigationListSchema.safeParse({
        items: [
          {
            id: "nav-1",
            spaceId: "space-guides",
            releaseVersionId: null,
            parentId: null,
            documentId: "doc-1",
            label: "Nav",
            slug: "nav",
            order: 0,
            nodeType: "document",
            externalUrl: null,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            children: [
              {
                id: "nav-2",
                spaceId: "space-guides",
                releaseVersionId: null,
                parentId: "nav-1",
                documentId: null,
                label: "Nested",
                slug: "nested",
                order: 0,
                nodeType: "group",
                externalUrl: null,
                createdAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-01T00:00:00Z",
                children: [],
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("WorkspaceVersionListSchema", () => {
    it("accepts valid workspace version list", () => {
      const result = WorkspaceVersionListSchema.safeParse({
        versions: [
          {
            id: "v1",
            label: "v1",
            slug: "v1",
            space: "guides",
            status: "published",
            isDefault: true,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("MutationResultSchema", () => {
    it("accepts valid mutation result", () => {
      const result = MutationResultSchema.safeParse({
        success: true,
        message: "Done",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid mutation result", () => {
      const result = MutationResultSchema.safeParse({
        success: "maybe",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DocumentContentSchema", () => {
    it("accepts all supported blocks including deeply nested tabs > callout > code_block", () => {
      const result = DocumentContentSchema.safeParse(validDocumentContent);
      expect(result.success).toBe(true);
    });

    it("rejects unknown block type", () => {
      const result = DocumentContentSchema.safeParse({
        ...validDocumentContent,
        children: [...validDocumentContent.children, { type: "unknown_block" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid heading level", () => {
      const result = DocumentContentSchema.safeParse({
        ...validDocumentContent,
        children: [
          {
            type: "heading",
            id: "bad",
            level: 7,
            children: [{ type: "text", text: "Too deep" }],
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RevisionSchema", () => {
    it("accepts valid revision payload", () => {
      const result = RevisionSchema.safeParse({
        id: "rev-1",
        documentId: "doc-1",
        revisionNumber: 1,
        contentJson: validDocumentContent,
        createdBy: "user-1",
        createdAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid revision payload", () => {
      const result = RevisionSchema.safeParse({
        id: "rev-1",
        documentId: "doc-1",
        revisionNumber: "first",
        contentJson: validDocumentContent,
        createdBy: "user-1",
        createdAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("NavigationNodeSchema", () => {
    it("accepts valid workspace navigation node", () => {
      const result = NavigationNodeSchema.safeParse({
        id: "nav-1",
        spaceId: "space-1",
        parentId: null,
        documentId: "doc-1",
        label: "Getting Started",
        slug: "getting-started",
        order: 0,
        nodeType: "document",
        externalUrl: null,
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid node type", () => {
      const result = NavigationNodeSchema.safeParse({
        id: "nav-1",
        spaceId: "space-1",
        parentId: null,
        documentId: "doc-1",
        label: "Getting Started",
        slug: "getting-started",
        order: 0,
        nodeType: "folder",
        externalUrl: null,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ReleaseVersionSchema", () => {
    it("accepts valid release version", () => {
      const result = ReleaseVersionSchema.safeParse({
        id: "ver-1",
        spaceId: "space-1",
        key: "v1",
        label: "Version 1",
        status: "published",
        isDefault: true,
        publishedAt: "2025-01-01T00:00:00Z",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid release status", () => {
      const result = ReleaseVersionSchema.safeParse({
        id: "ver-1",
        spaceId: "space-1",
        key: "v1",
        label: "Version 1",
        status: "active",
        isDefault: true,
        publishedAt: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("SpaceSchema", () => {
    it("accepts valid space", () => {
      const result = SpaceSchema.safeParse({
        id: "space-1",
        key: "guides",
        name: "Guides",
        description: "Main docs space",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid space", () => {
      const result = SpaceSchema.safeParse({
        id: "space-1",
        key: "guides",
        name: 123,
        description: "Main docs space",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("AssetSchema", () => {
    it("accepts valid asset", () => {
      const result = AssetSchema.safeParse({
        id: "asset-1",
        bucket: "emerald-assets",
        objectKey: "guides/diagram.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: 800,
        height: 600,
        alt: "Diagram",
        url: "https://example.com/diagram.png",
        createdAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid asset", () => {
      const result = AssetSchema.safeParse({
        id: "asset-1",
        bucket: "emerald-assets",
        objectKey: "guides/diagram.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        width: "800px",
        height: 600,
        alt: null,
        url: "https://example.com/diagram.png",
        createdAt: "2025-01-01T00:00:00Z",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Package exports", () => {
    it("exports DocumentContentSchema, SpaceSchema, and RevisionSchema from @emerald/contracts", async () => {
      const contracts = await import("@emerald/contracts");

      expect(contracts.DocumentContentSchema).toBeDefined();
      expect(contracts.SpaceSchema).toBeDefined();
      expect(contracts.RevisionSchema).toBeDefined();
      expect(contracts.SemanticSearchQuerySchema).toBeDefined();
    });
  });
});

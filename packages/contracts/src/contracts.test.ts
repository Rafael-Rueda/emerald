import { describe, it, expect } from "vitest";
import {
  DocumentResponseSchema,
  NavigationResponseSchema,
  VersionListResponseSchema,
  SearchResponseSchema,
  AiContextResponseSchema,
  WorkspaceDocumentListSchema,
  WorkspaceNavigationListSchema,
  WorkspaceVersionListSchema,
  MutationResultSchema,
} from "./index";

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
            label: "Nav",
            slug: "nav",
            space: "guides",
            parentId: null,
            order: 0,
            updatedAt: "2025-01-01T00:00:00Z",
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
});

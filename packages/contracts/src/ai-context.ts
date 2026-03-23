import { z } from "zod";

/**
 * Zod contracts for AI context chunks and provenance.
 */

export const AiSourceReferenceSchema = z.object({
  documentId: z.string(),
  documentTitle: z.string(),
  versionId: z.string(),
  versionLabel: z.string(),
  navigationLabel: z.string(),
  sectionId: z.string(),
  sectionTitle: z.string(),
  slug: z.string(),
  space: z.string(),
});

export const AiContextChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  relevanceScore: z.number().min(0).max(1),
  source: AiSourceReferenceSchema,
});

export const AiContextResponseSchema = z.object({
  entityId: z.string(),
  entityType: z.string(),
  chunks: z.array(AiContextChunkSchema),
});

export const SemanticSearchQuerySchema = z.object({
  query: z.string().min(1),
  space: z.string().min(1),
  version: z.string().min(1),
});

export type AiSourceReference = z.infer<typeof AiSourceReferenceSchema>;
export type AiContextChunk = z.infer<typeof AiContextChunkSchema>;
export type AiContextResponse = z.infer<typeof AiContextResponseSchema>;
export type SemanticSearchQuery = z.infer<typeof SemanticSearchQuerySchema>;

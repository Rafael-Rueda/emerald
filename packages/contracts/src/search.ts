import { z } from "zod";

/**
 * Zod contracts for search results.
 */

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  space: z.string(),
  version: z.string(),
  snippet: z.string(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
  totalCount: z.number().int(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

import { z } from "zod";

/**
 * Zod contracts for public document resolution.
 */

export const DocumentHeadingSchema = z.object({
  id: z.string(),
  text: z.string(),
  level: z.number().int().min(1).max(6),
});

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  space: z.string(),
  version: z.string(),
  body: z.string(),
  headings: z.array(DocumentHeadingSchema),
  updatedAt: z.string(),
});

export const DocumentResponseSchema = z.object({
  document: DocumentSchema,
});

export type DocumentHeading = z.infer<typeof DocumentHeadingSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

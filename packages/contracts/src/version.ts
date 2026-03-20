import { z } from "zod";

/**
 * Zod contracts for version metadata.
 */

export const VersionSchema = z.object({
  id: z.string(),
  label: z.string(),
  slug: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  isDefault: z.boolean(),
  createdAt: z.string(),
});

export const VersionListResponseSchema = z.object({
  space: z.string(),
  versions: z.array(VersionSchema),
});

export type Version = z.infer<typeof VersionSchema>;
export type VersionListResponse = z.infer<typeof VersionListResponseSchema>;

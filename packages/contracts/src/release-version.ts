import { z } from "zod";

/**
 * Zod contracts for release versions.
 */

export const ReleaseVersionSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  key: z.string(),
  label: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  isDefault: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReleaseVersion = z.infer<typeof ReleaseVersionSchema>;

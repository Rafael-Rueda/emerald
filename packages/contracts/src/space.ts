import { z } from "zod";

/**
 * Zod contracts for spaces.
 */

export const SpaceSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Space = z.infer<typeof SpaceSchema>;

/** Minimal public space shape returned by GET /api/public/spaces. */
export const PublicSpaceSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
});

export type PublicSpace = z.infer<typeof PublicSpaceSchema>;

export const SpaceListResponseSchema = z.object({
  spaces: z.array(PublicSpaceSchema),
});

export type SpaceListResponse = z.infer<typeof SpaceListResponseSchema>;

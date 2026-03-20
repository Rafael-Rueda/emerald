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

import { z } from "zod";

/**
 * Zod contracts for uploaded assets.
 */

export const AssetSchema = z.object({
  id: z.string(),
  bucket: z.string(),
  objectKey: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  url: z.string(),
  createdAt: z.string(),
});

export type Asset = z.infer<typeof AssetSchema>;

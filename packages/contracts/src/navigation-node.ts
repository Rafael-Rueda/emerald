import { z } from "zod";

/**
 * Zod contracts for workspace navigation node entities.
 */

export const NavigationNodeSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  parentId: z.string().nullable(),
  documentId: z.string().nullable(),
  label: z.string(),
  slug: z.string(),
  order: z.number().int(),
  nodeType: z.enum(["document", "group", "external_link"]),
  externalUrl: z.string().nullable(),
});

export type NavigationNode = z.infer<typeof NavigationNodeSchema>;

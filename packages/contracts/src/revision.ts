import { z } from "zod";

import { DocumentContentSchema } from "./document-content.js";

/**
 * Zod contracts for document revisions.
 */

export const RevisionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  revisionNumber: z.number().int(),
  contentJson: DocumentContentSchema,
  createdBy: z.string(),
  createdAt: z.string(),
});

export type Revision = z.infer<typeof RevisionSchema>;

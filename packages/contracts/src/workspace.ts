import { z } from "zod";

/**
 * Zod contracts for workspace/admin entities.
 */

export const WorkspaceDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  space: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  updatedAt: z.string(),
});

export const WorkspaceDocumentListSchema = z.object({
  documents: z.array(WorkspaceDocumentSchema),
});

export const WorkspaceNavigationSchema = z.object({
  id: z.string(),
  label: z.string(),
  slug: z.string(),
  space: z.string(),
  parentId: z.string().nullable(),
  order: z.number().int(),
  updatedAt: z.string(),
});

export const WorkspaceNavigationListSchema = z.object({
  items: z.array(WorkspaceNavigationSchema),
});

export const WorkspaceVersionSchema = z.object({
  id: z.string(),
  label: z.string(),
  slug: z.string(),
  space: z.string(),
  status: z.enum(["published", "draft", "archived"]),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkspaceVersionListSchema = z.object({
  versions: z.array(WorkspaceVersionSchema),
});

export const MutationResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type WorkspaceDocument = z.infer<typeof WorkspaceDocumentSchema>;
export type WorkspaceDocumentList = z.infer<typeof WorkspaceDocumentListSchema>;
export type WorkspaceNavigation = z.infer<typeof WorkspaceNavigationSchema>;
export type WorkspaceNavigationList = z.infer<
  typeof WorkspaceNavigationListSchema
>;
export type WorkspaceVersion = z.infer<typeof WorkspaceVersionSchema>;
export type WorkspaceVersionList = z.infer<typeof WorkspaceVersionListSchema>;
export type MutationResult = z.infer<typeof MutationResultSchema>;

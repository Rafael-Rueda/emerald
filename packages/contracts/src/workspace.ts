import { z } from "zod";

/**
 * Zod contracts for workspace/admin entities.
 */

export const WorkspaceDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be URL-safe"),
  space: z.string(),
  spaceId: z.string().optional(),
  releaseVersionId: z.string().optional(),
  status: z.enum(["published", "draft", "archived"]),
  updatedAt: z.string(),
});

export const WorkspaceDocumentListSchema = z.object({
  documents: z.array(WorkspaceDocumentSchema),
});

const WorkspaceNavigationNodeBaseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  releaseVersionId: z.string().nullable(),
  parentId: z.string().nullable(),
  documentId: z.string().nullable(),
  label: z.string(),
  slug: z.string(),
  order: z.number().int(),
  nodeType: z.enum(["document", "group", "external_link"]),
  externalUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkspaceNavigation = z.infer<typeof WorkspaceNavigationNodeBaseSchema> & {
  children: WorkspaceNavigation[];
};

export const WorkspaceNavigationSchema: z.ZodType<WorkspaceNavigation> = z.lazy(
  () =>
    WorkspaceNavigationNodeBaseSchema.extend({
      children: z.array(WorkspaceNavigationSchema).default([]),
    }),
);

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
export type WorkspaceNavigationList = z.infer<
  typeof WorkspaceNavigationListSchema
>;
export type WorkspaceVersion = z.infer<typeof WorkspaceVersionSchema>;
export type WorkspaceVersionList = z.infer<typeof WorkspaceVersionListSchema>;
export type MutationResult = z.infer<typeof MutationResultSchema>;

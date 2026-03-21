import { DocumentContentSchema } from "@emerald/contracts";
import { createZodDto } from "nestjs-zod";
import z from "zod";

const slugSchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be URL-safe")
    .describe("Document slug");

const documentStatusSchema = z.enum(["draft", "published", "archived"]);

export const createDocumentBodySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
    releaseVersionId: z.uuid().describe("Release version UUID"),
    title: z.string().min(1).describe("Document title"),
    slug: slugSchema,
    content_json: DocumentContentSchema,
});

export class CreateDocumentBodyDTO extends createZodDto(createDocumentBodySchema) {}

export const updateDocumentBodySchema = z
    .object({
        title: z.string().min(1).optional().describe("Document title"),
        content_json: DocumentContentSchema.optional(),
    })
    .refine((body) => body.title !== undefined || body.content_json !== undefined, {
        message: "At least one field must be provided",
    });

export class UpdateDocumentBodyDTO extends createZodDto(updateDocumentBodySchema) {}

export const listDocumentsQuerySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export class ListDocumentsQueryDTO extends createZodDto(listDocumentsQuerySchema) {}

export const workspaceDocumentSummarySchema = z.object({
    id: z.uuid(),
    title: z.string(),
    slug: slugSchema,
    space: z.string(),
    spaceId: z.uuid(),
    releaseVersionId: z.uuid(),
    status: documentStatusSchema,
    updatedAt: z.string(),
});

export class WorkspaceDocumentSummaryDTO extends createZodDto(workspaceDocumentSummarySchema) {}

export const workspaceDocumentResponseSchema = z.object({
    id: z.uuid(),
    title: z.string(),
    slug: slugSchema,
    space: z.string(),
    spaceId: z.uuid(),
    releaseVersionId: z.uuid(),
    status: documentStatusSchema,
    content_json: DocumentContentSchema.nullable(),
    currentRevisionId: z.uuid().nullable(),
    createdBy: z.string(),
    updatedBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export class WorkspaceDocumentResponseDTO extends createZodDto(workspaceDocumentResponseSchema) {}

export const workspaceDocumentsListResponseSchema = z.object({
    documents: z.array(workspaceDocumentSummarySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
});

export class WorkspaceDocumentsListResponseDTO extends createZodDto(workspaceDocumentsListResponseSchema) {}

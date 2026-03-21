import { createZodDto } from "nestjs-zod";
import z from "zod";

export const createWorkspaceDocumentBodySchema = z.object({
    title: z.string().optional().describe("Workspace document title"),
    slug: z.string().optional().describe("Workspace document slug"),
});

export class CreateWorkspaceDocumentBodyDTO extends createZodDto(createWorkspaceDocumentBodySchema) {}

export const workspaceDocumentResponseSchema = z.object({
    id: z.string().describe("Workspace document identifier"),
    title: z.string().describe("Workspace document title"),
    slug: z.string().describe("Workspace document slug"),
    status: z.enum(["draft"]).describe("Workspace document status"),
});

export class WorkspaceDocumentResponseDTO extends createZodDto(workspaceDocumentResponseSchema) {}

export const workspaceDocumentsListResponseSchema = z.object({
    documents: z.array(workspaceDocumentResponseSchema).describe("Workspace document list"),
    total: z.number().describe("Total number of documents"),
});

export class WorkspaceDocumentsListResponseDTO extends createZodDto(workspaceDocumentsListResponseSchema) {}

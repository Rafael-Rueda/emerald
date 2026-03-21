import { DocumentContentSchema } from "@emerald/contracts";
import { createZodDto } from "nestjs-zod";
import z from "zod";

export const createRevisionBodySchema = z.object({
    content_json: DocumentContentSchema,
    changeNote: z.string().optional(),
});

export class CreateRevisionBodyDTO extends createZodDto(createRevisionBodySchema) {}

export const documentRevisionResponseSchema = z.object({
    id: z.uuid(),
    documentId: z.uuid(),
    revisionNumber: z.number().int().min(1),
    content_json: DocumentContentSchema,
    createdBy: z.string(),
    changeNote: z.string().nullable(),
    createdAt: z.string(),
});

export class DocumentRevisionResponseDTO extends createZodDto(documentRevisionResponseSchema) {}

export const documentRevisionsListResponseSchema = z.object({
    revisions: z.array(documentRevisionResponseSchema),
    total: z.number().int().nonnegative(),
});

export class DocumentRevisionsListResponseDTO extends createZodDto(documentRevisionsListResponseSchema) {}

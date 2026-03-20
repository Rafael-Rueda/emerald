import { createZodDto } from "nestjs-zod";
import z from "zod";

// Body for upload
export const uploadFileBodySchema = z.object({
    entityType: z.string().min(1).describe("Entity type (e.g., 'user', 'product')"),
    entityId: z.uuid().describe("Entity unique identifier"),
    field: z.string().min(1).describe("Field name (e.g., 'avatar', 'gallery')"),
});

export class UploadFileBodyDTO extends createZodDto(uploadFileBodySchema) {}

// Path params for file operations
export const fileIdParamSchema = z.object({
    fileId: z.uuid().describe("File unique identifier"),
});

export class FileIdParamDTO extends createZodDto(fileIdParamSchema) {}

// Path params for entity file operations
export const entityFileParamSchema = z.object({
    entityType: z.string().min(1).describe("Entity type"),
    entityId: z.uuid().describe("Entity unique identifier"),
    field: z.string().min(1).describe("Field name"),
});

export class EntityFileParamDTO extends createZodDto(entityFileParamSchema) {}

// Query params for file URL
export const fileUrlQuerySchema = z.object({
    signed: z.coerce.boolean().default(false).describe("Return signed URL with expiration"),
    expiresInMinutes: z.coerce.number().min(1).max(1440).default(60).describe("Signed URL expiration time in minutes"),
});

export class FileUrlQueryDTO extends createZodDto(fileUrlQuerySchema) {}

// Response DTOs
export const fileResponseSchema = z.object({
    id: z.uuid().describe("File unique identifier"),
    entityType: z.string().describe("Entity type"),
    entityId: z.uuid().describe("Entity unique identifier"),
    field: z.string().describe("Field name"),
    filename: z.string().describe("Original filename"),
    path: z.string().describe("Storage path"),
    mimeType: z.string().describe("File MIME type"),
    size: z.number().describe("File size in bytes"),
    width: z.number().nullable().describe("Image width in pixels"),
    height: z.number().nullable().describe("Image height in pixels"),
    isImage: z.boolean().describe("Whether file is an image"),
    createdAt: z.string().describe("Creation timestamp (ISO 8601)"),
    updatedAt: z.string().describe("Last update timestamp (ISO 8601)"),
});

export class FileResponseDTO extends createZodDto(fileResponseSchema) {}

export const uploadResponseSchema = z.object({
    id: z.uuid().describe("File unique identifier"),
    filename: z.string().describe("Original filename"),
    path: z.string().describe("Storage path"),
    mimeType: z.string().describe("File MIME type"),
    size: z.number().describe("File size in bytes"),
    width: z.number().nullable().describe("Image width in pixels"),
    height: z.number().nullable().describe("Image height in pixels"),
});

export class UploadResponseDTO extends createZodDto(uploadResponseSchema) {}

export const fileUrlResponseSchema = z.object({
    url: z.url().describe("File URL"),
    filename: z.string().describe("Original filename"),
    mimeType: z.string().describe("File MIME type"),
    size: z.number().describe("File size in bytes"),
});

export class FileUrlResponseDTO extends createZodDto(fileUrlResponseSchema) {}

export const deleteResponseSchema = z.object({
    file: z
        .object({
            id: z.uuid().describe("File unique identifier"),
            entityType: z.string().describe("Entity type"),
            entityId: z.uuid().describe("Entity unique identifier"),
            field: z.string().describe("Field name"),
            filename: z.string().describe("Original filename"),
            path: z.string().describe("Storage path"),
            mimeType: z.string().describe("File MIME type"),
            size: z.number().describe("File size in bytes"),
            width: z.number().nullable().describe("Image width in pixels"),
            height: z.number().nullable().describe("Image height in pixels"),
        })
        .describe("Deleted file details"),
});

export class DeleteResponseDTO extends createZodDto(deleteResponseSchema) {}

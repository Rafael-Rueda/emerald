import { createZodDto } from "nestjs-zod";
import z from "zod";

const versionKeySchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "key must be URL-safe")
    .describe("Version unique key (URL-safe)");

const releaseVersionStatusSchema = z.enum(["draft", "published", "archived"]);

export const createVersionBodySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
    key: versionKeySchema,
    label: z.string().min(1).describe("Version display label"),
});

export class CreateVersionBodyDTO extends createZodDto(createVersionBodySchema) {}

export const listVersionsQuerySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
});

export class ListVersionsQueryDTO extends createZodDto(listVersionsQuerySchema) {}

export const versionResponseSchema = z.object({
    id: z.uuid(),
    spaceId: z.uuid(),
    key: versionKeySchema,
    label: z.string(),
    status: releaseVersionStatusSchema,
    isDefault: z.boolean(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export class VersionResponseDTO extends createZodDto(versionResponseSchema) {}

export const versionsListResponseSchema = z.object({
    versions: z.array(versionResponseSchema),
    total: z.number().int().nonnegative(),
});

export class VersionsListResponseDTO extends createZodDto(versionsListResponseSchema) {}

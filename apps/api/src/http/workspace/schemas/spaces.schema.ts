import { createZodDto } from "nestjs-zod";
import z from "zod";

const spaceKeySchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .describe("Space unique key (URL-safe)");

export const createSpaceBodySchema = z.object({
    key: spaceKeySchema,
    name: z.string().min(1).describe("Space display name"),
    description: z.string().optional().default("").describe("Space description"),
});

export class CreateSpaceBodyDTO extends createZodDto(createSpaceBodySchema) {}

export const updateSpaceBodySchema = z
    .object({
        key: spaceKeySchema.optional(),
        name: z.string().min(1).optional().describe("Space display name"),
        description: z.string().optional().describe("Space description"),
    })
    .refine((body) => body.key !== undefined || body.name !== undefined || body.description !== undefined, {
        message: "At least one field must be provided",
    });

export class UpdateSpaceBodyDTO extends createZodDto(updateSpaceBodySchema) {}

export const spaceResponseSchema = z.object({
    id: z.string().uuid().describe("Space unique identifier"),
    key: z.string().describe("Space unique key"),
    name: z.string().describe("Space display name"),
    description: z.string().describe("Space description"),
    createdAt: z.string().describe("Creation timestamp (ISO 8601)"),
    updatedAt: z.string().describe("Last update timestamp (ISO 8601)"),
});

export class SpaceResponseDTO extends createZodDto(spaceResponseSchema) {}

export const spacesListResponseSchema = z.object({
    spaces: z.array(spaceResponseSchema),
    total: z.number().int().nonnegative(),
});

export class SpacesListResponseDTO extends createZodDto(spacesListResponseSchema) {}

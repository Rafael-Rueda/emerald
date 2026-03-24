import { createZodDto } from "nestjs-zod";
import z from "zod";

const slugSchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be URL-safe")
    .describe("Navigation slug");

export const navigationNodeTypeSchema = z.enum(["document", "group", "external_link"]);

export const createNavigationNodeBodySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
    releaseVersionId: z.uuid().nullable().optional().describe("Release version UUID"),
    parentId: z.uuid().nullable().optional().describe("Parent navigation node UUID"),
    documentId: z.uuid().nullable().optional().describe("Document UUID"),
    label: z.string().min(1).describe("Navigation label"),
    slug: slugSchema,
    order: z.number().int().min(0).describe("Node order"),
    nodeType: navigationNodeTypeSchema,
    externalUrl: z.string().url().nullable().optional().describe("External URL"),
});

export class CreateNavigationNodeBodyDTO extends createZodDto(createNavigationNodeBodySchema) {}

export const updateNavigationNodeBodySchema = z
    .object({
        documentId: z.uuid().nullable().optional().describe("Document UUID"),
        label: z.string().min(1).optional().describe("Navigation label"),
        slug: slugSchema.optional(),
        order: z.number().int().min(0).optional().describe("Node order"),
        nodeType: navigationNodeTypeSchema.optional(),
        externalUrl: z.string().url().nullable().optional().describe("External URL"),
    })
    .refine(
        (body) =>
            body.documentId !== undefined ||
            body.label !== undefined ||
            body.slug !== undefined ||
            body.order !== undefined ||
            body.nodeType !== undefined ||
            body.externalUrl !== undefined,
        {
            message: "At least one field must be provided",
        },
    );

export class UpdateNavigationNodeBodyDTO extends createZodDto(updateNavigationNodeBodySchema) {}

export const moveNavigationNodeBodySchema = z.object({
    parentId: z.uuid().nullable().optional().describe("New parent node UUID"),
    order: z.number().int().min(0).describe("New order"),
});

export class MoveNavigationNodeBodyDTO extends createZodDto(moveNavigationNodeBodySchema) {}

export const getNavigationTreeQuerySchema = z.object({
    spaceId: z.uuid().describe("Space UUID"),
    releaseVersionId: z.uuid().optional().describe("Release version UUID"),
});

export class GetNavigationTreeQueryDTO extends createZodDto(getNavigationTreeQuerySchema) {}

export const navigationNodeResponseSchema = z.object({
    id: z.uuid(),
    spaceId: z.uuid(),
    releaseVersionId: z.uuid().nullable(),
    parentId: z.uuid().nullable(),
    documentId: z.uuid().nullable(),
    label: z.string(),
    slug: slugSchema,
    order: z.number().int().min(0),
    nodeType: navigationNodeTypeSchema,
    externalUrl: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export class NavigationNodeResponseDTO extends createZodDto(navigationNodeResponseSchema) {}

export interface NavigationTreeItemDTO extends z.infer<typeof navigationNodeResponseSchema> {
    children: NavigationTreeItemDTO[];
}

export const navigationTreeItemSchema: z.ZodType<NavigationTreeItemDTO> = z.lazy(() =>
    navigationNodeResponseSchema.extend({
        children: z.array(navigationTreeItemSchema),
    }),
);

export class NavigationTreeItemResponseDTO extends createZodDto(navigationTreeItemSchema) {}

export const navigationTreeResponseSchema = z.object({
    items: z.array(navigationTreeItemSchema),
});

export class NavigationTreeResponseDTO extends createZodDto(navigationTreeResponseSchema) {}

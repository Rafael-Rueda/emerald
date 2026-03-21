import { DocumentContentSchema, SearchResponseSchema } from "@emerald/contracts";
import { createZodDto } from "nestjs-zod";
import z from "zod";

const slugSchema = z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be URL-safe");

const statusSchema = z.enum(["draft", "published", "archived"]);

export const publicVersionSchema = z.object({
    id: z.uuid(),
    key: slugSchema,
    label: z.string(),
    status: statusSchema,
    isDefault: z.boolean(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const publicVersionsResponseSchema = z.object({
    space: z.string(),
    versions: z.array(publicVersionSchema),
});

export class PublicVersionDTO extends createZodDto(publicVersionSchema) {}
export class PublicVersionsResponseDTO extends createZodDto(publicVersionsResponseSchema) {}

export interface PublicNavigationItemDTO {
    id: string;
    parentId: string | null;
    documentId: string | null;
    label: string;
    slug: string;
    order: number;
    nodeType: "document" | "group" | "external_link";
    externalUrl: string | null;
    children: PublicNavigationItemDTO[];
}

export const publicNavigationItemSchema: z.ZodType<PublicNavigationItemDTO> = z.lazy(() =>
    z.object({
        id: z.uuid(),
        parentId: z.uuid().nullable(),
        documentId: z.uuid().nullable(),
        label: z.string(),
        slug: slugSchema,
        order: z.number().int().min(0),
        nodeType: z.enum(["document", "group", "external_link"]),
        externalUrl: z.string().nullable(),
        children: z.array(publicNavigationItemSchema),
    }),
);

export const publicNavigationResponseSchema = z.object({
    space: z.string(),
    version: slugSchema,
    items: z.array(publicNavigationItemSchema),
});

export class PublicNavigationResponseDTO extends createZodDto(publicNavigationResponseSchema) {}

export const publicDocumentSchema = z.object({
    id: z.uuid(),
    title: z.string(),
    slug: slugSchema,
    space: z.string(),
    version: slugSchema,
    status: statusSchema,
    content_json: DocumentContentSchema.nullable(),
    rendered_html: z.string(),
    updatedAt: z.string(),
});

export const publicDocumentResponseSchema = z.object({
    document: publicDocumentSchema,
});

export class PublicDocumentResponseDTO extends createZodDto(publicDocumentResponseSchema) {}

export const publicSearchQuerySchema = z.object({
    q: z.string().default(""),
});

export class PublicSearchQueryDTO extends createZodDto(publicSearchQuerySchema) {}
export class PublicSearchResponseDTO extends createZodDto(SearchResponseSchema) {}

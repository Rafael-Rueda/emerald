import { z } from "zod";

/**
 * Zod contracts for semantic rich document content.
 */

export const TextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ListItemSchema = z.object({
  children: z.array(TextNodeSchema),
});

export const HeadingBlockSchema = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  id: z.string(),
  children: z.array(TextNodeSchema),
});

export const ParagraphBlockSchema = z.object({
  type: z.literal("paragraph"),
  children: z.array(TextNodeSchema),
});

export const OrderedListBlockSchema = z.object({
  type: z.literal("ordered_list"),
  items: z.array(ListItemSchema),
});

export const UnorderedListBlockSchema = z.object({
  type: z.literal("unordered_list"),
  items: z.array(ListItemSchema),
});

export const CodeBlockSchema = z.object({
  type: z.literal("code_block"),
  language: z.string(),
  code: z.string(),
});

export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  assetId: z.string(),
  alt: z.string(),
  caption: z.string(),
});

export const TableBlockSchema = z.object({
  type: z.literal("table"),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export type TextNode = z.infer<typeof TextNodeSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type HeadingBlock = z.infer<typeof HeadingBlockSchema>;
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>;
export type OrderedListBlock = z.infer<typeof OrderedListBlockSchema>;
export type UnorderedListBlock = z.infer<typeof UnorderedListBlockSchema>;
export type CodeBlock = z.infer<typeof CodeBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type TableBlock = z.infer<typeof TableBlockSchema>;

export interface CalloutBlock {
  type: "callout";
  tone: "info" | "warn" | "danger" | "success";
  children: BlockNode[];
}

export interface TabsItem {
  label: string;
  children: BlockNode[];
}

export interface TabsBlock {
  type: "tabs";
  items: TabsItem[];
}

export type BlockNode =
  | HeadingBlock
  | ParagraphBlock
  | OrderedListBlock
  | UnorderedListBlock
  | CalloutBlock
  | CodeBlock
  | ImageBlock
  | TableBlock
  | TabsBlock;

export const CalloutBlockSchema = z.object({
  type: z.literal("callout"),
  tone: z.enum(["info", "warn", "danger", "success"]),
  children: z.array(z.lazy(() => BlockNodeSchema)),
});

export const TabsItemSchema = z.object({
  label: z.string(),
  children: z.array(z.lazy(() => BlockNodeSchema)),
});

export const TabsBlockSchema = z.object({
  type: z.literal("tabs"),
  items: z.array(TabsItemSchema),
});

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    HeadingBlockSchema,
    ParagraphBlockSchema,
    OrderedListBlockSchema,
    UnorderedListBlockSchema,
    CalloutBlockSchema,
    CodeBlockSchema,
    ImageBlockSchema,
    TableBlockSchema,
    TabsBlockSchema,
  ]),
);

export const DocumentContentSchema = z.object({
  type: z.literal("doc"),
  version: z.literal(1),
  children: z.array(BlockNodeSchema),
});

export type DocumentContent = z.infer<typeof DocumentContentSchema>;

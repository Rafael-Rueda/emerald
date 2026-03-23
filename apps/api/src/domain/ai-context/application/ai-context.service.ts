import type { BlockNode, DocumentContent, ListItem, TabsItem, TextNode } from "@emerald/contracts";
import { Inject, Injectable } from "@nestjs/common";

import {
    DOCUMENT_CHUNK_REPOSITORY,
    type DocumentChunkInput,
    type DocumentChunkRepository,
} from "./repositories/document-chunk.repository";

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const textFromNodes = (nodes: TextNode[]): string => normalizeWhitespace(nodes.map((node) => node.text).join(" "));

const textFromListItems = (items: ListItem[]): string =>
    normalizeWhitespace(items.map((item) => textFromNodes(item.children)).join(" "));

const textFromTabs = (items: TabsItem[]): string =>
    normalizeWhitespace(
        items.map((item) => normalizeWhitespace(`${item.label} ${textFromBlocks(item.children)}`)).join(" "),
    );

const textFromBlock = (block: BlockNode): string => {
    switch (block.type) {
        case "heading":
        case "paragraph":
            return textFromNodes(block.children);
        case "ordered_list":
        case "unordered_list":
            return textFromListItems(block.items);
        case "callout":
            return textFromBlocks(block.children);
        case "code_block":
            return normalizeWhitespace(block.code);
        case "image":
            return normalizeWhitespace(block.alt);
        case "table":
            return normalizeWhitespace([...block.columns, ...block.rows.flat()].join(" "));
        case "tabs":
            return textFromTabs(block.items);
        default:
            return "";
    }
};

const textFromBlocks = (blocks: BlockNode[]): string =>
    normalizeWhitespace(
        blocks
            .map((block) => textFromBlock(block))
            .filter(Boolean)
            .join(" "),
    );

@Injectable()
export class AiContextService {
    constructor(
        @Inject(DOCUMENT_CHUNK_REPOSITORY)
        private readonly documentChunkRepository: DocumentChunkRepository,
    ) {
        void this.documentChunkRepository;
    }

    chunkDocument(content: DocumentContent): DocumentChunkInput[] {
        if (content.children.length === 0) {
            return [];
        }

        const hasHeading = content.children.some((block) => block.type === "heading");

        if (!hasHeading) {
            return [
                {
                    sectionId: "root",
                    sectionTitle: "Introduction",
                    content: textFromBlocks(content.children),
                },
            ];
        }

        const chunks: DocumentChunkInput[] = [];
        let currentSection: { sectionId: string; sectionTitle: string; content: string[] } | null = null;

        for (const block of content.children) {
            if (block.type === "heading") {
                if (currentSection) {
                    chunks.push({
                        sectionId: currentSection.sectionId,
                        sectionTitle: currentSection.sectionTitle,
                        content: normalizeWhitespace(currentSection.content.join(" ")),
                    });
                }

                currentSection = {
                    sectionId: block.id,
                    sectionTitle: textFromNodes(block.children),
                    content: [],
                };

                continue;
            }

            if (!currentSection) {
                continue;
            }

            const blockText = textFromBlock(block);
            if (blockText.length > 0) {
                currentSection.content.push(blockText);
            }
        }

        if (currentSection) {
            chunks.push({
                sectionId: currentSection.sectionId,
                sectionTitle: currentSection.sectionTitle,
                content: normalizeWhitespace(currentSection.content.join(" ")),
            });
        }

        return chunks;
    }
}

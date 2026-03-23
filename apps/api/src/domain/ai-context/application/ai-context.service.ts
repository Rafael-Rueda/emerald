import {
    type BlockNode,
    type DocumentContent,
    DocumentContentSchema,
    type ListItem,
    type TabsItem,
    type TextNode,
} from "@emerald/contracts";
import { Inject, Injectable, Logger } from "@nestjs/common";

import {
    DOCUMENT_CHUNK_REPOSITORY,
    type DocumentChunkCreate,
    type DocumentChunkInput,
    type DocumentChunkRepository,
} from "./repositories/document-chunk.repository";

import { renderDocumentContent } from "@/domain/documents/application/utils/document-content-renderer";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

export const VOYAGE_AI_EMBEDDING_CLIENT = "VoyageAiEmbeddingClient";

export interface VoyageAiEmbeddingClient {
    embed(request: { input: string[]; model: string; input_type: "document" | "query" }): Promise<{
        data?: Array<{
            embedding?: number[];
        }>;
    }>;
}

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
    private readonly logger = new Logger(AiContextService.name);

    constructor(
        @Inject(DOCUMENT_CHUNK_REPOSITORY)
        private readonly documentChunkRepository: DocumentChunkRepository,
        private readonly prisma: PrismaService,
        @Inject(VOYAGE_AI_EMBEDDING_CLIENT)
        private readonly voyageAiClient: VoyageAiEmbeddingClient,
    ) {}

    async generateAndStoreEmbeddings(documentId: string): Promise<void> {
        try {
            const document = await this.prisma.document.findUnique({
                where: { id: documentId },
                select: {
                    id: true,
                    spaceId: true,
                    releaseVersionId: true,
                    currentRevision: {
                        select: {
                            contentJson: true,
                            plainText: true,
                        },
                    },
                },
            });

            if (!document?.currentRevision) {
                return;
            }

            const parsedContent = DocumentContentSchema.safeParse(document.currentRevision.contentJson);
            if (!parsedContent.success) {
                this.logger.error("Skipping embedding generation due invalid document content", {
                    documentId,
                });

                return;
            }

            const contentJson = parsedContent.data;
            const plainText = normalizeWhitespace(
                document.currentRevision.plainText || renderDocumentContent(contentJson).plainText,
            );
            const chunkInputs = this.getEmbeddingChunkInputs(contentJson, plainText);

            if (chunkInputs.length === 0) {
                await this.documentChunkRepository.deleteByDocumentId(documentId);
                return;
            }

            const embeddingResponse = await this.voyageAiClient.embed({
                input: chunkInputs.map((chunk) => chunk.content),
                model: "voyage-3-lite",
                input_type: "document",
            });

            const embeddings = (embeddingResponse.data ?? []).map((item) => item.embedding ?? []);

            if (embeddings.length !== chunkInputs.length) {
                throw new Error(
                    `Embedding count mismatch: expected ${chunkInputs.length}, received ${embeddings.length}`,
                );
            }

            if (embeddings.some((embedding) => embedding.length !== 512)) {
                throw new Error("Embedding dimension mismatch: expected 512");
            }

            const chunksToCreate: DocumentChunkCreate[] = chunkInputs.map((chunk, index) => ({
                documentId,
                spaceId: document.spaceId,
                releaseVersionId: document.releaseVersionId,
                sectionId: chunk.sectionId,
                sectionTitle: chunk.sectionTitle,
                content: chunk.content,
                embedding: embeddings[index],
            }));

            await this.documentChunkRepository.deleteByDocumentId(documentId);
            await this.documentChunkRepository.createMany(chunksToCreate);
        } catch (error) {
            this.logger.error("Failed to generate and store embeddings", {
                documentId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private getEmbeddingChunkInputs(content: DocumentContent, plainText: string): DocumentChunkInput[] {
        const chunks = this.chunkDocument(content).filter((chunk) => chunk.content.length > 0);

        if (chunks.length > 0) {
            return chunks;
        }

        if (plainText.length === 0) {
            return [];
        }

        return [
            {
                sectionId: "root",
                sectionTitle: "Introduction",
                content: plainText,
            },
        ];
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

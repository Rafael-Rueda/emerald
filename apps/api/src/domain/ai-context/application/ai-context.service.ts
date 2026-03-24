import {
    type AiContextResponse,
    type BlockNode,
    type DocumentContent,
    DocumentContentSchema,
    type ListItem,
    type TabsItem,
    type TextNode,
} from "@emerald/contracts";
import { Inject, Injectable, Logger } from "@nestjs/common";
import * as pgvector from "pgvector";

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

interface SemanticSearchRow {
    id: string | null;
    content: string | null;
    relevance_score: number | string | null;
    document_id: string | null;
    document_title: string | null;
    version_id: string | null;
    version_label: string | null;
    navigation_label: string | null;
    section_id: string | null;
    section_title: string | null;
    slug: string | null;
    space: string | null;
}

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

    async semanticSearch(query: string, space: string, version: string): Promise<AiContextResponse> {
        const spaceRecord = await this.prisma.space.findUnique({
            where: { key: space },
            select: { id: true },
        });

        if (!spaceRecord) {
            this.logger.warn("Semantic search: space not found", { space });
            return this.emptySemanticSearchResponse(query);
        }

        const versionRecord = await this.prisma.releaseVersion.findUnique({
            where: {
                spaceId_key: {
                    spaceId: spaceRecord.id,
                    key: version,
                },
            },
            select: { id: true },
        });

        if (!versionRecord) {
            this.logger.warn("Semantic search: version not found", { space, version, spaceId: spaceRecord.id });
            return this.emptySemanticSearchResponse(query);
        }

        const embeddingResponse = await this.voyageAiClient
            .embed({
                input: [query],
                model: "voyage-3-lite",
                input_type: "query",
            })
            .catch((error) => {
                this.logger.error("Voyage AI embedding request failed", {
                    query,
                    space,
                    version,
                    error: error instanceof Error ? error.message : String(error),
                });

                return null;
            });

        if (!embeddingResponse) {
            return this.emptySemanticSearchResponse(query);
        }

        const queryEmbedding = embeddingResponse.data?.[0]?.embedding;

        if (!queryEmbedding || queryEmbedding.length !== 512) {
            this.logger.warn("Skipping semantic search due invalid query embedding", {
                query,
                space,
                version,
            });

            return this.emptySemanticSearchResponse(query);
        }

        const embeddingParam = pgvector.toSql(queryEmbedding);
        const rows = await this.prisma.$queryRaw<SemanticSearchRow[]>`
            SELECT
                dc.id,
                dc.content,
                1 - (dc.embedding <=> ${embeddingParam}::vector) AS relevance_score,
                d.id AS document_id,
                d.title AS document_title,
                rv.id AS version_id,
                rv.label AS version_label,
                COALESCE(nav.label, d.title) AS navigation_label,
                dc.section_id,
                dc.section_title,
                d.slug,
                s.key AS space
            FROM document_chunks dc
            INNER JOIN documents d
                ON d.id = dc.document_id
            INNER JOIN release_versions rv
                ON rv.id = dc.release_version_id
            INNER JOIN spaces s
                ON s.id = dc.space_id
            LEFT JOIN LATERAL (
                SELECT nn.label
                FROM navigation_nodes nn
                WHERE nn.document_id = d.id
                  AND nn.space_id = dc.space_id
                  AND (nn.release_version_id = dc.release_version_id OR nn.release_version_id IS NULL)
                ORDER BY
                    CASE WHEN nn.release_version_id = dc.release_version_id THEN 0 ELSE 1 END,
                    nn."order" ASC,
                    nn.created_at ASC
                LIMIT 1
            ) nav
                ON true
            WHERE dc.space_id = ${spaceRecord.id}
              AND dc.release_version_id = ${versionRecord.id}
            ORDER BY dc.embedding <=> ${embeddingParam}::vector
            LIMIT 10
        `;

        return {
            entityId: query,
            entityType: "semantic-search",
            chunks: rows.map((row) => {
                const parsedScore = Number(row.relevance_score);
                const relevanceScore = Number.isNaN(parsedScore) ? 0 : Math.max(0, Math.min(1, parsedScore));

                return {
                    id: String(row.id ?? ""),
                    content: String(row.content ?? ""),
                    relevanceScore,
                    source: {
                        documentId: String(row.document_id ?? ""),
                        documentTitle: String(row.document_title ?? ""),
                        versionId: String(row.version_id ?? ""),
                        versionLabel: String(row.version_label ?? ""),
                        navigationLabel: String(row.navigation_label ?? row.document_title ?? ""),
                        sectionId: String(row.section_id ?? ""),
                        sectionTitle: String(row.section_title ?? ""),
                        slug: String(row.slug ?? ""),
                        space: String(row.space ?? ""),
                    },
                };
            }),
        };
    }

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

    private emptySemanticSearchResponse(query: string): AiContextResponse {
        return {
            entityId: query,
            entityType: "semantic-search",
            chunks: [],
        };
    }
}

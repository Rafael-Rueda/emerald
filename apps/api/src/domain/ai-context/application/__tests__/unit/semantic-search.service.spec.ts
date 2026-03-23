import { AiContextResponseSchema } from "@emerald/contracts";

import { AiContextService } from "../../ai-context.service";
import type { DocumentChunkRepository } from "../../repositories/document-chunk.repository";

import type { PrismaService } from "@/infra/database/prisma/prisma.service";

type MockVoyageClient = {
    embed: jest.Mock;
};

const makeChunkRepository = (): jest.Mocked<DocumentChunkRepository> => ({
    deleteByDocumentId: jest.fn(),
    createMany: jest.fn(),
});

const makePrismaService = (): jest.Mocked<Pick<PrismaService, "$queryRaw" | "document">> => ({
    document: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["document"],
    $queryRaw: jest.fn(),
});

const makeVoyageClient = (): MockVoyageClient => ({
    embed: jest.fn(),
});

const makeEmbedding = (seed = 0.1): number[] => Array.from({ length: 512 }, (_, index) => seed + index * 0.0001);

describe("AiContextService.semanticSearch", () => {
    let sut: AiContextService;
    let prismaService: jest.Mocked<Pick<PrismaService, "$queryRaw" | "document">>;
    let voyageClient: MockVoyageClient;

    beforeEach(() => {
        prismaService = makePrismaService();
        voyageClient = makeVoyageClient();

        sut = new AiContextService(makeChunkRepository(), prismaService as never, voyageClient as never);
    });

    it("embeds query and maps ranked semantic search rows to AiContextResponse shape", async () => {
        voyageClient.embed.mockResolvedValue({
            data: [{ embedding: makeEmbedding(0.42) }],
        });

        prismaService.$queryRaw.mockResolvedValue([
            {
                id: "chunk-1",
                content: "Most relevant chunk",
                relevance_score: 0.98,
                document_id: "doc-1",
                document_title: "Getting Started",
                version_id: "version-1",
                version_label: "Version 1",
                navigation_label: "Introduction",
                section_id: "section-1",
                section_title: "Introduction",
                slug: "getting-started",
                space: "guides",
            },
            {
                id: "chunk-2",
                content: "Less relevant chunk",
                relevance_score: 0.67,
                document_id: "doc-2",
                document_title: "Advanced Guides",
                version_id: "version-1",
                version_label: "Version 1",
                navigation_label: "Advanced",
                section_id: "section-2",
                section_title: "Advanced",
                slug: "advanced-guides",
                space: "guides",
            },
        ]);

        const result = await sut.semanticSearch("best practices", "guides", "v1");

        expect(voyageClient.embed).toHaveBeenCalledWith({
            input: ["best practices"],
            model: "voyage-3-lite",
            input_type: "query",
        });
        expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result.entityType).toBe("semantic-search");
        expect(result.entityId).toBe("best practices");
        expect(result.chunks.map((chunk) => chunk.relevanceScore)).toEqual([0.98, 0.67]);
        expect(result.chunks[0].source).toEqual({
            documentId: "doc-1",
            documentTitle: "Getting Started",
            versionId: "version-1",
            versionLabel: "Version 1",
            navigationLabel: "Introduction",
            sectionId: "section-1",
            sectionTitle: "Introduction",
            slug: "getting-started",
            space: "guides",
        });

        expect(() => AiContextResponseSchema.parse(result)).not.toThrow();
    });

    it("returns an empty result when the query embedding is missing", async () => {
        voyageClient.embed.mockResolvedValue({ data: [] });

        const result = await sut.semanticSearch("missing embedding", "guides", "v1");

        expect(result).toEqual({
            entityId: "missing embedding",
            entityType: "semantic-search",
            chunks: [],
        });
        expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });
});

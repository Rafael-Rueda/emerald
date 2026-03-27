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
    findByDocumentId: jest.fn(),
    getStatsBySpaceId: jest.fn(),
});

const makePrismaService = (): jest.Mocked<
    Pick<PrismaService, "$queryRaw" | "document" | "space" | "releaseVersion">
> => ({
    document: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["document"],
    space: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["space"],
    releaseVersion: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["releaseVersion"],
    $queryRaw: jest.fn(),
});

const makeVoyageClient = (): MockVoyageClient => ({
    embed: jest.fn(),
});

const makeEmbedding = (seed = 0.1): number[] => Array.from({ length: 512 }, (_, index) => seed + index * 0.0001);

describe("AiContextService.semanticSearch", () => {
    let sut: AiContextService;
    let prismaService: jest.Mocked<Pick<PrismaService, "$queryRaw" | "document" | "space" | "releaseVersion">>;
    let voyageClient: MockVoyageClient;

    beforeEach(() => {
        prismaService = makePrismaService();
        voyageClient = makeVoyageClient();

        prismaService.space.findUnique.mockResolvedValue({ id: "space-1" });
        prismaService.releaseVersion.findUnique.mockResolvedValue({ id: "version-1" });

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
        expect(prismaService.space.findUnique).toHaveBeenCalledWith({
            where: { key: "guides" },
            select: { id: true },
        });
        expect(prismaService.releaseVersion.findUnique).toHaveBeenCalledWith({
            where: {
                spaceId_key: {
                    spaceId: "space-1",
                    key: "v1",
                },
            },
            select: { id: true },
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

    it("returns an empty result when embedding request fails", async () => {
        voyageClient.embed.mockRejectedValue(new Error("Voyage unavailable"));

        const result = await sut.semanticSearch("embedding failure", "guides", "v1");

        expect(result).toEqual({
            entityId: "embedding failure",
            entityType: "semantic-search",
            chunks: [],
        });
        expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it("returns an empty result when space is unknown", async () => {
        prismaService.space.findUnique.mockResolvedValue(null);

        const result = await sut.semanticSearch("unknown space", "unknown", "v1");

        expect(result).toEqual({
            entityId: "unknown space",
            entityType: "semantic-search",
            chunks: [],
        });
        expect(prismaService.releaseVersion.findUnique).not.toHaveBeenCalled();
        expect(voyageClient.embed).not.toHaveBeenCalled();
        expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it("returns an empty result when version is unknown", async () => {
        prismaService.releaseVersion.findUnique.mockResolvedValue(null);

        const result = await sut.semanticSearch("unknown version", "guides", "missing");

        expect(result).toEqual({
            entityId: "unknown version",
            entityType: "semantic-search",
            chunks: [],
        });
        expect(voyageClient.embed).not.toHaveBeenCalled();
        expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it("propagates raw semantic query errors when pre-flight checks pass", async () => {
        voyageClient.embed.mockResolvedValue({
            data: [{ embedding: makeEmbedding(0.42) }],
        });
        prismaService.$queryRaw.mockRejectedValue(new Error("database unavailable"));

        await expect(sut.semanticSearch("db error", "guides", "v1")).rejects.toThrow("database unavailable");
    });

    it("maps nullable raw fields to strings so AiContextResponseSchema parse succeeds", async () => {
        voyageClient.embed.mockResolvedValue({
            data: [{ embedding: makeEmbedding(0.42) }],
        });

        prismaService.$queryRaw.mockResolvedValue([
            {
                id: null,
                content: null,
                relevance_score: 0.42,
                document_id: null,
                document_title: null,
                version_id: null,
                version_label: null,
                navigation_label: null,
                section_id: null,
                section_title: null,
                slug: null,
                space: null,
            },
        ]);

        const result = await sut.semanticSearch("nullable fields", "guides", "v1");

        expect(() => AiContextResponseSchema.parse(result)).not.toThrow();
        expect(result.chunks[0]).toEqual({
            id: "",
            content: "",
            relevanceScore: 0.42,
            source: {
                documentId: "",
                documentTitle: "",
                versionId: "",
                versionLabel: "",
                navigationLabel: "",
                sectionId: "",
                sectionTitle: "",
                slug: "",
                space: "",
            },
        });
    });
});

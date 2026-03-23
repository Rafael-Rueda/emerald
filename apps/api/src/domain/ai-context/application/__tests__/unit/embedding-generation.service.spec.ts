import type { DocumentContent } from "@emerald/contracts";
import { Logger } from "@nestjs/common";

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

const makePrismaService = (): jest.Mocked<Pick<PrismaService, "document">> => ({
    document: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["document"],
});

const makeVoyageClient = (): MockVoyageClient => ({
    embed: jest.fn(),
});

const makeEmbedding = (seed: number): number[] => Array.from({ length: 512 }, (_, index) => seed + index * 0.001);

const makeContent = (): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [
        {
            type: "heading",
            level: 2,
            id: "intro",
            children: [{ type: "text", text: "Introduction" }],
        },
        {
            type: "paragraph",
            children: [{ type: "text", text: "Welcome to Emerald" }],
        },
        {
            type: "heading",
            level: 2,
            id: "advanced",
            children: [{ type: "text", text: "Advanced" }],
        },
        {
            type: "paragraph",
            children: [{ type: "text", text: "Deep dive content" }],
        },
    ],
});

const makeDocument = (contentJson: DocumentContent) => ({
    id: "document-1",
    spaceId: "space-1",
    releaseVersionId: "version-1",
    currentRevision: {
        contentJson,
        plainText: "Welcome to Emerald Deep dive content",
    },
});

describe("AiContextService.generateAndStoreEmbeddings", () => {
    let sut: AiContextService;
    let chunkRepository: jest.Mocked<DocumentChunkRepository>;
    let prismaService: jest.Mocked<Pick<PrismaService, "document">>;
    let voyageClient: MockVoyageClient;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        chunkRepository = makeChunkRepository();
        prismaService = makePrismaService();
        voyageClient = makeVoyageClient();
        loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

        sut = new AiContextService(chunkRepository, prismaService as never, voyageClient as never);
    });

    afterEach(() => {
        loggerErrorSpy.mockRestore();
    });

    it("deletes old chunks and stores newly generated embeddings with all required fields", async () => {
        const content = makeContent();
        const document = makeDocument(content);
        const introEmbedding = makeEmbedding(0.01);
        const advancedEmbedding = makeEmbedding(0.02);

        prismaService.document.findUnique.mockResolvedValue(document as never);
        voyageClient.embed.mockResolvedValue({
            data: [{ embedding: introEmbedding }, { embedding: advancedEmbedding }],
        });

        await expect(sut.generateAndStoreEmbeddings("document-1")).resolves.toBeUndefined();

        expect(voyageClient.embed).toHaveBeenCalledWith({
            input: ["Welcome to Emerald", "Deep dive content"],
            model: "voyage-3-lite",
            input_type: "document",
        });

        expect(chunkRepository.deleteByDocumentId).toHaveBeenCalledWith("document-1");
        expect(chunkRepository.createMany).toHaveBeenCalledWith([
            {
                documentId: "document-1",
                spaceId: "space-1",
                releaseVersionId: "version-1",
                sectionId: "intro",
                sectionTitle: "Introduction",
                content: "Welcome to Emerald",
                embedding: introEmbedding,
            },
            {
                documentId: "document-1",
                spaceId: "space-1",
                releaseVersionId: "version-1",
                sectionId: "advanced",
                sectionTitle: "Advanced",
                content: "Deep dive content",
                embedding: advancedEmbedding,
            },
        ]);

        const deleteOrder = chunkRepository.deleteByDocumentId.mock.invocationCallOrder[0];
        const createOrder = chunkRepository.createMany.mock.invocationCallOrder[0];

        expect(deleteOrder).toBeLessThan(createOrder);
    });

    it("logs and resolves silently when Voyage AI fails", async () => {
        const content = makeContent();
        const document = makeDocument(content);

        prismaService.document.findUnique.mockResolvedValue(document as never);
        voyageClient.embed.mockRejectedValue(new Error("voyage unavailable"));

        await expect(sut.generateAndStoreEmbeddings("document-1")).resolves.toBeUndefined();

        expect(chunkRepository.deleteByDocumentId).not.toHaveBeenCalled();
        expect(chunkRepository.createMany).not.toHaveBeenCalled();
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            "Failed to generate and store embeddings",
            expect.objectContaining({
                documentId: "document-1",
                error: expect.stringContaining("voyage unavailable"),
            }),
        );
    });
});

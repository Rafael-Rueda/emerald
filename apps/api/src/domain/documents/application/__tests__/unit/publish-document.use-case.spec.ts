import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "../../../errors/document-not-found.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { PublishDocumentUseCase } from "../../use-cases/publish-document.use-case";

import type { AiContextService } from "@/domain/ai-context/application/ai-context.service";

const makeContent = (): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [],
});

const makeDocument = (status: "draft" | "published" | "archived") =>
    DocumentEntity.create(
        {
            spaceId: "space-1",
            spaceKey: "guides",
            releaseVersionId: "version-1",
            title: "Getting Started",
            slug: "getting-started",
            status,
            currentRevisionId: "revision-1",
            currentContentJson: makeContent(),
            createdBy: "author-1",
            updatedBy: "author-1",
        },
        "document-1",
    );

const makeDocumentsRepository = (): jest.Mocked<DocumentsRepository> => ({
    findById: jest.fn(),
    findBySlugInVersion: jest.fn(),
    listBySpaceId: jest.fn<Promise<ListDocumentsResult>, any[]>(),
    create: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    createRevision: jest.fn<Promise<DocumentRevisionEntity | null>, any[]>(),
    findRevisions: jest.fn(),
});

const makeAiContextService = (): jest.Mocked<Pick<AiContextService, "generateAndStoreEmbeddings">> => ({
    generateAndStoreEmbeddings: jest.fn().mockResolvedValue(undefined),
});

describe("PublishDocumentUseCase", () => {
    let sut: PublishDocumentUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;
    let aiContextService: jest.Mocked<Pick<AiContextService, "generateAndStoreEmbeddings">>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        aiContextService = makeAiContextService();
        sut = new PublishDocumentUseCase(documentsRepository, aiContextService as AiContextService);
    });

    it("publishes a draft document", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument(DOCUMENT_STATUS.DRAFT));
        documentsRepository.publish.mockResolvedValue(makeDocument(DOCUMENT_STATUS.PUBLISHED));

        const result = await sut.execute({
            documentId: "document-1",
            updatedBy: "author-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.document.status).toBe(DOCUMENT_STATUS.PUBLISHED);
        }

        expect(documentsRepository.publish).toHaveBeenCalledWith("document-1", "author-1");
        expect(aiContextService.generateAndStoreEmbeddings).toHaveBeenCalledWith("document-1");
    });

    it("is idempotent when document is already published", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument(DOCUMENT_STATUS.PUBLISHED));

        const result = await sut.execute({
            documentId: "document-1",
            updatedBy: "author-1",
        });

        expect(result.isRight()).toBe(true);
        expect(documentsRepository.publish).not.toHaveBeenCalled();
        expect(aiContextService.generateAndStoreEmbeddings).not.toHaveBeenCalled();
    });

    it("returns success even when embedding generation rejects", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument(DOCUMENT_STATUS.DRAFT));
        documentsRepository.publish.mockResolvedValue(makeDocument(DOCUMENT_STATUS.PUBLISHED));
        aiContextService.generateAndStoreEmbeddings.mockRejectedValue(new Error("embedding failed"));

        const result = await sut.execute({
            documentId: "document-1",
            updatedBy: "author-1",
        });

        expect(result.isRight()).toBe(true);
        expect(documentsRepository.publish).toHaveBeenCalledWith("document-1", "author-1");
        expect(aiContextService.generateAndStoreEmbeddings).toHaveBeenCalledWith("document-1");
    });

    it("does not block publish while embedding generation is still pending", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument(DOCUMENT_STATUS.DRAFT));
        documentsRepository.publish.mockResolvedValue(makeDocument(DOCUMENT_STATUS.PUBLISHED));

        const delayedEmbeddingPromise = new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 500);
        });

        aiContextService.generateAndStoreEmbeddings.mockReturnValue(delayedEmbeddingPromise);

        const startedAt = Date.now();

        const result = await sut.execute({
            documentId: "document-1",
            updatedBy: "author-1",
        });

        const durationMs = Date.now() - startedAt;

        expect(result.isRight()).toBe(true);
        expect(durationMs).toBeLessThan(100);
        expect(aiContextService.generateAndStoreEmbeddings).toHaveBeenCalledWith("document-1");

        await delayedEmbeddingPromise;
    });

    it("returns not found when document does not exist", async () => {
        documentsRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            documentId: "missing-document",
            updatedBy: "author-1",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(DocumentNotFoundError);
        }
    });
});

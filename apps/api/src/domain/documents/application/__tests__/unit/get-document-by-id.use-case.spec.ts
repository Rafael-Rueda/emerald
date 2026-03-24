import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "../../../errors/document-not-found.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { GetDocumentByIdUseCase } from "../../use-cases/get-document-by-id.use-case";

const makeContent = (): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [],
});

const makeDocument = (id = "document-1") =>
    DocumentEntity.create(
        {
            spaceId: "space-1",
            spaceKey: "guides",
            releaseVersionId: "version-1",
            title: "Getting Started",
            slug: "getting-started",
            status: DOCUMENT_STATUS.DRAFT,
            currentRevisionId: "revision-1",
            currentContentJson: makeContent(),
            createdBy: "author-1",
            updatedBy: "author-1",
        },
        id,
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

describe("GetDocumentByIdUseCase", () => {
    let sut: GetDocumentByIdUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new GetDocumentByIdUseCase(documentsRepository);
    });

    it("returns document when it exists", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument("document-42"));

        const result = await sut.execute({ documentId: "document-42" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.document.id.toString()).toBe("document-42");
            expect(result.value.document.title).toBe("Getting Started");
        }
    });

    it("returns not found when document does not exist", async () => {
        documentsRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({ documentId: "missing-document" });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(DocumentNotFoundError);
        }
    });
});

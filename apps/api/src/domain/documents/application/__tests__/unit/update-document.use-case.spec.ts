import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "../../../errors/document-not-found.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { UpdateDocumentUseCase } from "../../use-cases/update-document.use-case";

const makeContent = (text: string): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [
        {
            type: "paragraph",
            children: [{ type: "text", text }],
        },
    ],
});

const makeDocument = (title: string, contentText: string) =>
    DocumentEntity.create(
        {
            spaceId: "space-1",
            spaceKey: "guides",
            releaseVersionId: "version-1",
            title,
            slug: "getting-started",
            status: DOCUMENT_STATUS.DRAFT,
            currentRevisionId: "revision-2",
            currentContentJson: makeContent(contentText),
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

describe("UpdateDocumentUseCase", () => {
    let sut: UpdateDocumentUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new UpdateDocumentUseCase(documentsRepository);
    });

    it("updates title and content snapshot", async () => {
        documentsRepository.update.mockResolvedValue(makeDocument("Updated Title", "Updated content"));

        const result = await sut.execute({
            documentId: "document-1",
            updatedBy: "author-1",
            title: "Updated Title",
            contentJson: makeContent("Updated content"),
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.document.title).toBe("Updated Title");
            expect(result.value.document.currentContentJson).toEqual(makeContent("Updated content"));
        }
    });

    it("returns not found when document does not exist", async () => {
        documentsRepository.update.mockResolvedValue(null);

        const result = await sut.execute({
            documentId: "missing-document",
            updatedBy: "author-1",
            title: "Updated Title",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(DocumentNotFoundError);
        }
    });
});

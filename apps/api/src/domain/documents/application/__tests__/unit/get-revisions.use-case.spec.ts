import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "../../../errors/document-not-found.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { GetRevisionsUseCase } from "../../use-cases/get-revisions.use-case";

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

const makeDocument = () =>
    DocumentEntity.create(
        {
            spaceId: "space-1",
            spaceKey: "guides",
            releaseVersionId: "version-1",
            title: "Getting Started",
            slug: "getting-started",
            status: DOCUMENT_STATUS.DRAFT,
            currentRevisionId: "revision-2",
            currentContentJson: makeContent("Updated"),
            createdBy: "author-1",
            updatedBy: "author-1",
        },
        "document-1",
    );

const makeRevision = (id: string, revisionNumber: number) =>
    DocumentRevisionEntity.create(
        {
            documentId: "document-1",
            revisionNumber,
            contentJson: makeContent(`Revision ${revisionNumber}`),
            createdBy: "author-1",
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

describe("GetRevisionsUseCase", () => {
    let sut: GetRevisionsUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new GetRevisionsUseCase(documentsRepository);
    });

    it("lists revisions when document exists", async () => {
        documentsRepository.findById.mockResolvedValue(makeDocument());
        documentsRepository.findRevisions.mockResolvedValue([
            makeRevision("revision-2", 2),
            makeRevision("revision-1", 1),
        ]);

        const result = await sut.execute({ documentId: "document-1" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.revisions).toHaveLength(2);
            expect(result.value.revisions[0].revisionNumber).toBe(2);
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

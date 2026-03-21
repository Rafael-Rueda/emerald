import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { ListDocumentsUseCase } from "../../use-cases/list-documents.use-case";

const makeContent = (): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [],
});

const makeDocument = (id: string, title: string) =>
    DocumentEntity.create(
        {
            spaceId: "space-1",
            spaceKey: "guides",
            releaseVersionId: "version-1",
            title,
            slug: title.toLowerCase().replace(/\s+/g, "-"),
            status: DOCUMENT_STATUS.DRAFT,
            currentRevisionId: `${id}-revision`,
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
    createRevision: jest.fn<Promise<DocumentRevisionEntity | null>, any[]>(),
    findRevisions: jest.fn(),
});

describe("ListDocumentsUseCase", () => {
    let sut: ListDocumentsUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new ListDocumentsUseCase(documentsRepository);
    });

    it("returns paginated documents for a space", async () => {
        documentsRepository.listBySpaceId.mockResolvedValue({
            documents: [makeDocument("doc-1", "Getting Started"), makeDocument("doc-2", "API Reference")],
            total: 2,
        });

        const result = await sut.execute({
            spaceId: "space-1",
            page: 1,
            limit: 10,
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.documents).toHaveLength(2);
            expect(result.value.total).toBe(2);
        }

        expect(documentsRepository.listBySpaceId).toHaveBeenCalledWith({
            spaceId: "space-1",
            page: 1,
            limit: 10,
        });
    });
});

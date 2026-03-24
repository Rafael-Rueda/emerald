import type { DocumentContent } from "@emerald/contracts";

import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "../../../errors/document-not-found.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { CreateRevisionUseCase } from "../../use-cases/create-revision.use-case";

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

const makeRevision = (revisionNumber: number) => {
    const revision = DocumentRevisionEntity.create(
        {
            documentId: "document-1",
            revisionNumber,
            contentJson: makeContent("Updated text"),
            createdBy: "author-1",
            changeNote: "Updated content",
        },
        `revision-${revisionNumber}`,
    );

    revision.createdAt = new Date("2026-03-20T00:00:00.000Z");

    return revision;
};

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

describe("CreateRevisionUseCase", () => {
    let sut: CreateRevisionUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new CreateRevisionUseCase(documentsRepository);
    });

    it("creates a revision snapshot", async () => {
        documentsRepository.createRevision.mockResolvedValue(makeRevision(2));

        const result = await sut.execute({
            documentId: "document-1",
            contentJson: makeContent("Updated text"),
            createdBy: "author-1",
            changeNote: "Updated content",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.revision.revisionNumber).toBe(2);
            expect(result.value.revision.changeNote).toBe("Updated content");
        }
    });

    it("returns not found when document does not exist", async () => {
        documentsRepository.createRevision.mockResolvedValue(null);

        const result = await sut.execute({
            documentId: "missing-document",
            contentJson: makeContent("Updated text"),
            createdBy: "author-1",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(DocumentNotFoundError);
        }
    });
});

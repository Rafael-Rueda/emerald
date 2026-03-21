import type { DocumentContent } from "@emerald/contracts";

import { DOCUMENT_STATUS, DocumentEntity } from "../../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../../enterprise/entities/document-revision.entity";
import { DocumentSlugAlreadyExistsError } from "../../../errors/document-slug-already-exists.error";
import { type DocumentsRepository, type ListDocumentsResult } from "../../repositories/documents.repository";
import { CreateDocumentUseCase } from "../../use-cases/create-document.use-case";

const makeContent = (): DocumentContent => ({
    type: "doc",
    version: 1,
    children: [],
});

const makeDocument = (
    overrides: Partial<{
        id: string;
        spaceId: string;
        spaceKey: string;
        releaseVersionId: string;
        title: string;
        slug: string;
        status: "draft" | "published" | "archived";
    }> = {},
) =>
    DocumentEntity.create(
        {
            spaceId: overrides.spaceId ?? "space-1",
            spaceKey: overrides.spaceKey ?? "guides",
            releaseVersionId: overrides.releaseVersionId ?? "version-1",
            title: overrides.title ?? "Getting Started",
            slug: overrides.slug ?? "getting-started",
            status: overrides.status ?? DOCUMENT_STATUS.DRAFT,
            currentRevisionId: "revision-1",
            currentContentJson: makeContent(),
            createdBy: "user-1",
            updatedBy: "user-1",
        },
        overrides.id,
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

describe("CreateDocumentUseCase", () => {
    let sut: CreateDocumentUseCase;
    let documentsRepository: jest.Mocked<DocumentsRepository>;

    beforeEach(() => {
        documentsRepository = makeDocumentsRepository();
        sut = new CreateDocumentUseCase(documentsRepository);
    });

    it("creates a draft document when slug is unique for the target space+version", async () => {
        const createdDocument = makeDocument();

        documentsRepository.findBySlugInVersion.mockResolvedValue(null);
        documentsRepository.create.mockResolvedValue(createdDocument);

        const result = await sut.execute({
            spaceId: "space-1",
            releaseVersionId: "version-1",
            title: "Getting Started",
            slug: "getting-started",
            contentJson: makeContent(),
            createdBy: "author-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.document.id.toString()).toBe(createdDocument.id.toString());
            expect(result.value.document.status).toBe(DOCUMENT_STATUS.DRAFT);
        }

        expect(documentsRepository.create).toHaveBeenCalledTimes(1);
    });

    it("returns duplicate slug error when slug already exists in the same space+version", async () => {
        documentsRepository.findBySlugInVersion.mockResolvedValue(makeDocument());

        const result = await sut.execute({
            spaceId: "space-1",
            releaseVersionId: "version-1",
            title: "Getting Started",
            slug: "getting-started",
            contentJson: makeContent(),
            createdBy: "author-1",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(DocumentSlugAlreadyExistsError);
        }

        expect(documentsRepository.create).not.toHaveBeenCalled();
    });

    it("allows same slug when release version differs", async () => {
        documentsRepository.findBySlugInVersion.mockResolvedValue(null);
        documentsRepository.create.mockResolvedValue(makeDocument({ releaseVersionId: "version-2" }));

        const result = await sut.execute({
            spaceId: "space-1",
            releaseVersionId: "version-2",
            title: "Getting Started v2",
            slug: "getting-started",
            contentJson: makeContent(),
            createdBy: "author-1",
        });

        expect(result.isRight()).toBe(true);
        expect(documentsRepository.findBySlugInVersion).toHaveBeenCalledWith({
            spaceId: "space-1",
            slug: "getting-started",
            releaseVersionId: "version-2",
        });
    });
});

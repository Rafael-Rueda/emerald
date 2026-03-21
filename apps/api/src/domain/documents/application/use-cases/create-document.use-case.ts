import type { DocumentContent } from "@emerald/contracts";

import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentSlugAlreadyExistsError } from "@/domain/documents/errors/document-slug-already-exists.error";

interface CreateDocumentRequest {
    spaceId: string;
    releaseVersionId: string;
    title: string;
    slug: string;
    contentJson: DocumentContent;
    createdBy: string;
}

type CreateDocumentError = DocumentSlugAlreadyExistsError;

type CreateDocumentResponse = Either<CreateDocumentError, { document: DocumentEntity }>;

export class CreateDocumentUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
        const duplicate = await this.documentsRepository.findBySlugInVersion({
            spaceId: request.spaceId,
            slug: request.slug,
            releaseVersionId: request.releaseVersionId,
        });

        if (duplicate) {
            return Left.call(new DocumentSlugAlreadyExistsError());
        }

        const document = await this.documentsRepository.create({
            spaceId: request.spaceId,
            releaseVersionId: request.releaseVersionId,
            title: request.title,
            slug: request.slug,
            contentJson: request.contentJson,
            createdBy: request.createdBy,
        });

        return Right.call({ document });
    }
}

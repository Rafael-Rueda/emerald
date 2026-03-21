import type { DocumentContent } from "@emerald/contracts";

import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DocumentRevisionEntity } from "@/domain/documents/enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface CreateRevisionRequest {
    documentId: string;
    contentJson: DocumentContent;
    createdBy: string;
    changeNote?: string;
}

type CreateRevisionError = DocumentNotFoundError;

type CreateRevisionResponse = Either<CreateRevisionError, { revision: DocumentRevisionEntity }>;

export class CreateRevisionUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: CreateRevisionRequest): Promise<CreateRevisionResponse> {
        const revision = await this.documentsRepository.createRevision({
            documentId: request.documentId,
            contentJson: request.contentJson,
            createdBy: request.createdBy,
            changeNote: request.changeNote,
        });

        if (!revision) {
            return Left.call(new DocumentNotFoundError());
        }

        return Right.call({ revision });
    }
}

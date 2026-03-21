import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DocumentRevisionEntity } from "@/domain/documents/enterprise/entities/document-revision.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface GetRevisionsRequest {
    documentId: string;
}

type GetRevisionsError = DocumentNotFoundError;

type GetRevisionsResponse = Either<GetRevisionsError, { revisions: DocumentRevisionEntity[] }>;

export class GetRevisionsUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: GetRevisionsRequest): Promise<GetRevisionsResponse> {
        const document = await this.documentsRepository.findById(request.documentId);

        if (!document) {
            return Left.call(new DocumentNotFoundError());
        }

        const revisions = await this.documentsRepository.findRevisions(request.documentId);

        return Right.call({ revisions });
    }
}

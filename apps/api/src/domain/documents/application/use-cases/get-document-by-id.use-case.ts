import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface GetDocumentByIdRequest {
    documentId: string;
}

type GetDocumentByIdError = DocumentNotFoundError;

type GetDocumentByIdResponse = Either<GetDocumentByIdError, { document: DocumentEntity }>;

export class GetDocumentByIdUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: GetDocumentByIdRequest): Promise<GetDocumentByIdResponse> {
        const document = await this.documentsRepository.findById(request.documentId);

        if (!document) {
            return Left.call(new DocumentNotFoundError());
        }

        return Right.call({ document });
    }
}

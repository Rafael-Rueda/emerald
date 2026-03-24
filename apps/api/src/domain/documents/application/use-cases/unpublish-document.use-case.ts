import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DOCUMENT_STATUS, DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface UnpublishDocumentRequest {
    documentId: string;
    updatedBy: string;
}

type UnpublishDocumentError = DocumentNotFoundError;

type UnpublishDocumentResponse = Either<UnpublishDocumentError, { document: DocumentEntity }>;

export class UnpublishDocumentUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: UnpublishDocumentRequest): Promise<UnpublishDocumentResponse> {
        const existingDocument = await this.documentsRepository.findById(request.documentId);

        if (!existingDocument) {
            return Left.call(new DocumentNotFoundError());
        }

        if (existingDocument.status === DOCUMENT_STATUS.DRAFT) {
            return Right.call({ document: existingDocument });
        }

        const document = await this.documentsRepository.unpublish(request.documentId, request.updatedBy);

        if (!document) {
            return Left.call(new DocumentNotFoundError());
        }

        return Right.call({ document });
    }
}

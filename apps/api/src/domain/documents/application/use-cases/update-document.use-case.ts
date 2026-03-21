import type { DocumentContent } from "@emerald/contracts";

import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface UpdateDocumentRequest {
    documentId: string;
    updatedBy: string;
    title?: string;
    contentJson?: DocumentContent;
}

type UpdateDocumentError = DocumentNotFoundError;

type UpdateDocumentResponse = Either<UpdateDocumentError, { document: DocumentEntity }>;

export class UpdateDocumentUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
        const document = await this.documentsRepository.update({
            documentId: request.documentId,
            updatedBy: request.updatedBy,
            title: request.title,
            contentJson: request.contentJson,
        });

        if (!document) {
            return Left.call(new DocumentNotFoundError());
        }

        return Right.call({ document });
    }
}

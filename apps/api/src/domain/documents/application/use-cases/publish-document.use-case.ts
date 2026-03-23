import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { AiContextService } from "@/domain/ai-context/application/ai-context.service";
import { DOCUMENT_STATUS, DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentNotFoundError } from "@/domain/documents/errors/document-not-found.error";

interface PublishDocumentRequest {
    documentId: string;
    updatedBy: string;
}

type PublishDocumentError = DocumentNotFoundError;

type PublishDocumentResponse = Either<PublishDocumentError, { document: DocumentEntity }>;

export class PublishDocumentUseCase {
    constructor(
        private documentsRepository: DocumentsRepository,
        private aiContextService: AiContextService,
    ) {}

    async execute(request: PublishDocumentRequest): Promise<PublishDocumentResponse> {
        const existingDocument = await this.documentsRepository.findById(request.documentId);

        if (!existingDocument) {
            return Left.call(new DocumentNotFoundError());
        }

        if (existingDocument.status === DOCUMENT_STATUS.PUBLISHED) {
            return Right.call({ document: existingDocument });
        }

        const document = await this.documentsRepository.publish(request.documentId, request.updatedBy);

        if (!document) {
            return Left.call(new DocumentNotFoundError());
        }

        this.aiContextService.generateAndStoreEmbeddings(request.documentId).catch(() => {});

        return Right.call({ document });
    }
}

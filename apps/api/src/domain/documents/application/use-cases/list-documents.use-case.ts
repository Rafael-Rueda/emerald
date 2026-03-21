import { DocumentsRepository } from "../repositories/documents.repository";

import { Either, Right } from "@/domain/@shared/either";
import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";

interface ListDocumentsRequest {
    spaceId: string;
    page: number;
    limit: number;
}

type ListDocumentsResponse = Either<never, { documents: DocumentEntity[]; total: number }>;

export class ListDocumentsUseCase {
    constructor(private documentsRepository: DocumentsRepository) {}

    async execute(request: ListDocumentsRequest): Promise<ListDocumentsResponse> {
        const result = await this.documentsRepository.listBySpaceId({
            spaceId: request.spaceId,
            page: request.page,
            limit: request.limit,
        });

        return Right.call({
            documents: result.documents,
            total: result.total,
        });
    }
}

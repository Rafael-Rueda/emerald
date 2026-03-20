import { File } from "../../enterprise/entities/file.entity";
import { FileNotFoundError } from "../../errors/file-not-found.error";
import { IStorageProvider } from "../providers/storage.provider";
import { FilesRepository } from "../repositories/files.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DomainEvents } from "@/domain/@shared/events/domain-events";

interface DeleteFileByEntityRequest {
    entityType: string;
    entityId: string;
    field: string;
}

type DeleteFileByEntityError = FileNotFoundError;

type DeleteFileByEntityResponse = Either<DeleteFileByEntityError, { file: File }>;

export class DeleteFileByEntityUseCase {
    constructor(
        private filesRepository: FilesRepository,
        private storageProvider: IStorageProvider,
    ) {}

    async execute(request: DeleteFileByEntityRequest): Promise<DeleteFileByEntityResponse> {
        const { entityType, entityId, field } = request;

        const file = await this.filesRepository.findByEntityAndField(entityType, entityId, field);

        if (!file) {
            return Left.call(new FileNotFoundError(`${entityType}/${entityId}/${field}`));
        }

        // Mark file for deletion and emit FileDeletedEvent
        file.delete();

        // Dispatch domain events before physical deletion
        DomainEvents.dispatchEventsForAggregate(file.id);

        // Delete from storage
        await this.storageProvider.delete(file.path.toString());

        // Delete from database
        await this.filesRepository.delete(file.id.toString());

        return Right.call({ file });
    }
}

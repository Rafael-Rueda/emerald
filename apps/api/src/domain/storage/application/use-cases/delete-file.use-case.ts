import { File } from "../../enterprise/entities/file.entity";
import { FileNotFoundError } from "../../errors/file-not-found.error";
import { IStorageProvider } from "../providers/storage.provider";
import { FilesRepository } from "../repositories/files.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DomainEvents } from "@/domain/@shared/events/domain-events";

interface DeleteFileRequest {
    fileId: string;
}

type DeleteFileError = FileNotFoundError;

type DeleteFileResponse = Either<DeleteFileError, { file: File }>;

export class DeleteFileUseCase {
    constructor(
        private filesRepository: FilesRepository,
        private storageProvider: IStorageProvider,
    ) {}

    async execute(request: DeleteFileRequest): Promise<DeleteFileResponse> {
        const { fileId } = request;

        const file = await this.filesRepository.findById(fileId);

        if (!file) {
            return Left.call(new FileNotFoundError(fileId));
        }

        // Mark file for deletion and emit FileDeletedEvent
        file.delete();

        // Dispatch domain events before physical deletion
        DomainEvents.dispatchEventsForAggregate(file.id);

        // Delete from storage
        await this.storageProvider.delete(file.path.toString());

        // Delete from database
        await this.filesRepository.delete(fileId);

        return Right.call({ file });
    }
}

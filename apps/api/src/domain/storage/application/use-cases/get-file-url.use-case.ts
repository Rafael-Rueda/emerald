import { FileNotFoundError } from "../../errors/file-not-found.error";
import { IStorageProvider } from "../providers/storage.provider";
import { FilesRepository } from "../repositories/files.repository";

import { Either, Left, Right } from "@/domain/@shared/either";

interface GetFileUrlRequest {
    fileId?: string;
    entityType?: string;
    entityId?: string;
    field?: string;
    signed?: boolean;
    expiresInMinutes?: number;
}

type GetFileUrlError = FileNotFoundError;

type GetFileUrlResponse = Either<
    GetFileUrlError,
    {
        url: string;
        filename: string;
        mimeType: string;
        size: number;
    }
>;

export class GetFileUrlUseCase {
    constructor(
        private filesRepository: FilesRepository,
        private storageProvider: IStorageProvider,
    ) {}

    async execute(request: GetFileUrlRequest): Promise<GetFileUrlResponse> {
        const { fileId, entityType, entityId, field, signed = false, expiresInMinutes = 60 } = request;

        let file;

        if (fileId) {
            file = await this.filesRepository.findById(fileId);
        } else if (entityType && entityId && field) {
            file = await this.filesRepository.findByEntityAndField(entityType, entityId, field);
        }

        if (!file) {
            return Left.call(new FileNotFoundError(fileId ?? `${entityType}/${entityId}/${field}`));
        }

        const url = signed
            ? await this.storageProvider.getSignedUrl(file.path.toString(), expiresInMinutes)
            : this.storageProvider.getPublicUrl(file.path.toString());

        return Right.call({
            url,
            filename: file.filename,
            mimeType: file.mimeType,
            size: file.size,
        });
    }
}

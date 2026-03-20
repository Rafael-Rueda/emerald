import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { ValidationOptions } from "@/domain/storage/application/providers/file-validator.provider";
import { ResizeOptions } from "@/domain/storage/application/providers/image-processor.provider";
import { DeleteFileUseCase } from "@/domain/storage/application/use-cases/delete-file.use-case";
import { GetFileUrlUseCase } from "@/domain/storage/application/use-cases/get-file-url.use-case";
import { UploadFileUseCase } from "@/domain/storage/application/use-cases/upload-file.use-case";

interface UploadParams {
    entityType: string;
    entityId: string;
    field: string;
    file: Express.Multer.File;
    environment: string;
    validationOptions?: ValidationOptions;
    optimizeImage?: ResizeOptions;
}

@Injectable()
export class StorageService {
    constructor(
        @Inject("UploadFileUseCase")
        private uploadFileUseCase: UploadFileUseCase,
        @Inject("DeleteFileUseCase")
        private deleteFileUseCase: DeleteFileUseCase,
        @Inject("GetFileUrlUseCase")
        private getFileUrlUseCase: GetFileUrlUseCase,
    ) {}

    async upload(params: UploadParams) {
        const result = await this.uploadFileUseCase.execute({
            entityType: params.entityType,
            entityId: params.entityId,
            field: params.field,
            filename: params.file.originalname,
            buffer: params.file.buffer,
            environment: params.environment,
            validationOptions: params.validationOptions,
            optimizeImage: params.optimizeImage,
        });

        if (result.isLeft()) {
            throw new BadRequestException(result.value.message);
        }

        return result.value;
    }

    async getFileUrl(fileId: string, signed: boolean = false, expiresInMinutes: number = 60) {
        const result = await this.getFileUrlUseCase.execute({
            fileId,
            signed,
            expiresInMinutes,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return result.value;
    }

    async getEntityFileUrl(
        entityType: string,
        entityId: string,
        field: string,
        signed: boolean = false,
        expiresInMinutes: number = 60,
    ) {
        const result = await this.getFileUrlUseCase.execute({
            entityType,
            entityId,
            field,
            signed,
            expiresInMinutes,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return result.value;
    }

    async delete(fileId: string) {
        const result = await this.deleteFileUseCase.execute({ fileId });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return result.value;
    }
}

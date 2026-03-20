import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaModule } from "./prisma.module";

import { IFileValidatorProvider } from "@/domain/storage/application/providers/file-validator.provider";
import { IImageProcessorProvider } from "@/domain/storage/application/providers/image-processor.provider";
import { IStorageProvider } from "@/domain/storage/application/providers/storage.provider";
import { FilesRepository } from "@/domain/storage/application/repositories/files.repository";
// Subscribers (Domain Events)
import { OnUserDeletedSubscriber } from "@/domain/storage/application/subscribers/on-user-deleted.subscriber";
import { DeleteFileUseCase } from "@/domain/storage/application/use-cases/delete-file.use-case";
import { DeleteFileByEntityUseCase } from "@/domain/storage/application/use-cases/delete-file-by-entity.use-case";
import { GetFileUrlUseCase } from "@/domain/storage/application/use-cases/get-file-url.use-case";
// Use Cases
import { UploadFileUseCase } from "@/domain/storage/application/use-cases/upload-file.use-case";
// Repositories
import { PrismaFilesRepository } from "@/infra/database/repositories/prisma/prisma-files.repository";
import { FileValidatorProvider } from "@/infra/storage/providers/file-validator.provider";
// Providers
import { GcpStorageProvider } from "@/infra/storage/providers/gcp-storage.provider";
import { SharpImageProcessorProvider } from "@/infra/storage/providers/sharp-image-processor.provider";

@Module({
    imports: [PrismaModule],
    providers: [
        // Repositories
        {
            provide: "FilesRepository",
            useClass: PrismaFilesRepository,
        },

        // Providers
        {
            provide: "StorageProvider",
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const bucketName = configService.get<string>("GCP_BUCKET_NAME");
                const keyFilePath = configService.get<string>("GCP_KEY_FILE_PATH");

                if (!bucketName) {
                    throw new Error("GCP_BUCKET_NAME environment variable is required");
                }

                return new GcpStorageProvider(bucketName, keyFilePath);
            },
        },
        {
            provide: "FileValidatorProvider",
            useClass: FileValidatorProvider,
        },
        {
            provide: "ImageProcessorProvider",
            useClass: SharpImageProcessorProvider,
        },

        // Use Cases
        {
            provide: "UploadFileUseCase",
            inject: ["FilesRepository", "StorageProvider", "FileValidatorProvider", "ImageProcessorProvider"],
            useFactory: (
                filesRepository: FilesRepository,
                storageProvider: IStorageProvider,
                fileValidator: IFileValidatorProvider,
                imageProcessor: IImageProcessorProvider,
            ) => new UploadFileUseCase(filesRepository, storageProvider, fileValidator, imageProcessor),
        },
        {
            provide: "DeleteFileUseCase",
            inject: ["FilesRepository", "StorageProvider"],
            useFactory: (filesRepository: FilesRepository, storageProvider: IStorageProvider) =>
                new DeleteFileUseCase(filesRepository, storageProvider),
        },
        {
            provide: "GetFileUrlUseCase",
            inject: ["FilesRepository", "StorageProvider"],
            useFactory: (filesRepository: FilesRepository, storageProvider: IStorageProvider) =>
                new GetFileUrlUseCase(filesRepository, storageProvider),
        },
        {
            provide: "DeleteFileByEntityUseCase",
            inject: ["FilesRepository", "StorageProvider"],
            useFactory: (filesRepository: FilesRepository, storageProvider: IStorageProvider) =>
                new DeleteFileByEntityUseCase(filesRepository, storageProvider),
        },

        // Subscribers (Domain Events)
        {
            provide: "OnUserDeletedSubscriber",
            inject: ["FilesRepository", "StorageProvider"],
            useFactory: (filesRepository: FilesRepository, storageProvider: IStorageProvider) =>
                new OnUserDeletedSubscriber(filesRepository, storageProvider),
        },
    ],
    exports: [
        // Note: FilesRepository is intentionally NOT exported to enforce bounded context separation
        // Other modules should use the use cases instead of accessing the repository directly
        "StorageProvider",
        "FileValidatorProvider",
        "ImageProcessorProvider",
        "UploadFileUseCase",
        "DeleteFileUseCase",
        "DeleteFileByEntityUseCase",
        "GetFileUrlUseCase",
    ],
})
export class StorageSharedModule {}

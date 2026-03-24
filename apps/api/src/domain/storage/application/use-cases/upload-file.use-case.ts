import { Readable } from "stream";

import { File } from "../../enterprise/entities/file.entity";
import { FileMetadata } from "../../enterprise/value-objects/file-metadata.vo";
import { FilePath } from "../../enterprise/value-objects/file-path.vo";
import { FileTooLargeError } from "../../errors/file-too-large.error";
import { InvalidFileTypeError } from "../../errors/invalid-file-type.error";
import { InvalidImageDimensionsError } from "../../errors/invalid-image-dimensions.error";
import { StorageUploadError } from "../../errors/storage-upload.error";
import { IFileValidatorProvider, ValidationOptions } from "../providers/file-validator.provider";
import { IImageProcessorProvider, ResizeOptions } from "../providers/image-processor.provider";
import { IStorageProvider } from "../providers/storage.provider";
import { FilesRepository } from "../repositories/files.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DomainEvents } from "@/domain/@shared/events/domain-events";

interface UploadFileRequest {
    entityType: string;
    entityId: string;
    field: string;
    filename: string;
    buffer: Buffer;
    environment: string;
    validationOptions?: ValidationOptions;
    /** Optimize image before saving (resize/compress). Only the optimized version is saved. */
    optimizeImage?: ResizeOptions;
    replaceExisting?: boolean;
}

type UploadFileError = InvalidFileTypeError | FileTooLargeError | InvalidImageDimensionsError | StorageUploadError;

type UploadFileResponse = Either<
    UploadFileError,
    {
        file: File;
        url: string;
    }
>;

export class UploadFileUseCase {
    constructor(
        private filesRepository: FilesRepository,
        private storageProvider: IStorageProvider,
        private fileValidator: IFileValidatorProvider,
        private imageProcessor: IImageProcessorProvider,
    ) {}

    async execute(request: UploadFileRequest): Promise<UploadFileResponse> {
        const {
            entityType,
            entityId,
            field,
            filename,
            buffer,
            environment,
            validationOptions,
            optimizeImage,
            replaceExisting = true,
        } = request;

        // Validate file
        if (validationOptions) {
            const validationResult = await this.fileValidator.validate(buffer, validationOptions);

            if (!validationResult.isValid) {
                if (validationResult.error?.includes("type")) {
                    return Left.call(
                        new InvalidFileTypeError(validationResult.detectedMimeType, validationOptions.allowedMimeTypes),
                    );
                }
                if (validationResult.error?.includes("size")) {
                    return Left.call(new FileTooLargeError(buffer.length, validationOptions.maxSizeBytes ?? 0));
                }
                if (
                    validationResult.error?.includes("dimension") ||
                    validationResult.error?.includes("width") ||
                    validationResult.error?.includes("height")
                ) {
                    return Left.call(new InvalidImageDimensionsError(validationResult.error));
                }
            }
        }

        // Detect MIME type
        let detectedMimeType = await this.fileValidator.detectMimeType(buffer);
        if (!detectedMimeType) {
            return Left.call(new InvalidFileTypeError(undefined, validationOptions?.allowedMimeTypes));
        }

        // Process image: optimize/resize if requested (only save optimized version)
        let finalBuffer = buffer;
        let width: number | undefined;
        let height: number | undefined;

        if (detectedMimeType.startsWith("image/") && optimizeImage) {
            const processed = await this.imageProcessor.resize(buffer, optimizeImage);
            finalBuffer = processed.buffer;
            width = processed.width;
            height = processed.height;
            detectedMimeType = processed.mimeType;
        } else if (detectedMimeType.startsWith("image/")) {
            // Just get dimensions without processing
            const dimensions = await this.fileValidator.getImageDimensions(buffer);
            if (dimensions) {
                width = dimensions.width;
                height = dimensions.height;
            }
        }

        // Check for existing file and delete it if replacing
        const existingFile = await this.filesRepository.findByEntityAndField(entityType, entityId, field);

        if (existingFile && replaceExisting) {
            // Delete old file from storage
            await this.storageProvider.delete(existingFile.path.toString());
            // Delete from database
            await this.filesRepository.delete(existingFile.id.toString());
        }

        // Build file path
        const filePath = FilePath.build(entityType, entityId, filename, environment);

        let uploadedFileUrl = "";

        // Upload to storage (only the optimized version)
        try {
            const stream = Readable.from(finalBuffer);
            const uploadResult = await this.storageProvider.uploadStream(stream, {
                path: filePath.toString(),
                mimeType: detectedMimeType,
            });

            uploadedFileUrl = uploadResult.publicUrl;
        } catch (error) {
            return Left.call(new StorageUploadError(error instanceof Error ? error.message : "Unknown error"));
        }

        // Create file record
        const fileMetadata = FileMetadata.create({
            mimeType: detectedMimeType,
            size: finalBuffer.length,
            width,
            height,
        });

        const file = File.create({
            entityType,
            entityId,
            field,
            filename,
            path: filePath,
            metadata: fileMetadata,
        });

        const savedFile = await this.filesRepository.create(file);

        // Dispatch domain events (FileUploadedEvent)
        DomainEvents.dispatchEventsForAggregate(file.id);

        return Right.call({ file: savedFile, url: uploadedFileUrl });
    }
}

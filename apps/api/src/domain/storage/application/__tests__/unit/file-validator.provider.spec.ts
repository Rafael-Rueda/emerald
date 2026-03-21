import { InvalidFileTypeError } from "../../../errors/invalid-file-type.error";
import { IFileValidatorProvider } from "../../providers/file-validator.provider";
import { IImageProcessorProvider } from "../../providers/image-processor.provider";
import { IStorageProvider } from "../../providers/storage.provider";
import { FilesRepository } from "../../repositories/files.repository";
import { UploadFileUseCase } from "../../use-cases/upload-file.use-case";

const makeFilesRepository = (): jest.Mocked<FilesRepository> => ({
    findById: jest.fn(),
    findByPath: jest.fn(),
    findByEntity: jest.fn(),
    findByEntityAndField: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByEntity: jest.fn(),
});

const makeStorageProvider = (): jest.Mocked<IStorageProvider> => ({
    uploadStream: jest.fn(),
    uploadBuffer: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    copy: jest.fn(),
});

const makeFileValidator = (): jest.Mocked<IFileValidatorProvider> => ({
    validateMimeType: jest.fn(),
    validateSize: jest.fn(),
    validateDimensions: jest.fn(),
    getImageDimensions: jest.fn(),
    validate: jest.fn(),
    detectMimeType: jest.fn(),
});

const makeImageProcessor = (): jest.Mocked<IImageProcessorProvider> => ({
    resize: jest.fn(),
    generateThumbnails: jest.fn(),
    optimize: jest.fn(),
    convert: jest.fn(),
    isValidImage: jest.fn(),
    getMetadata: jest.fn(),
});

describe("Upload file validation rules", () => {
    const blockedMimeTypes = [
        "application/javascript",
        "text/html",
        "application/x-msdownload",
        "application/x-httpd-php",
    ];

    it.each(blockedMimeTypes)("rejects non-image MIME type: %s", async (blockedMimeType) => {
        const filesRepository = makeFilesRepository();
        const storageProvider = makeStorageProvider();
        const fileValidator = makeFileValidator();
        const imageProcessor = makeImageProcessor();

        fileValidator.validate.mockResolvedValue({
            isValid: false,
            error: "Invalid file type",
            detectedMimeType: blockedMimeType,
        });

        const sut = new UploadFileUseCase(filesRepository, storageProvider, fileValidator, imageProcessor);

        const result = await sut.execute({
            entityType: "user",
            entityId: "user-123",
            field: "avatar",
            filename: "payload.bin",
            buffer: Buffer.from("malicious payload"),
            environment: "test",
            validationOptions: {
                allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"],
                maxSizeBytes: 10 * 1024 * 1024,
            },
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(InvalidFileTypeError);
            expect(result.value.message).toContain(blockedMimeType);
        }
    });
});

import { File } from "../../../enterprise/entities/file.entity";
import { FileMetadata } from "../../../enterprise/value-objects/file-metadata.vo";
import { FilePath } from "../../../enterprise/value-objects/file-path.vo";
import { FileTooLargeError } from "../../../errors/file-too-large.error";
import { InvalidFileTypeError } from "../../../errors/invalid-file-type.error";
import { InvalidImageDimensionsError } from "../../../errors/invalid-image-dimensions.error";
import { StorageUploadError } from "../../../errors/storage-upload.error";
import { IFileValidatorProvider, ValidationResult } from "../../providers/file-validator.provider";
import { IImageProcessorProvider, ProcessedImage } from "../../providers/image-processor.provider";
import { IStorageProvider } from "../../providers/storage.provider";
import { FilesRepository } from "../../repositories/files.repository";
import { UploadFileUseCase } from "../../use-cases/upload-file.use-case";

const makeFile = (
    overrides: Partial<{
        entityType: string;
        entityId: string;
        field: string;
        filename: string;
        id: string;
    }> = {},
): File => {
    const filePath = FilePath.build(
        overrides.entityType ?? "user",
        overrides.entityId ?? "user-123",
        overrides.filename ?? "avatar.png",
        "development",
    );
    const metadata = FileMetadata.create({
        mimeType: "image/png",
        size: 1024,
        width: 200,
        height: 200,
    });
    return File.create(
        {
            entityType: overrides.entityType ?? "user",
            entityId: overrides.entityId ?? "user-123",
            field: overrides.field ?? "avatar",
            filename: overrides.filename ?? "avatar.png",
            path: filePath,
            metadata,
        },
        overrides.id,
    );
};

const makeFilesRepository = (): jest.Mocked<FilesRepository> => ({
    findById: jest.fn(),
    findByPath: jest.fn(),
    findByEntity: jest.fn(),
    findByEntityAndField: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByEntity: jest.fn(),
});

const makeStorageProvider = (): jest.Mocked<IStorageProvider> => ({
    uploadStream: jest.fn().mockResolvedValue({
        path: "development/2024/01/user/user-123/avatar.png",
        publicUrl: "https://storage.googleapis.com/bucket/development/2024/01/user/user-123/avatar.png",
        size: 1024,
    }),
    uploadBuffer: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    copy: jest.fn(),
});

const makeFileValidatorProvider = (): jest.Mocked<IFileValidatorProvider> => ({
    validateMimeType: jest.fn(),
    validateSize: jest.fn(),
    validateDimensions: jest.fn(),
    getImageDimensions: jest.fn().mockResolvedValue({ width: 200, height: 200 }),
    validate: jest.fn().mockResolvedValue({ isValid: true }),
    detectMimeType: jest.fn().mockResolvedValue("image/png"),
});

const makeImageProcessorProvider = (): jest.Mocked<IImageProcessorProvider> => ({
    resize: jest.fn().mockResolvedValue({
        buffer: Buffer.from("processed-image"),
        width: 400,
        height: 400,
        size: 512,
        mimeType: "image/webp",
    } as ProcessedImage),
    generateThumbnails: jest.fn(),
    optimize: jest.fn(),
    convert: jest.fn(),
    isValidImage: jest.fn(),
    getMetadata: jest.fn(),
});

describe("UploadFileUseCase", () => {
    let sut: UploadFileUseCase;
    let filesRepository: jest.Mocked<FilesRepository>;
    let storageProvider: jest.Mocked<IStorageProvider>;
    let fileValidator: jest.Mocked<IFileValidatorProvider>;
    let imageProcessor: jest.Mocked<IImageProcessorProvider>;

    const defaultRequest = {
        entityType: "user",
        entityId: "user-123",
        field: "avatar",
        filename: "avatar.png",
        buffer: Buffer.from("fake-image-content"),
        environment: "development",
    };

    beforeEach(() => {
        filesRepository = makeFilesRepository();
        storageProvider = makeStorageProvider();
        fileValidator = makeFileValidatorProvider();
        imageProcessor = makeImageProcessorProvider();
        sut = new UploadFileUseCase(filesRepository, storageProvider, fileValidator, imageProcessor);
    });

    it("should upload a file successfully", async () => {
        filesRepository.findByEntityAndField.mockResolvedValue(null);
        filesRepository.create.mockImplementation(async (file) => file);

        const result = await sut.execute(defaultRequest);

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.file.entityType).toBe("user");
            expect(result.value.file.entityId).toBe("user-123");
            expect(result.value.file.field).toBe("avatar");
            expect(result.value.file.filename).toBe("avatar.png");
        }
        expect(storageProvider.uploadStream).toHaveBeenCalledTimes(1);
        expect(filesRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should replace existing file when replaceExisting is true", async () => {
        const existingFile = makeFile();
        filesRepository.findByEntityAndField.mockResolvedValue(existingFile);
        filesRepository.create.mockImplementation(async (file) => file);

        const result = await sut.execute({ ...defaultRequest, replaceExisting: true });

        expect(result.isRight()).toBe(true);
        expect(storageProvider.delete).toHaveBeenCalledWith(existingFile.path.toString());
        expect(filesRepository.delete).toHaveBeenCalledWith(existingFile.id.toString());
        expect(filesRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should optimize image when optimizeImage option is provided", async () => {
        filesRepository.findByEntityAndField.mockResolvedValue(null);
        filesRepository.create.mockImplementation(async (file) => file);

        const result = await sut.execute({
            ...defaultRequest,
            optimizeImage: {
                width: 400,
                height: 400,
                fit: "cover",
                quality: 80,
                format: "webp",
            },
        });

        expect(result.isRight()).toBe(true);
        expect(imageProcessor.resize).toHaveBeenCalledTimes(1);
        expect(imageProcessor.resize).toHaveBeenCalledWith(defaultRequest.buffer, {
            width: 400,
            height: 400,
            fit: "cover",
            quality: 80,
            format: "webp",
        });
    });

    it("should return InvalidFileTypeError when validation fails for type", async () => {
        fileValidator.validate.mockResolvedValue({
            isValid: false,
            error: "Invalid file type",
            detectedMimeType: "application/pdf",
        });

        const result = await sut.execute({
            ...defaultRequest,
            validationOptions: {
                allowedMimeTypes: ["image/jpeg", "image/png"],
            },
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(InvalidFileTypeError);
        }
        expect(filesRepository.create).not.toHaveBeenCalled();
    });

    it("should return FileTooLargeError when validation fails for size", async () => {
        fileValidator.validate.mockResolvedValue({
            isValid: false,
            error: "File size exceeds maximum",
        });

        const result = await sut.execute({
            ...defaultRequest,
            validationOptions: {
                maxSizeBytes: 1024,
            },
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(FileTooLargeError);
        }
        expect(filesRepository.create).not.toHaveBeenCalled();
    });

    it("should return InvalidImageDimensionsError when validation fails for dimensions", async () => {
        fileValidator.validate.mockResolvedValue({
            isValid: false,
            error: "Image dimensions exceed maximum",
        });

        const result = await sut.execute({
            ...defaultRequest,
            validationOptions: {
                maxWidth: 100,
                maxHeight: 100,
            },
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(InvalidImageDimensionsError);
        }
        expect(filesRepository.create).not.toHaveBeenCalled();
    });

    it("should return InvalidFileTypeError when MIME type cannot be detected", async () => {
        fileValidator.detectMimeType.mockResolvedValue(null);
        filesRepository.findByEntityAndField.mockResolvedValue(null);

        const result = await sut.execute(defaultRequest);

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(InvalidFileTypeError);
        }
        expect(filesRepository.create).not.toHaveBeenCalled();
    });

    it("should return StorageUploadError when storage upload fails", async () => {
        filesRepository.findByEntityAndField.mockResolvedValue(null);
        storageProvider.uploadStream.mockRejectedValue(new Error("Storage connection failed"));

        const result = await sut.execute(defaultRequest);

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(StorageUploadError);
        }
        expect(filesRepository.create).not.toHaveBeenCalled();
    });

    it("should get image dimensions for non-optimized images", async () => {
        filesRepository.findByEntityAndField.mockResolvedValue(null);
        filesRepository.create.mockImplementation(async (file) => file);
        fileValidator.getImageDimensions.mockResolvedValue({ width: 800, height: 600 });

        const result = await sut.execute(defaultRequest);

        expect(result.isRight()).toBe(true);
        expect(fileValidator.getImageDimensions).toHaveBeenCalledWith(defaultRequest.buffer);
    });

    it("should not replace existing file when replaceExisting is false", async () => {
        const existingFile = makeFile();
        filesRepository.findByEntityAndField.mockResolvedValue(existingFile);
        filesRepository.create.mockImplementation(async (file) => file);

        const result = await sut.execute({ ...defaultRequest, replaceExisting: false });

        expect(result.isRight()).toBe(true);
        expect(storageProvider.delete).not.toHaveBeenCalled();
        expect(filesRepository.delete).not.toHaveBeenCalled();
    });
});

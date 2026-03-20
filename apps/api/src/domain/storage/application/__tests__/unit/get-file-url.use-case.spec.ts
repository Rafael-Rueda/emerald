import { File } from "../../../enterprise/entities/file.entity";
import { FileMetadata } from "../../../enterprise/value-objects/file-metadata.vo";
import { FilePath } from "../../../enterprise/value-objects/file-path.vo";
import { FileNotFoundError } from "../../../errors/file-not-found.error";
import { IStorageProvider } from "../../providers/storage.provider";
import { FilesRepository } from "../../repositories/files.repository";
import { GetFileUrlUseCase } from "../../use-cases/get-file-url.use-case";

const makeFile = (
    overrides: Partial<{
        entityType: string;
        entityId: string;
        field: string;
        filename: string;
        mimeType: string;
        size: number;
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
        mimeType: overrides.mimeType ?? "image/png",
        size: overrides.size ?? 1024,
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
        overrides.id ?? "file-123",
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
    uploadStream: jest.fn(),
    uploadBuffer: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn().mockResolvedValue("https://storage.googleapis.com/bucket/signed-url?token=xyz"),
    getPublicUrl: jest.fn().mockReturnValue("https://storage.googleapis.com/bucket/public-url"),
    copy: jest.fn(),
});

describe("GetFileUrlUseCase", () => {
    let sut: GetFileUrlUseCase;
    let filesRepository: jest.Mocked<FilesRepository>;
    let storageProvider: jest.Mocked<IStorageProvider>;

    beforeEach(() => {
        filesRepository = makeFilesRepository();
        storageProvider = makeStorageProvider();
        sut = new GetFileUrlUseCase(filesRepository, storageProvider);
    });

    describe("get by fileId", () => {
        it("should return public URL when file exists", async () => {
            const file = makeFile({ filename: "avatar.png", mimeType: "image/png", size: 2048 });
            filesRepository.findById.mockResolvedValue(file);

            const result = await sut.execute({ fileId: "file-123" });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.url).toBe("https://storage.googleapis.com/bucket/public-url");
                expect(result.value.filename).toBe("avatar.png");
                expect(result.value.mimeType).toBe("image/png");
                expect(result.value.size).toBe(2048);
            }
            expect(storageProvider.getPublicUrl).toHaveBeenCalledWith(file.path.toString());
        });

        it("should return signed URL when signed is true", async () => {
            const file = makeFile();
            filesRepository.findById.mockResolvedValue(file);

            const result = await sut.execute({ fileId: "file-123", signed: true, expiresInMinutes: 30 });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.url).toBe("https://storage.googleapis.com/bucket/signed-url?token=xyz");
            }
            expect(storageProvider.getSignedUrl).toHaveBeenCalledWith(file.path.toString(), 30);
        });

        it("should use default expiration time of 60 minutes", async () => {
            const file = makeFile();
            filesRepository.findById.mockResolvedValue(file);

            await sut.execute({ fileId: "file-123", signed: true });

            expect(storageProvider.getSignedUrl).toHaveBeenCalledWith(file.path.toString(), 60);
        });

        it("should return FileNotFoundError when file does not exist", async () => {
            filesRepository.findById.mockResolvedValue(null);

            const result = await sut.execute({ fileId: "non-existent-file" });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(FileNotFoundError);
            }
        });
    });

    describe("get by entity and field", () => {
        it("should return public URL when file exists by entity and field", async () => {
            const file = makeFile({ entityType: "user", entityId: "user-456", field: "avatar" });
            filesRepository.findByEntityAndField.mockResolvedValue(file);

            const result = await sut.execute({
                entityType: "user",
                entityId: "user-456",
                field: "avatar",
            });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.url).toBe("https://storage.googleapis.com/bucket/public-url");
            }
            expect(filesRepository.findByEntityAndField).toHaveBeenCalledWith("user", "user-456", "avatar");
        });

        it("should return signed URL when signed is true using entity and field", async () => {
            const file = makeFile();
            filesRepository.findByEntityAndField.mockResolvedValue(file);

            const result = await sut.execute({
                entityType: "user",
                entityId: "user-123",
                field: "avatar",
                signed: true,
                expiresInMinutes: 15,
            });

            expect(result.isRight()).toBe(true);
            expect(storageProvider.getSignedUrl).toHaveBeenCalledWith(file.path.toString(), 15);
        });

        it("should return FileNotFoundError when file does not exist by entity and field", async () => {
            filesRepository.findByEntityAndField.mockResolvedValue(null);

            const result = await sut.execute({
                entityType: "user",
                entityId: "user-789",
                field: "avatar",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(FileNotFoundError);
            }
        });
    });

    describe("priority", () => {
        it("should prioritize fileId over entity/field lookup", async () => {
            const file = makeFile();
            filesRepository.findById.mockResolvedValue(file);

            await sut.execute({
                fileId: "file-123",
                entityType: "user",
                entityId: "user-123",
                field: "avatar",
            });

            expect(filesRepository.findById).toHaveBeenCalledWith("file-123");
            expect(filesRepository.findByEntityAndField).not.toHaveBeenCalled();
        });
    });
});

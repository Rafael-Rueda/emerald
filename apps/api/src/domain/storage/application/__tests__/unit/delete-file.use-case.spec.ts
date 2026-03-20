import { File } from "../../../enterprise/entities/file.entity";
import { FileMetadata } from "../../../enterprise/value-objects/file-metadata.vo";
import { FilePath } from "../../../enterprise/value-objects/file-path.vo";
import { FileNotFoundError } from "../../../errors/file-not-found.error";
import { IStorageProvider } from "../../providers/storage.provider";
import { FilesRepository } from "../../repositories/files.repository";
import { DeleteFileUseCase } from "../../use-cases/delete-file.use-case";

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
    getSignedUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    copy: jest.fn(),
});

describe("DeleteFileUseCase", () => {
    let sut: DeleteFileUseCase;
    let filesRepository: jest.Mocked<FilesRepository>;
    let storageProvider: jest.Mocked<IStorageProvider>;

    beforeEach(() => {
        filesRepository = makeFilesRepository();
        storageProvider = makeStorageProvider();
        sut = new DeleteFileUseCase(filesRepository, storageProvider);
    });

    it("should delete a file successfully", async () => {
        const file = makeFile();
        filesRepository.findById.mockResolvedValue(file);
        filesRepository.delete.mockResolvedValue(file);

        const result = await sut.execute({ fileId: "file-123" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.file.id.toString()).toBe("file-123");
        }
        expect(storageProvider.delete).toHaveBeenCalledWith(file.path.toString());
        expect(filesRepository.delete).toHaveBeenCalledWith("file-123");
    });

    it("should return FileNotFoundError when file does not exist", async () => {
        filesRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({ fileId: "non-existent-file" });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(FileNotFoundError);
        }
        expect(storageProvider.delete).not.toHaveBeenCalled();
        expect(filesRepository.delete).not.toHaveBeenCalled();
    });

    it("should delete file from storage before deleting from database", async () => {
        const file = makeFile();
        filesRepository.findById.mockResolvedValue(file);
        filesRepository.delete.mockResolvedValue(file);

        const callOrder: string[] = [];
        storageProvider.delete.mockImplementation(async () => {
            callOrder.push("storage");
        });
        filesRepository.delete.mockImplementation(async () => {
            callOrder.push("repository");
            return file;
        });

        await sut.execute({ fileId: "file-123" });

        expect(callOrder).toEqual(["storage", "repository"]);
    });
});

import { RELEASE_VERSION_STATUS, ReleaseVersionEntity } from "../../../enterprise/entities/release-version.entity";
import { ReleaseVersionKeyAlreadyExistsError } from "../../../errors/release-version-key-already-exists.error";
import { type ReleaseVersionsRepository } from "../../repositories/release-versions.repository";
import { CreateReleaseVersionUseCase } from "../../use-cases/create-release-version.use-case";

const makeReleaseVersion = (
    overrides: Partial<{
        id: string;
        spaceId: string;
        key: string;
        label: string;
        status: "draft" | "published" | "archived";
        isDefault: boolean;
        publishedAt: Date | null;
    }> = {},
) =>
    ReleaseVersionEntity.create(
        {
            spaceId: overrides.spaceId ?? "space-1",
            key: overrides.key ?? "v1",
            label: overrides.label ?? "Version 1",
            status: overrides.status ?? RELEASE_VERSION_STATUS.DRAFT,
            isDefault: overrides.isDefault ?? false,
            publishedAt: overrides.publishedAt ?? null,
        },
        overrides.id,
    );

const makeVersionsRepository = (): jest.Mocked<ReleaseVersionsRepository> => ({
    findById: jest.fn(),
    findByKeyInSpace: jest.fn(),
    listBySpaceId: jest.fn(),
    create: jest.fn(),
    publish: jest.fn(),
    setDefault: jest.fn(),
    archive: jest.fn(),
});

describe("CreateReleaseVersionUseCase", () => {
    let sut: CreateReleaseVersionUseCase;
    let releaseVersionsRepository: jest.Mocked<ReleaseVersionsRepository>;

    beforeEach(() => {
        releaseVersionsRepository = makeVersionsRepository();
        sut = new CreateReleaseVersionUseCase(releaseVersionsRepository);
    });

    it("creates a release version when key is unique in the space", async () => {
        const createdVersion = makeReleaseVersion({ key: "v2", label: "Version 2" });

        releaseVersionsRepository.findByKeyInSpace.mockResolvedValue(null);
        releaseVersionsRepository.create.mockResolvedValue(createdVersion);

        const result = await sut.execute({
            spaceId: "space-1",
            key: "v2",
            label: "Version 2",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.version.key).toBe("v2");
            expect(result.value.version.status).toBe(RELEASE_VERSION_STATUS.DRAFT);
        }
    });

    it("returns duplicate key error when key already exists in the same space", async () => {
        releaseVersionsRepository.findByKeyInSpace.mockResolvedValue(makeReleaseVersion({ key: "v1" }));

        const result = await sut.execute({
            spaceId: "space-1",
            key: "v1",
            label: "Duplicate Version 1",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(ReleaseVersionKeyAlreadyExistsError);
        }

        expect(releaseVersionsRepository.create).not.toHaveBeenCalled();
    });
});

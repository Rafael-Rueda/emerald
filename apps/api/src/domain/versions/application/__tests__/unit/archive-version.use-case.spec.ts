import { RELEASE_VERSION_STATUS, ReleaseVersionEntity } from "../../../enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "../../../errors/release-version-not-found.error";
import { type ReleaseVersionsRepository } from "../../repositories/release-versions.repository";
import { ArchiveVersionUseCase } from "../../use-cases/archive-version.use-case";

const makeReleaseVersion = (
    overrides: Partial<{
        id: string;
        status: "draft" | "published" | "archived";
        isDefault: boolean;
    }> = {},
) =>
    ReleaseVersionEntity.create(
        {
            spaceId: "space-1",
            key: "v1",
            label: "Version 1",
            status: overrides.status ?? RELEASE_VERSION_STATUS.DRAFT,
            isDefault: overrides.isDefault ?? false,
            publishedAt: null,
        },
        overrides.id ?? "version-1",
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

describe("ArchiveVersionUseCase", () => {
    let sut: ArchiveVersionUseCase;
    let releaseVersionsRepository: jest.Mocked<ReleaseVersionsRepository>;

    beforeEach(() => {
        releaseVersionsRepository = makeVersionsRepository();
        sut = new ArchiveVersionUseCase(releaseVersionsRepository);
    });

    it("archives an existing release version", async () => {
        releaseVersionsRepository.findById.mockResolvedValue(
            makeReleaseVersion({ status: RELEASE_VERSION_STATUS.DRAFT }),
        );
        releaseVersionsRepository.archive.mockResolvedValue(
            makeReleaseVersion({ status: RELEASE_VERSION_STATUS.ARCHIVED, isDefault: false }),
        );

        const result = await sut.execute({
            versionId: "version-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.version.status).toBe(RELEASE_VERSION_STATUS.ARCHIVED);
            expect(result.value.version.isDefault).toBe(false);
        }
    });

    it("returns not found when release version does not exist", async () => {
        releaseVersionsRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            versionId: "missing-version",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(ReleaseVersionNotFoundError);
        }
    });
});

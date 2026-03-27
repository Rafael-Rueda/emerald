import { RELEASE_VERSION_STATUS, ReleaseVersionEntity } from "../../../enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "../../../errors/release-version-not-found.error";
import { type ReleaseVersionsRepository } from "../../repositories/release-versions.repository";
import { PublishVersionUseCase } from "../../use-cases/publish-version.use-case";

const makeReleaseVersion = (
    overrides: Partial<{
        id: string;
        status: "draft" | "published" | "archived";
        publishedAt: Date | null;
    }> = {},
) =>
    ReleaseVersionEntity.create(
        {
            spaceId: "space-1",
            key: "v1",
            label: "Version 1",
            status: overrides.status ?? RELEASE_VERSION_STATUS.DRAFT,
            isDefault: false,
            publishedAt: overrides.publishedAt ?? null,
        },
        overrides.id ?? "version-1",
    );

const makeVersionsRepository = (): jest.Mocked<ReleaseVersionsRepository> => ({
    findById: jest.fn(),
    findByKeyInSpace: jest.fn(),
    listBySpaceId: jest.fn(),
    create: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    setDefault: jest.fn(),
    archive: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
});

describe("PublishVersionUseCase", () => {
    let sut: PublishVersionUseCase;
    let releaseVersionsRepository: jest.Mocked<ReleaseVersionsRepository>;

    beforeEach(() => {
        releaseVersionsRepository = makeVersionsRepository();
        sut = new PublishVersionUseCase(releaseVersionsRepository);
    });

    it("publishes a draft version", async () => {
        const existingVersion = makeReleaseVersion({ status: RELEASE_VERSION_STATUS.DRAFT });
        const publishedVersion = makeReleaseVersion({
            status: RELEASE_VERSION_STATUS.PUBLISHED,
            publishedAt: new Date(),
        });

        releaseVersionsRepository.findById.mockResolvedValue(existingVersion);
        releaseVersionsRepository.publish.mockResolvedValue(publishedVersion);

        const result = await sut.execute({
            versionId: "version-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.version.status).toBe(RELEASE_VERSION_STATUS.PUBLISHED);
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

    it("returns existing version when already published", async () => {
        const publishedVersion = makeReleaseVersion({
            status: RELEASE_VERSION_STATUS.PUBLISHED,
            publishedAt: new Date(),
        });

        releaseVersionsRepository.findById.mockResolvedValue(publishedVersion);

        const result = await sut.execute({
            versionId: "version-1",
        });

        expect(result.isRight()).toBe(true);
        expect(releaseVersionsRepository.publish).not.toHaveBeenCalled();
    });
});

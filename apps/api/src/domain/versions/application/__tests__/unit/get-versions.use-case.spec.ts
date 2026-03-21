import {
    RELEASE_VERSION_STATUS,
    ReleaseVersionEntity,
} from "../../../enterprise/entities/release-version.entity";
import { type ReleaseVersionsRepository } from "../../repositories/release-versions.repository";
import { GetVersionsUseCase } from "../../use-cases/get-versions.use-case";

const makeReleaseVersion = (
    overrides: Partial<{
        id: string;
        key: string;
        label: string;
        status: "draft" | "published" | "archived";
        isDefault: boolean;
    }> = {},
) =>
    ReleaseVersionEntity.create(
        {
            spaceId: "space-1",
            key: overrides.key ?? "v1",
            label: overrides.label ?? "Version 1",
            status: overrides.status ?? RELEASE_VERSION_STATUS.DRAFT,
            isDefault: overrides.isDefault ?? false,
            publishedAt: null,
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

describe("GetVersionsUseCase", () => {
    let sut: GetVersionsUseCase;
    let releaseVersionsRepository: jest.Mocked<ReleaseVersionsRepository>;

    beforeEach(() => {
        releaseVersionsRepository = makeVersionsRepository();
        sut = new GetVersionsUseCase(releaseVersionsRepository);
    });

    it("returns all versions from a space", async () => {
        releaseVersionsRepository.listBySpaceId.mockResolvedValue([
            makeReleaseVersion({ key: "v1", isDefault: true }),
            makeReleaseVersion({ key: "v2", isDefault: false }),
        ]);

        const result = await sut.execute({
            spaceId: "space-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.versions).toHaveLength(2);
            expect(result.value.versions.map((version) => version.key)).toEqual(["v1", "v2"]);
        }
    });
});

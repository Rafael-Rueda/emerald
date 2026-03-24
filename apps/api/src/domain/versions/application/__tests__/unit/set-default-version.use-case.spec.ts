import { RELEASE_VERSION_STATUS, ReleaseVersionEntity } from "../../../enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "../../../errors/release-version-not-found.error";
import {
    CreateReleaseVersionParams,
    type ReleaseVersionsRepository,
} from "../../repositories/release-versions.repository";
import { SetDefaultVersionUseCase } from "../../use-cases/set-default-version.use-case";

const makeReleaseVersion = (
    overrides: Partial<{
        id: string;
        spaceId: string;
        key: string;
        label: string;
        isDefault: boolean;
    }> = {},
) =>
    ReleaseVersionEntity.create(
        {
            spaceId: overrides.spaceId ?? "space-1",
            key: overrides.key ?? "v1",
            label: overrides.label ?? "Version 1",
            status: RELEASE_VERSION_STATUS.PUBLISHED,
            isDefault: overrides.isDefault ?? false,
            publishedAt: new Date(),
        },
        overrides.id,
    );

class InMemoryReleaseVersionsRepository implements ReleaseVersionsRepository {
    constructor(public versions: ReleaseVersionEntity[]) {}

    async findById(id: string): Promise<ReleaseVersionEntity | null> {
        return this.versions.find((version) => version.id.toString() === id) ?? null;
    }

    async findByKeyInSpace(spaceId: string, key: string): Promise<ReleaseVersionEntity | null> {
        return this.versions.find((version) => version.spaceId === spaceId && version.key === key) ?? null;
    }

    async listBySpaceId(spaceId: string): Promise<ReleaseVersionEntity[]> {
        return this.versions.filter((version) => version.spaceId === spaceId);
    }

    async create(params: CreateReleaseVersionParams): Promise<ReleaseVersionEntity> {
        const version = makeReleaseVersion({
            id: `created-${Date.now()}`,
            spaceId: params.spaceId,
            key: params.key,
            label: params.label,
            isDefault: false,
        });

        this.versions.push(version);
        return version;
    }

    async publish(versionId: string): Promise<ReleaseVersionEntity | null> {
        return this.findById(versionId);
    }

    async setDefault(versionId: string): Promise<ReleaseVersionEntity | null> {
        const target = await this.findById(versionId);

        if (!target) {
            return null;
        }

        for (const version of this.versions) {
            if (version.spaceId === target.spaceId) {
                version.isDefault = false;
            }
        }

        target.isDefault = true;
        return target;
    }

    async archive(versionId: string): Promise<ReleaseVersionEntity | null> {
        return this.findById(versionId);
    }
}

describe("SetDefaultVersionUseCase", () => {
    it("ensures exactly one default version per space", async () => {
        const v1 = makeReleaseVersion({ id: "version-1", key: "v1", isDefault: true });
        const v2 = makeReleaseVersion({ id: "version-2", key: "v2", isDefault: false });
        const v3 = makeReleaseVersion({ id: "version-3", key: "v3", isDefault: false });

        const repository = new InMemoryReleaseVersionsRepository([v1, v2, v3]);
        const sut = new SetDefaultVersionUseCase(repository);

        const result = await sut.execute({
            versionId: "version-2",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.version.id.toString()).toBe("version-2");
            expect(result.value.version.isDefault).toBe(true);
        }

        const spaceVersions = await repository.listBySpaceId("space-1");
        const defaultVersions = spaceVersions.filter((version) => version.isDefault);

        expect(defaultVersions).toHaveLength(1);
        expect(defaultVersions[0].id.toString()).toBe("version-2");
    });

    it("returns not found when version does not exist", async () => {
        const repository = new InMemoryReleaseVersionsRepository([]);
        const sut = new SetDefaultVersionUseCase(repository);

        const result = await sut.execute({
            versionId: "missing-version",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(ReleaseVersionNotFoundError);
        }
    });
});

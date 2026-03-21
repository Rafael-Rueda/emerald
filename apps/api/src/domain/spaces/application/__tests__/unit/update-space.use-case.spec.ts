import { SpaceEntity } from "../../../enterprise/entities/space.entity";
import { SpaceAlreadyExistsError } from "../../../errors/space-already-exists.error";
import { SpaceNotFoundError } from "../../../errors/space-not-found.error";
import { SpacesRepository } from "../../repositories/spaces.repository";
import { UpdateSpaceUseCase } from "../../use-cases/update-space.use-case";

const makeSpace = (
    overrides: Partial<{ id: string; key: string; name: string; description: string }> = {},
): SpaceEntity => {
    return SpaceEntity.create(
        {
            key: overrides.key ?? "guides",
            name: overrides.name ?? "Guides",
            description: overrides.description ?? "Product and developer guides",
        },
        overrides.id,
    );
};

const makeSpacesRepository = (): jest.Mocked<SpacesRepository> => ({
    findById: jest.fn(),
    findByKey: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
});

describe("UpdateSpaceUseCase", () => {
    let sut: UpdateSpaceUseCase;
    let spacesRepository: jest.Mocked<SpacesRepository>;

    beforeEach(() => {
        spacesRepository = makeSpacesRepository();
        sut = new UpdateSpaceUseCase(spacesRepository);
    });

    it("should update an existing space", async () => {
        const existing = makeSpace({ id: "space-1", key: "guides", name: "Guides" });
        spacesRepository.findById.mockResolvedValue(existing);
        spacesRepository.update.mockImplementation(async (space) => space);

        const result = await sut.execute({
            spaceId: "space-1",
            key: "platform",
            name: "Platform",
            description: "Platform docs",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.space.key).toBe("platform");
            expect(result.value.space.name).toBe("Platform");
            expect(result.value.space.description).toBe("Platform docs");
        }
    });

    it("should return SpaceNotFoundError when space does not exist", async () => {
        spacesRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            spaceId: "unknown-space",
            name: "Anything",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(SpaceNotFoundError);
        }
    });

    it("should return SpaceAlreadyExistsError when updating to an existing key", async () => {
        const existing = makeSpace({ id: "space-1", key: "guides" });
        const duplicated = makeSpace({ id: "space-2", key: "platform" });

        spacesRepository.findById.mockResolvedValue(existing);
        spacesRepository.findByKey.mockResolvedValue(duplicated);

        const result = await sut.execute({
            spaceId: "space-1",
            key: "platform",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(SpaceAlreadyExistsError);
        }

        expect(spacesRepository.update).not.toHaveBeenCalled();
    });
});

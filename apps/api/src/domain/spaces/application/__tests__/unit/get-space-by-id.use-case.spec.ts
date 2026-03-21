import { SpaceEntity } from "../../../enterprise/entities/space.entity";
import { SpaceNotFoundError } from "../../../errors/space-not-found.error";
import { SpacesRepository } from "../../repositories/spaces.repository";
import { GetSpaceByIdUseCase } from "../../use-cases/get-space-by-id.use-case";

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

describe("GetSpaceByIdUseCase", () => {
    let sut: GetSpaceByIdUseCase;
    let spacesRepository: jest.Mocked<SpacesRepository>;

    beforeEach(() => {
        spacesRepository = makeSpacesRepository();
        sut = new GetSpaceByIdUseCase(spacesRepository);
    });

    it("should return a space when found by id", async () => {
        spacesRepository.findById.mockResolvedValue(makeSpace({ id: "space-1" }));

        const result = await sut.execute({
            spaceId: "space-1",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.space.id.toString()).toBe("space-1");
            expect(result.value.space.key).toBe("guides");
        }

        expect(spacesRepository.findById).toHaveBeenCalledWith("space-1");
    });

    it("should return SpaceNotFoundError when space does not exist", async () => {
        spacesRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            spaceId: "unknown-space",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(SpaceNotFoundError);
        }
    });
});

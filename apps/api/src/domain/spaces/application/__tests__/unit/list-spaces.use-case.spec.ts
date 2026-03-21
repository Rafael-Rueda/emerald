import { SpaceEntity } from "../../../enterprise/entities/space.entity";
import { SpacesRepository } from "../../repositories/spaces.repository";
import { ListSpacesUseCase } from "../../use-cases/list-spaces.use-case";

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

describe("ListSpacesUseCase", () => {
    let sut: ListSpacesUseCase;
    let spacesRepository: jest.Mocked<SpacesRepository>;

    beforeEach(() => {
        spacesRepository = makeSpacesRepository();
        sut = new ListSpacesUseCase(spacesRepository);
    });

    it("should return all spaces", async () => {
        spacesRepository.list.mockResolvedValue([
            makeSpace({ id: "space-1", key: "guides", name: "Guides" }),
            makeSpace({ id: "space-2", key: "api", name: "API" }),
        ]);

        const result = await sut.execute();

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.spaces).toHaveLength(2);
            expect(result.value.spaces[0]?.key).toBe("guides");
            expect(result.value.spaces[1]?.key).toBe("api");
        }

        expect(spacesRepository.list).toHaveBeenCalledTimes(1);
    });

    it("should return empty spaces list when repository is empty", async () => {
        spacesRepository.list.mockResolvedValue([]);

        const result = await sut.execute();

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.spaces).toEqual([]);
        }
    });
});

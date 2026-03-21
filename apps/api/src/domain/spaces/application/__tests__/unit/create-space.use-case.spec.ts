import { SpaceEntity } from "../../../enterprise/entities/space.entity";
import { SpaceAlreadyExistsError } from "../../../errors/space-already-exists.error";
import { SpacesRepository } from "../../repositories/spaces.repository";
import { CreateSpaceUseCase } from "../../use-cases/create-space.use-case";

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

describe("CreateSpaceUseCase", () => {
    let sut: CreateSpaceUseCase;
    let spacesRepository: jest.Mocked<SpacesRepository>;

    beforeEach(() => {
        spacesRepository = makeSpacesRepository();
        sut = new CreateSpaceUseCase(spacesRepository);
    });

    it("should create a space when key does not exist", async () => {
        spacesRepository.findByKey.mockResolvedValue(null);
        spacesRepository.create.mockImplementation(async (space) => space);

        const result = await sut.execute({
            key: "guides",
            name: "Guides",
            description: "Product and developer guides",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.space.key).toBe("guides");
            expect(result.value.space.name).toBe("Guides");
            expect(result.value.space.description).toBe("Product and developer guides");
        }

        expect(spacesRepository.findByKey).toHaveBeenCalledWith("guides");
        expect(spacesRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should default description to empty string", async () => {
        spacesRepository.findByKey.mockResolvedValue(null);
        spacesRepository.create.mockImplementation(async (space) => space);

        const result = await sut.execute({
            key: "engineering",
            name: "Engineering",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.space.description).toBe("");
        }
    });

    it("should return SpaceAlreadyExistsError when key already exists", async () => {
        spacesRepository.findByKey.mockResolvedValue(makeSpace({ key: "guides" }));

        const result = await sut.execute({
            key: "guides",
            name: "Guides",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(SpaceAlreadyExistsError);
        }

        expect(spacesRepository.create).not.toHaveBeenCalled();
    });
});

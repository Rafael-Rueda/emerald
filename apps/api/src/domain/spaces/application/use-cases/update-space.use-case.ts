import { SpacesRepository } from "../repositories/spaces.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";
import { SpaceAlreadyExistsError } from "@/domain/spaces/errors/space-already-exists.error";
import { SpaceNotFoundError } from "@/domain/spaces/errors/space-not-found.error";

interface UpdateSpaceRequest {
    spaceId: string;
    key?: string;
    name?: string;
    description?: string;
}

type UpdateSpaceError = SpaceNotFoundError | SpaceAlreadyExistsError;

type UpdateSpaceResponse = Either<UpdateSpaceError, { space: SpaceEntity }>;

export class UpdateSpaceUseCase {
    constructor(private spacesRepository: SpacesRepository) {}

    async execute(request: UpdateSpaceRequest): Promise<UpdateSpaceResponse> {
        const space = await this.spacesRepository.findById(request.spaceId);

        if (!space) {
            return Left.call(new SpaceNotFoundError());
        }

        if (request.key && request.key !== space.key) {
            const existingWithKey = await this.spacesRepository.findByKey(request.key);

            if (existingWithKey && existingWithKey.id.toString() !== space.id.toString()) {
                return Left.call(new SpaceAlreadyExistsError());
            }

            space.key = request.key;
        }

        if (request.name !== undefined) {
            space.name = request.name;
        }

        if (request.description !== undefined) {
            space.description = request.description;
        }

        const updatedSpace = await this.spacesRepository.update(space);

        if (!updatedSpace) {
            return Left.call(new SpaceNotFoundError());
        }

        return Right.call({ space: updatedSpace });
    }
}

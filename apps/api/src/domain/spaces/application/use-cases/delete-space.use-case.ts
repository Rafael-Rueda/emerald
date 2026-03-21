import { Either, Left, Right } from "@/domain/@shared/either";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";
import { SpaceNotFoundError } from "@/domain/spaces/errors/space-not-found.error";

import { SpacesRepository } from "../repositories/spaces.repository";

interface DeleteSpaceRequest {
    spaceId: string;
}

type DeleteSpaceError = SpaceNotFoundError;

type DeleteSpaceResponse = Either<DeleteSpaceError, { space: SpaceEntity }>;

export class DeleteSpaceUseCase {
    constructor(private spacesRepository: SpacesRepository) {}

    async execute(request: DeleteSpaceRequest): Promise<DeleteSpaceResponse> {
        const existingSpace = await this.spacesRepository.findById(request.spaceId);

        if (!existingSpace) {
            return Left.call(new SpaceNotFoundError());
        }

        const deletedSpace = await this.spacesRepository.delete(request.spaceId);

        if (!deletedSpace) {
            return Left.call(new SpaceNotFoundError());
        }

        return Right.call({ space: deletedSpace });
    }
}
